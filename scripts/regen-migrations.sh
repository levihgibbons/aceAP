#!/usr/bin/env bash
# Pre-release only: rebuild the migration set from the schema while keeping
# the hand-written row-level-security migration. Once a database has been
# deployed, add new migrations with `npx drizzle-kit generate` instead.
set -euo pipefail
cp drizzle/0001_row_level_security.sql /tmp/aceap_rls.sql 2>/dev/null || cp drizzle/0001_row_level_security.sql "$TEMP/aceap_rls.sql"
RLS="${TEMP:-/tmp}/aceap_rls.sql"; [ -f "$RLS" ] || RLS=/tmp/aceap_rls.sql
rm -rf drizzle
npx drizzle-kit generate --name initial_schema >/dev/null
npx drizzle-kit generate --custom --name row_level_security >/dev/null
cp "$RLS" drizzle/0001_row_level_security.sql
ls drizzle
