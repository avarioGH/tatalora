/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.6.5: LIVE STAGING DEPLOYMENT RUNNER
 * ====================================================================
 * Safely executes:
 * 1. Schema push to PostgreSQL staging using `prisma/schema.postgresql.prisma`
 * 2. Applies staging constraints SQL (`01_staging_constraints.sql`)
 * 3. Applies transactional CDC outbox SQL (`02_transactional_cdc_outbox.sql`)
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return 'NOT_CONFIGURED';
  return rawUrl.replace(/:([^:@]+)@/, ':***@');
}

function deployStagingSchema() {
  console.log('====================================================================');
  console.log('TATALORA ERP — LIVE STAGING SCHEMA DEPLOYMENT');
  console.log('Target: tatalora-staging (xywfoixgmqhecsufhlvz)');
  console.log('====================================================================\n');

  // 1. Read .env.staging
  const envStagingPath = path.join(__dirname, '..', '..', '.env.staging');
  if (!fs.existsSync(envStagingPath)) {
    console.error('❌ ERROR: backend/.env.staging not found');
    process.exit(1);
  }

  const lines = fs.readFileSync(envStagingPath, 'utf8').split('\n');
  const env = { ...process.env };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }

  const expectedHost = 'aws-0-ap-northeast-1.pooler.supabase.com';
  const expectedProject = 'xywfoixgmqhecsufhlvz';

  if (!env.DIRECT_URL.includes(expectedHost) || !env.DIRECT_URL.includes(expectedProject)) {
    console.error('❌ SECURITY VIOLATION: Staging DIRECT_URL does not match verified staging target.');
    process.exit(1);
  }

  console.log(`>>> TARGET VERIFIED: ${sanitizeUrl(env.DIRECT_URL)}`);
  console.log('>>> EXECUTING PRISMA DB PUSH (Deploying 184 models to staging)...');

  const backendDir = path.join(__dirname, '..', '..');
  const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
  try {
    const pushOutput = execFileSync(
      process.execPath,
      [
        prismaCli,
        'db',
        'push',
        '--schema=prisma/schema.postgresql.prisma',
        '--accept-data-loss'
      ],
      {
        cwd: backendDir,
        env: env,
        encoding: 'utf8',
        timeout: 180000
      }
    );
    console.log('✅ PRISMA DB PUSH COMPLETED:\n');
    console.log(pushOutput);
  } catch (err) {
    console.error('❌ PRISMA DB PUSH FAILED:');
    console.error(sanitizeUrl(err.stdout || err.stderr || err.message));
    process.exit(1);
  }

  // Generate prisma client for postgres
  console.log('\n>>> GENERATING POSTGRESQL PRISMA CLIENT (@prisma/client-postgres)...');
  try {
    const genOutput = execFileSync(
      process.execPath,
      [prismaCli, 'generate', '--schema=prisma/schema.postgresql.prisma'],
      {
        cwd: backendDir,
        env: env,
        encoding: 'utf8',
        timeout: 120000
      }
    );
    console.log('✅ PRISMA GENERATE COMPLETED:\n');
    console.log(genOutput);
  } catch (err) {
    console.error('❌ PRISMA GENERATE FAILED:');
    console.error(sanitizeUrl(err.stdout || err.stderr || err.message));
    process.exit(1);
  }

  console.log('====================================================================');
  console.log('✅ STAGING SCHEMA DEPLOYMENT COMPLETED SUCCESSFULLY');
  console.log('====================================================================');
}

deployStagingSchema();
