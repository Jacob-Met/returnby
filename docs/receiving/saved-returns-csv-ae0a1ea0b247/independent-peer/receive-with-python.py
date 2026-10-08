"""Independent CSV consumer and civil-date oracle; invokes actual frozen TS source."""
import csv
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else '/dev/shm/ae0a1ea0b247-returnby-csv')
HEADERS = ['Saved return ID', 'Store', 'Order number', 'Total (as entered)',
           'Order date', 'Return window (days)', 'Recorded window source',
           'Return deadline', 'Created at']
CREATED = '2026-10-08T07:08:09.123+05:30'

def row(id, date, days, merchant, number=None, total=None, source='default'):
    record = dict(id=id, merchant=merchant, orderDate=date, windowDays=days,
                  windowSource=source, createdAt=CREATED,
                  rawEmail='FICTIONAL-RAW-EMAIL-MUST-STAY-OUT', unrelated='FICTIONAL-EXTRA')
    if number is not None:
        record['orderNo'] = number
    if total is not None:
        record['total'] = total
    return record

# Authored cases and explicit expected protected columns. This receiver does not
# import the candidate's CSV decoder, escaping predicate, or calendar functions.
RECORDS = [
    row('A-first-year', '1000-01-01', 1, 'Bøøk, "North"\r\nSecond line'),
    row('B-century-leap', '2000-02-28', 1, 'Cafe\u0301 / 𝄞 / 😀', '0000123', '001.00', 'policy'),
    row('C-leap', '2024-02-28', 2, '\tTabbed', '\rReturn', '\nNew', 'user'),
    row('D-spring', '2024-03-09', 2, '=SUM(1,2)', ' \t@id', ' -001.50'),
    row('E-autumn', '2024-11-02', 2, '+1', '00123', '-12.50', 'policy'),
    row('F-century-common', '2100-02-28', 1, '\u200b@store', '\ufeff +1', '0.00'),
    row('G-last-year', '9999-12-30', 1, 'Ending', '00000', '001.0', 'user'),
    row('z-tie', '2026-10-08', 30, "'=1+1", 'a,b"c', '12.50'),
    row('Z-tie', '2026-10-08', 30, ' \ufeff=SUM(1,2)', '', '', 'policy'),
    row('a-tie', '2026-10-08', 30, 'Line one\n=not-first', 'line\u2028separator', '14.2', 'user'),
    row('H-end-month', '2026-01-31', 30, 'literal tab\there', 'quoted "ID"', '$0.00'),
    row('I-year-change', '2023-12-31', 1, 'Local saved fields', '001e3', '1,234.50'),
]
PROTECTED = {
    'C-leap': {1, 2, 3},
    'D-spring': {1, 2, 3},
    'E-autumn': {1, 3},
    'F-century-common': {1, 2},
    'Z-tie': {1},
}

def expected_due(record):
    return (dt.date.fromisoformat(record['orderDate']) + dt.timedelta(days=record['windowDays'])).isoformat()

def expected_cells(record):
    cells = [record['id'], record['merchant'], record.get('orderNo', ''), record.get('total', ''),
             record['orderDate'], str(record['windowDays']), record['windowSource'],
             expected_due(record), record['createdAt']]
    for column in PROTECTED.get(record['id'], set()):
        cells[column] = "'" + cells[column]
    return cells

def consume(zone, slug):
    output = ROOT / slug
    env = dict(os.environ, TZ=zone)
    run = subprocess.run(['node', str(ROOT / 'produce-native.mjs'), str(SOURCE),
                          str(ROOT / 'authored-input.json'), str(output)],
                         text=True, capture_output=True, env=env)
    (ROOT / f'{slug}.log').write_text(run.stdout + run.stderr)
    if run.returncode:
        raise AssertionError(f'Native source invocation failed in {zone}: {run.stderr}')
    data = (output / 'actual-saved-returns.csv').read_bytes()
    assert data[:3] == b'\xef\xbb\xbf', 'UTF-8 BOM is exactly present'
    assert data[-2:] == b'\r\n', 'Final record terminates with CRLF'
    # csv.reader is the independent standard-library parser, with newline
    # translation disabled so CRLF inside a quoted cell remains exact.
    with (output / 'actual-saved-returns.csv').open(encoding='utf-8-sig', newline='') as stream:
        parsed = list(csv.reader(stream, strict=True))
    assert parsed[0] == HEADERS
    assert all(len(record) == 9 for record in parsed), 'Nine cells per actual record'
    ordered = sorted(RECORDS, key=lambda r: (expected_due(r), r['id']))
    expected = [HEADERS] + [expected_cells(record) for record in ordered]
    assert parsed == expected, f'Independent full-cell expectations in {zone}'
    # A second serialization by another implementation must preserve the exact
    # cell matrix when consumed again, including embedded native line endings.
    rendered = io.StringIO(newline='')
    csv.writer(rendered, quoting=csv.QUOTE_ALL, lineterminator='\r\n').writerows(parsed)
    rendered.seek(0)
    assert list(csv.reader(rendered, strict=True)) == parsed
    assert ('\ufeff' + rendered.getvalue()).encode() == data, 'Independent canonical quoted CSV bytes'
    receipt = json.loads((output / 'native-receipt.json').read_text())
    assert receipt['csv']['bytes'] == len(data)
    assert receipt['csv']['filename'] == 'returnby-returns-2026-10-09.csv', 'UTC filename at offset-day boundary'
    assert receipt['csv']['count'] == len(RECORDS)
    assert receipt['csv']['protectedCells'] == sum(map(len, PROTECTED.values()))
    assert {r['id']: r['due'] for r in receipt['nativeDeadlines']} == {r['id']: expected_due(r) for r in RECORDS}
    backup = json.loads((output / 'actual-approved-backup.json').read_text())
    assert backup['exportedAt'] == '2026-10-09T03:30:00.000Z'
    approved = {r['id']: r for r in backup['orders']}
    for record in RECORDS:
        stored = approved[record['id']]
        assert set(stored) == {'id', 'merchant', 'orderNo', 'total', 'orderDate', 'windowDays', 'windowSource', 'createdAt'}
        for key in stored:
            assert stored[key] == record.get(key, '')
        cells = parsed[1 + [r['id'] for r in ordered].index(record['id'])]
        assert cells[6] == stored['windowSource'] and cells[8] == stored['createdAt']
    assert b'FICTIONAL-RAW-EMAIL-MUST-STAY-OUT' not in data
    assert b'FICTIONAL-EXTRA' not in data
    assert receipt['sourceBefore'] == receipt['sourceAfter'] and receipt['inputUnchanged'] and receipt['timestampUnchanged']
    return {'timezone': zone, 'sourceCommit': receipt['sourceCommit'], 'rows': len(RECORDS), 'decodedCells': len(parsed) * 9,
            'protectedCells': receipt['csv']['protectedCells'], 'csvSha256': hashlib.sha256(data).hexdigest(),
            'source': receipt['sourceBefore'], 'groups': [
                'independent-python-csv-complete-cell-and-byte-round-trip',
                'literal-prefixes-with-real-multiline-and-unicode-cells',
                'native-backup-approved-projection-and-read-only-input',
                'independent-gregorian-deadline-boundaries-and-recorded-source-truth',
            ]}

input_path = ROOT / 'authored-input.json'
input_path.write_text(json.dumps(RECORDS, ensure_ascii=True, indent=2) + '\n')
input_hash = hashlib.sha256(input_path.read_bytes()).hexdigest()
runs = [consume(zone, slug) for zone, slug in [
    ('UTC', 'utc'), ('America/New_York', 'new-york'), ('Pacific/Auckland', 'auckland')]]
assert len({run['csvSha256'] for run in runs}) == 1, 'Same approved values and deadlines in three local time zones'
assert hashlib.sha256(input_path.read_bytes()).hexdigest() == input_hash
receipt = {'status': 'pass', 'reviewer': 'estate-ae0a1ea0b247/coordination_review',
           'moduleBlob': runs[0]['source'][0]['blob'],
           'sourceCommit': runs[0]['sourceCommit'],
           'python': sys.version, 'inputSha256': input_hash, 'groups': 4, 'runs': runs,
           'limits': ['No Excel or LibreOffice execution; literal prefixes and exact decoded cell values are established by an independent CSV reader.',
                      'Three explicit IANA time zones and authored civil-date boundaries; no universal historical-timezone claim.',
                      'This is module/consumer receiving, separate from the author browser and nine native groups.']}
(ROOT / 'independent-consumer-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'pass', 'groups': 4, 'timezones': 3, 'nativeExports': 3,
                  'recordsPerExport': len(RECORDS), 'protectedCellsPerExport': sum(map(len, PROTECTED.values())),
                  'csvSha256': runs[0]['csvSha256'], 'receipt': str(ROOT / 'independent-consumer-receipt.json')}))
