"""Exercise actual Linux foreground restarts against an original received build."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(os.environ.get('RETURNBY_SERVER_SOURCE', ROOT / 'tools/received_preview/serve_returnby.py'))
RECEIVED = os.environ.get('RETURNBY_RECEIVED_DIRECTORY')
DRIVER = '''import importlib.util,sys
source,port=sys.argv[1:]
spec=importlib.util.spec_from_file_location("received_server",source)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PORT=int(port)
sys.argv=[source]
raise SystemExit(module.main())
'''


@unittest.skipUnless(sys.platform == 'linux' and RECEIVED, 'Requires Linux and RETURNBY_RECEIVED_DIRECTORY')
class LinuxForegroundRestarts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ReturnBy restart é ')
        self.root = Path(self.temp.name)
        received = Path(RECEIVED)
        manifest = (received / 'ASSETS.json').read_bytes()
        self.assertEqual(hashlib.sha256(manifest).hexdigest(),
                         '5bf81ba20fd4c12732661f0008c09ca71095176d72b373b04f4767c73fb75a83')
        (self.root / 'ASSETS.json').write_bytes(manifest)
        shutil.copytree(received / 'app', self.root / 'app')
        (self.root / 'serve_returnby.py').write_bytes(SOURCE.read_bytes())
        self.index = (self.root / 'app/index.html').read_bytes()
        self.children = []

    def tearDown(self):
        for child in self.children:
            if child.poll() is None:
                child.terminate()
                child.wait(timeout=5)
            for stream in (child.stdin, child.stdout, child.stderr):
                if stream is not None and not stream.closed:
                    stream.close()
        self.temp.cleanup()

    def port(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            return sock.getsockname()[1]

    def start(self, port):
        child = subprocess.Popen([sys.executable, '-B', '-u', '-c', DRIVER,
                                  str(self.root / 'serve_returnby.py'), str(port)],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.children.append(child)
        return child

    def request(self, port):
        with socket.create_connection(('127.0.0.1', port), timeout=2) as client:
            client.sendall(b'GET /index.html HTTP/1.0\r\nHost: localhost\r\nConnection: close\r\n\r\n')
            chunks = []
            while data := client.recv(65536):
                chunks.append(data)
        headers, body = b''.join(chunks).split(b'\r\n\r\n', 1)
        self.assertIn(b' 200 ', headers.split(b'\r\n', 1)[0])
        self.assertEqual(body, self.index)

    def ready(self, child, port):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if child.poll() is not None:
                self.fail('Server exited before HTTP readiness: ' + child.stderr.read().decode())
            try:
                self.request(port)
                return
            except (ConnectionRefusedError, TimeoutError):
                time.sleep(0.01)
        self.fail('Server did not serve its pinned tracker within five seconds')

    def stop(self, child, eof=False):
        if eof:
            child.stdin.close()
        else:
            child.stdin.write(b'\n')
            child.stdin.flush()
        self.assertEqual(child.wait(timeout=5), 0, child.stderr.read().decode())

    def cycle(self, eof):
        port = self.port()
        for _ in range(3):
            child = self.start(port)
            self.ready(child, port)
            self.stop(child, eof)

    def test_immediate_restart_after_http_and_enter(self):
        self.cycle(False)

    def test_immediate_restart_after_http_and_eof(self):
        self.cycle(True)

    def test_second_live_copy_refuses(self):
        port = self.port()
        first = self.start(port)
        self.ready(first, port)
        second = self.start(port)
        _, error = second.communicate(b'\n', timeout=5)
        self.assertEqual(second.returncode, 1)
        self.assertIn(b'could not bind', error)
        self.request(port)
        self.stop(first)

    def test_existing_listener_keeps_its_port(self):
        for reuse_address in (False, True):
            with self.subTest(reuse_address=reuse_address), socket.socket() as owner:
                owner.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, int(reuse_address))
                owner.bind(('127.0.0.1', 0))
                owner.listen()
                port = owner.getsockname()[1]
                child = self.start(port)
                _, error = child.communicate(b'\n', timeout=5)
                self.assertEqual(child.returncode, 1)
                self.assertIn(b'could not bind', error)
                with socket.create_connection(('127.0.0.1', port), timeout=2) as client:
                    connection, _ = owner.accept()
                    with connection:
                        client.sendall(b'original listener')
                        self.assertEqual(connection.recv(64), b'original listener')


if __name__ == '__main__':
    print(json.dumps({'platform': sys.platform, 'python': sys.version.split()[0],
                      'source': str(SOURCE), 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest()}), flush=True)
    unittest.main(verbosity=2)
