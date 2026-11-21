#!/usr/bin/env bash
# Runs the migration test-suite against a THROWAWAY local PostgreSQL (never your Supabase project).
# Usage: PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres bash supabase/tests/run-local.sh
# It creates databases ml_test_textarr and ml_test_jsonb, testing both possible types of
# households.enabled_modules, applies schema.sql + simulated V2 drift + migrations 001/002 (twice),
# then asserts privacy guarantees as real users under RLS.
set -euo pipefail
cd "$(dirname "$0")/.."
for variant in "textarr|text[]|'{}'::text[]" "jsonb|jsonb|'[]'::jsonb"; do
  IFS='|' read -r name type empty <<<"$variant"
  db="ml_test_$name"
  psql -qc "drop database if exists $db" -c "create database $db" >/dev/null
  tmp=$(mktemp -d)
  sed "s/MODTYPE/$type/g; s/MODEMPTY/$empty/g" tests/01_simulated_v2_drift.sql > "$tmp/drift.sql"
  sed "s|MIG1|$PWD/migrations/001_spaces_v2.sql|; s|MIG2|$PWD/migrations/002_documents.sql|" tests/02_migration_tests.sql > "$tmp/tests.sql"
  run() { psql -v ON_ERROR_STOP=1 -q -d "$db" "$@"; }
  run -f tests/00_supabase_shim.sql >/dev/null
  run -f schema.sql >/dev/null 2>&1
  run -f "$tmp/drift.sql" >/dev/null
  echo "== modules as $type"
  run -At -f "$tmp/tests.sql" 2>/dev/null | grep -E "^(ok|t|f|===)" | sort | uniq -c
  rm -rf "$tmp"
done
