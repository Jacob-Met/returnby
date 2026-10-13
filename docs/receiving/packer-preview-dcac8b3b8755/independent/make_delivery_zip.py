#!/usr/bin/env python3
"""Create a bounded selected-payload delivery ZIP without disk staging."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

MAX_MANIFEST = 1024 * 1024
MAX_FILES = 1024
MAX_PAYLOAD = 64 * 1024 * 1024
PIN = re.compile(r'[0-9a-f]{64}\Z')
RESERVED = re.compile(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|\Z)', re.I)


class Refused(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Refused(message)


def digest(body):
    return hashlib.sha256(body).hexdigest()


def regular_bytes(path, limit):
    """Bounded capture; final symlinks refused and opened descriptor checked."""
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode), 'selected input is not a regular file')
    require(before.st_size <= limit, 'selected input exceeds limit')
    flags = os.O_RDONLY | getattr(os, 'O_BINARY', 0) | getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(path, flags)
    with os.fdopen(fd, 'rb') as stream:
        opened = os.fstat(stream.fileno())
        require(stat.S_ISREG(opened.st_mode), 'opened input is not regular')
        require((opened.st_dev, opened.st_ino) == (before.st_dev, before.st_ino), 'input identity changed')
        body = stream.read(limit + 1)
        after = os.fstat(stream.fileno())
    require(len(body) <= limit, 'captured input exceeds limit')
    require((opened.st_size, opened.st_mtime_ns) == (after.st_size, after.st_mtime_ns), 'input changed during capture')
    return body


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate JSON key')
        result[key] = value
    return result


def member_name(value):
    require(isinstance(value, str) and 0 < len(value) <= 240, 'invalid member name')
    require(all(32 <= ord(c) < 127 for c in value), 'member name must be printable ASCII')
    require(not any(c in value for c in '<>:"\\|?*'), 'nonportable member character')
    parts = value.split('/')
    for part in parts:
        require(part not in ('', '.', '..') and part.strip() == part and not part.endswith('.'), 'nonportable member component')
        require(not RESERVED.match(part.split('.')[0].rstrip(' ')), 'reserved Windows member name')
    require(parts[0].casefold() != 'manifest.json', 'MANIFEST.json is reserved')
    return value


def admitted_manifest(body):
    try:
        data = json.loads(body.decode('utf-8'), object_pairs_hook=unique_object)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise Refused('manifest must be UTF-8 JSON') from exc
    require(type(data) is dict and set(data) == {'schema', 'files'}, 'manifest keys must be schema and files')
    require(data['schema'] == 'hamon.delivery-zip/1', 'unsupported manifest schema')
    rows = data['files']
    require(type(rows) is list and 1 <= len(rows) <= MAX_FILES, 'invalid file count')
    seen, total = set(), 0
    for row in rows:
        require(type(row) is dict and set(row) == {'path', 'bytes', 'sha256'}, 'invalid file record')
        name = member_name(row['path'])
        require(type(row['bytes']) is int and 0 <= row['bytes'] <= MAX_PAYLOAD, 'invalid byte count')
        require(isinstance(row['sha256'], str) and PIN.fullmatch(row['sha256']), 'invalid payload SHA256')
        key = name.casefold()
        require(key not in seen, 'duplicate or case-colliding member')
        seen.add(key)
        total += row['bytes']
        require(total <= MAX_PAYLOAD, 'total payload exceeds limit')
    for key in seen:
        parts = key.split('/')
        require(not any('/'.join(parts[:i]) in seen for i in range(1, len(parts))), 'file/ancestor member collision')
    return sorted(rows, key=lambda row: row['path'])


def capture(source, rows):
    require(source.is_dir() and not source.is_symlink(), 'source must be a real directory')
    root = source.resolve(strict=True)
    payloads = {}
    for row in rows:
        path = root
        parts = row['path'].split('/')
        for part in parts[:-1]:
            path = path / part
            require(stat.S_ISDIR(path.lstat().st_mode), 'source component is not a real directory')
        path = path / parts[-1]
        body = regular_bytes(path, row['bytes'])
        require(len(body) == row['bytes'] and digest(body) == row['sha256'], 'selected payload differs: ' + row['path'])
        payloads[row['path']] = body
    return payloads


def archive_bytes(manifest, payloads):
    contents = dict(payloads)
    contents['MANIFEST.json'] = manifest
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, body in sorted(contents.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, body, compresslevel=9)
    result = buf.getvalue()
    with zipfile.ZipFile(io.BytesIO(result)) as archive:
        require(archive.namelist() == sorted(contents), 'archive inventory differs')
        require(archive.testzip() is None, 'archive CRC failure')
        for name, body in contents.items():
            require(archive.read(name) == body, 'archive payload differs')
    return result


def publish_exclusive(output, body):
    """Keep an owned partial on write/readback failure; never remove source."""
    created = False
    try:
        with output.open('xb') as stream:
            created = True
            written = stream.write(body)
            require(written == len(body), 'short output write')
            stream.flush()
            os.fsync(stream.fileno())
        require(regular_bytes(output, len(body)) == body, 'output readback differs')
    except Exception as exc:
        if created:
            raise Refused('output was created but not qualified; retained at ' + ascii(str(output))) from exc
        raise


def make_delivery_zip(source, manifest, output, manifest_sha256):
    require(isinstance(manifest_sha256, str) and PIN.fullmatch(manifest_sha256), 'invalid manifest SHA256')
    raw = regular_bytes(Path(manifest), MAX_MANIFEST)
    require(digest(raw) == manifest_sha256, 'manifest SHA256 differs')
    rows = admitted_manifest(raw)
    payloads = capture(Path(source), rows)
    body = archive_bytes(raw, payloads)
    publish_exclusive(Path(output), body)
    return {'schema': 'hamon.delivery-zip-receipt/1', 'manifest_sha256': manifest_sha256,
            'payloads': len(payloads), 'members': len(payloads) + 1,
            'payload_bytes': sum(map(len, payloads.values())), 'zip_bytes': len(body),
            'zip_sha256': digest(body), 'output': str(Path(output).absolute()),
            'scope': 'selected regular-file artifact bytes; no source execution or mode preservation'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    try:
        result = make_delivery_zip(args.source, args.manifest, args.output, args.manifest_sha256)
    except (OSError, Refused, ValueError, zipfile.BadZipFile) as exc:
        print('REFUSED: ' + str(exc).encode('ascii', 'backslashreplace').decode('ascii'), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=True, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
