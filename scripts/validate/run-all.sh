#!/bin/bash
set -e
echo ""
echo "=== PRE-BUILD VALIDATION ==="
echo ""
echo "--- Task 1: Supabase DDL + RLS ---"
npx tsx scripts/validate/supabase-ddl-verify.ts
echo ""
echo "--- Task 2: Build Environment ---"
npx tsx scripts/validate/env-verify.ts
echo ""
echo "=== COMPLETE — check scripts/validate/output/ for full reports ==="
echo ""
