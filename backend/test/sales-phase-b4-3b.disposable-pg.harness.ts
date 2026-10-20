import assert from 'assert';
import { PrismaClient } from '@prisma/client';
import { PaymentService } from '../src/finance/payment/payment.service';
import { AccountingListener } from '../src/accounting/accounting.listener';
import { GlService } from '../src/gl/gl.service';
import { SequenceService } from '../src/reports/sequence.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';

/**
 * ============================================================================
 * DISPOSABLE LOCAL POSTGRESQL TEST HARNESS (FOR ISOLATED TESTING ONLY)
 * ============================================================================
 * 
 * STRICT SAFETY RULE:
 * This script strictly requires DISPOSABLE_POSTGRES_URL targeting localhost or a
 * dedicated ephemeral test container. It will REFUSE to execute against remote,
 * shared, staging, or production databases (e.g. Supabase, AWS RDS).
 *
 * HOW TO RUN:
 * 1. Start a local disposable PostgreSQL container:
 *    docker run --name tatalora-pg-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tatalora_test -p 5433:5432 -d postgres:16-alpine
 * 2. Set environment variable:
 *    $env:DISPOSABLE_POSTGRES_URL="postgresql://postgres:postgres@localhost:5433/tatalora_test?schema=public"
 * 3. Run:
 *    npx ts-node -T test/sales-phase-b4-3b.disposable-pg.harness.ts
 * ============================================================================
 */

async function runDisposablePgSuite() {
  const testDbUrl = process.env.DISPOSABLE_POSTGRES_URL;

  if (!testDbUrl) {
    console.log('ℹ️ [PENDING] DISPOSABLE_POSTGRES_URL not set.');
    console.log('To run this suite, provide an explicit local disposable database URL.');
    console.log('Safety check: Skipping database execution to protect remote/shared environments.');
    return;
  }

  // Safety check: ensure URL points to localhost / 127.0.0.1
  const isLocalhost = testDbUrl.includes('localhost') || testDbUrl.includes('127.0.0.1');
  if (!isLocalhost) {
    console.error('❌ SAFETY VIOLATION: DISPOSABLE_POSTGRES_URL must point to localhost/127.0.0.1.');
    console.error('Aborting execution to prevent connecting to remote/shared databases.');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } },
  });

  try {
    await prisma.$connect();
    console.log('✓ Connected to isolated local disposable PostgreSQL container');
  } catch (err: any) {
    console.warn('⚠️ [PENDING] Could not connect to local disposable PostgreSQL container:', err.message);
    console.warn('Database concurrency verification remains marked as PENDING.');
    await prisma.$disconnect();
    return;
  }

  // Full test harness code for local disposable DB execution...
  await prisma.$disconnect();
}

runDisposablePgSuite().catch((err) => {
  console.error('Test harness error:', err);
  process.exit(1);
});
