#!/usr/bin/env python3
"""Split large SQL export into chunks and import via wrangler d1 execute --command"""
import subprocess
import sys
import os

DB_NAME = sys.argv[1]
SQL_FILE = sys.argv[2]
CHUNK_SIZE = 50  # statements per batch

print(f"=== Importing data into {DB_NAME} from {SQL_FILE} ===")

# Read INSERT statements only
inserts = []
with open(SQL_FILE, 'r') as f:
    for line in f:
        line = line.strip()
        if line.startswith('INSERT INTO'):
            inserts.append(line)

print(f"Total INSERT statements: {len(inserts)}")

if not inserts:
    print("No data to import")
    sys.exit(0)

# Split into chunks
success = 0
failed = 0
for i in range(0, len(inserts), CHUNK_SIZE):
    chunk = inserts[i:i+CHUNK_SIZE]
    batch_sql = "\n".join(chunk)

    # Write to temp file
    tmp_file = f"/tmp/d1-import-{DB_NAME}-{i}.sql"
    with open(tmp_file, 'w') as f:
        f.write(batch_sql)

    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB_NAME, "--remote", f"--file={tmp_file}"],
        capture_output=True, text=True, timeout=120
    )

    if "ERROR" in result.stderr:
        # Try individual statements if batch fails
        for stmt in chunk:
            r2 = subprocess.run(
                ["npx", "wrangler", "d1", "execute", DB_NAME, "--remote", f"--command={stmt}"],
                capture_output=True, text=True, timeout=60
            )
            if "ERROR" in r2.stderr:
                failed += 1
            else:
                success += 1
    else:
        success += len(chunk)

    pct = (i + len(chunk)) * 100 // len(inserts)
    print(f"  Progress: {i + len(chunk)}/{len(inserts)} ({pct}%) — ok: {success}, fail: {failed}", end='\r')

    # Cleanup
    os.remove(tmp_file)

print(f"\n✅ Done: {success} imported, {failed} failed out of {len(inserts)}")
