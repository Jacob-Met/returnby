"""Bounded, loopback-only RFC6455 client for a single owned Chrome instance.

Reference: https://www.rfc-editor.org/rfc/rfc6455.html sections 4 and 5.
No dependencies, extensions, compression, credentials or remote endpoint support.
"""
import base64
import hashlib
import json
import os
import re
import socket
import struct
import time


class CDP:
    MAX_MESSAGE = 24 * 1024 * 1024

    def __init__(self, port, path, event_callback):
        if not isinstance(port, int) or not 1 <= port <= 65535:
            raise ValueError('Invalid owned DevTools port')
        if not re.fullmatch(r'/devtools/browser/[0-9a-fA-F-]+', path):
            raise ValueError('Invalid owned DevTools path')
        self.sock = socket.create_connection(('127.0.0.1', port), timeout=10)
        self.buffer = bytearray()
        self.counter = 0
        self.callback = event_callback
        self.closed = False
        self.last_command = None
        self.in_call = False
        try:
            key = base64.b64encode(os.urandom(16)).decode('ascii')
            request = (f'GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n'
                       'Upgrade: websocket\r\nConnection: Upgrade\r\n'
                       f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n')
            self.sock.sendall(request.encode('ascii'))
            deadline = time.monotonic() + 10
            while b'\r\n\r\n' not in self.buffer:
                self._more(deadline)
                end = self.buffer.find(b'\r\n\r\n')
                if (end == -1 and len(self.buffer) > 32768) or end > 32768:
                    raise ValueError('Oversized WebSocket handshake')
            header, remainder = bytes(self.buffer).split(b'\r\n\r\n', 1)
            self.buffer = bytearray(remainder)
            lines = header.decode('ascii').split('\r\n')
            if not re.match(r'^HTTP/1\.1 101(?: |$)', lines[0]):
                raise ValueError('WebSocket upgrade refused: ' + lines[0])
            headers = {}
            for line in lines[1:]:
                name, value = line.split(':', 1)
                name = name.strip().lower()
                if name in headers:
                    raise ValueError('Duplicate handshake header: ' + name)
                headers[name] = value.strip()
            accept = base64.b64encode(hashlib.sha1(
                (key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode('ascii')).digest()).decode('ascii')
            if headers.get('sec-websocket-accept') != accept:
                raise ValueError('Bad WebSocket accept hash')
            if headers.get('upgrade', '').lower() != 'websocket':
                raise ValueError('Bad WebSocket Upgrade header')
            if 'upgrade' not in [v.strip().lower() for v in headers.get('connection', '').split(',')]:
                raise ValueError('Bad WebSocket Connection header')
            if headers.get('sec-websocket-extensions') or headers.get('sec-websocket-protocol'):
                raise ValueError('Unrequested WebSocket extension or protocol')
        except BaseException:
            self.sock.close()
            raise

    def _more(self, deadline):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError('CDP receive deadline exceeded')
        self.sock.settimeout(remaining)
        chunk = self.sock.recv(65536)
        if not chunk:
            raise EOFError('Chrome closed its WebSocket')
        self.buffer.extend(chunk)

    def _exact(self, count, deadline):
        while len(self.buffer) < count:
            self._more(deadline)
        value = bytes(self.buffer[:count])
        del self.buffer[:count]
        return value

    def _send_frame(self, opcode, payload=b''):
        if len(payload) > self.MAX_MESSAGE:
            raise ValueError('Oversized outgoing WebSocket message')
        if opcode >= 8 and len(payload) > 125:
            raise ValueError('Oversized outgoing WebSocket control frame')
        mask = os.urandom(4)
        length = len(payload)
        header = bytes([0x80 | opcode])
        if length < 126:
            header += bytes([0x80 | length])
        elif length <= 65535:
            header += bytes([0x80 | 126]) + struct.pack('!H', length)
        else:
            header += bytes([0x80 | 127]) + struct.pack('!Q', length)
        masked = bytes(v ^ mask[i % 4] for i, v in enumerate(payload))
        self.sock.settimeout(10)
        self.sock.sendall(header + mask + masked)

    def _message(self, deadline):
        chunks, total, started = [], 0, False
        while True:
            a, b = self._exact(2, deadline)
            final, opcode = bool(a & 0x80), a & 0x0f
            if a & 0x70 or b & 0x80:
                raise ValueError('Unsupported RSV or masked server frame')
            length = b & 0x7f
            if length == 126:
                length = struct.unpack('!H', self._exact(2, deadline))[0]
                if length < 126:
                    raise ValueError('Nonminimal WebSocket length')
            elif length == 127:
                length = struct.unpack('!Q', self._exact(8, deadline))[0]
                if length < 65536 or length >= 2**63:
                    raise ValueError('Invalid WebSocket 64-bit length')
            if opcode >= 8 and (not final or length > 125):
                raise ValueError('Invalid WebSocket control frame')
            if length > self.MAX_MESSAGE or (opcode < 8 and total + length > self.MAX_MESSAGE):
                raise ValueError('Oversized incoming WebSocket message')
            data = self._exact(length, deadline)
            if opcode == 9:
                self._send_frame(10, data)
                continue
            if opcode == 10:
                continue
            if opcode == 8:
                if len(data) == 1:
                    raise ValueError('Invalid WebSocket close payload')
                if len(data) >= 2:
                    code = struct.unpack('!H', data[:2])[0]
                    if code not in (1000, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014) and not 3000 <= code <= 4999:
                        raise ValueError('Invalid WebSocket close status')
                    data[2:].decode('utf-8', errors='strict')
                self._send_frame(8, data)
                self.closed = True
                raise EOFError('Chrome sent WebSocket close')
            if opcode == 1 and not started:
                started = True
            elif opcode != 0 or not started:
                raise ValueError('Unexpected WebSocket opcode/continuation')
            chunks.append(data)
            total += len(data)
            if final:
                return json.loads(b''.join(chunks).decode('utf-8', errors='strict'))

    def call(self, method, params=None, session=None, timeout=15):
        """One outstanding call; callbacks record events only, never call CDP.

        This receiver never enables Fetch interception or paused targets.
        Reject reentry explicitly rather than losing an outer response.
        """
        if self.in_call:
            raise RuntimeError('CDP event callbacks must not call CDP')
        self.in_call = True
        try:
            return self._call(method, params, session, timeout)
        finally:
            self.in_call = False

    def _call(self, method, params=None, session=None, timeout=15):
        self.counter += 1
        request = {'id': self.counter, 'method': method, 'params': params or {}}
        if session is not None:
            request['sessionId'] = session
        self.last_command = method
        self._send_frame(1, json.dumps(request, separators=(',', ':')).encode('utf-8'))
        deadline = time.monotonic() + timeout
        while True:
            response = self._message(deadline)
            if not isinstance(response, dict):
                raise ValueError('Non-object CDP response')
            if 'id' not in response:
                self.callback(response)
                continue
            if response['id'] != request['id']:
                raise ValueError('Unexpected CDP response ID')
            if session is not None and response.get('sessionId') != session:
                raise ValueError('Unexpected CDP session ID')
            if 'error' in response:
                raise RuntimeError(method + ': ' + json.dumps(response['error']))
            return response.get('result', {})

    def close(self):
        try:
            if not self.closed:
                self._send_frame(8, struct.pack('!H', 1000))
        except (OSError, EOFError):
            pass
        finally:
            self.closed = True
            self.sock.close()
