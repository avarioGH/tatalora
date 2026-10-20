/**
 * ====================================================================
 * TATALORA ERP — ISOLATED STAGING READ-ONLY CONNECTION TEST RUNNER
 * ====================================================================
 * SAFETY GUARDS:
 * 1. Reads ONLY `backend/.env.staging` (Does NOT load production `backend/.env`).
 * 2. Strictly validates that target host is 'aws-0-ap-northeast-1.pooler.supabase.com'
 *    and project reference is 'xywfoixgmqhecsufhlvz'.
 * 3. Rejects placeholder passwords or unconfigured strings.
 * 4. Executes ONLY the read-only Prisma schema-engine `can-connect-to-database` command.
 *    (Zero SQL queries, zero DDL, zero DML, zero schema migrations).
 * 5. Redacts credentials from all logs and terminal output.
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return 'NOT_CONFIGURED';
  return rawUrl.replace(/:([^:@]+)@/, ':***@');
}

function runReadOnlyStagingConnectionTest() {
  console.log('====================================================================');
  console.log('TATALORA ERP — READ-ONLY STAGING CONNECTION TEST');
  console.log('Target: tatalora-staging (xywfoixgmqhecsufhlvz)');
  console.log('====================================================================\n');

  // 1. Locate and read .env.staging
  const envStagingPath = path.join(__dirname, '..', '..', '.env.staging');
  if (!fs.existsSync(envStagingPath)) {
    console.error('❌ ERROR: backend/.env.staging does not exist.');
    process.exit(1);
  }

  const lines = fs.readFileSync(envStagingPath, 'utf8').split('\n');
  const envVars = {};
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
      envVars[key] = val;
    }
  }

  const datasourceUrl = envVars.DIRECT_URL || envVars.DATABASE_URL;

  // 2. Safety Validation: Verify Host, Project Ref, and No Placeholders
  console.log('>>> VERIFYING CONNECTION TARGET AND SAFETY CONSTRAINTS...');
  if (!datasourceUrl || datasourceUrl.includes('<STAGING_PASSWORD>')) {
    console.error('❌ ERROR: Staging password has not been entered in backend/.env.staging.');
    console.error('Please edit backend/.env.staging and replace <STAGING_PASSWORD> with the actual staging password.');
    process.exit(1);
  }

  const expectedHost = 'aws-0-ap-northeast-1.pooler.supabase.com';
  const expectedProject = 'xywfoixgmqhecsufhlvz';

  if (!datasourceUrl.includes(expectedHost)) {
    console.error(`❌ SECURITY VIOLATION: Datasource host does not match expected staging host: ${expectedHost}`);
    process.exit(1);
  }

  if (!datasourceUrl.includes(expectedProject)) {
    console.error(`❌ SECURITY VIOLATION: Datasource user does not match expected staging project: ${expectedProject}`);
    process.exit(1);
  }

  console.log(`   - Verified Target Host: ${expectedHost}`);
  console.log(`   - Verified Project Ref: ${expectedProject}`);
  console.log(`   - Target Connection: ${sanitizeUrl(datasourceUrl)}`);
  console.log('   - Safety Checks Passed: 100% Isolated Staging Target.');

  // 3. Locate verified schema-engine binary
  const engineBinary = path.join(
    __dirname,
    '..',
    '..',
    'node_modules',
    '@prisma',
    'engines',
    'schema-engine-windows.exe'
  );

  if (!fs.existsSync(engineBinary)) {
    console.error(`❌ ERROR: Prisma schema engine binary not found at ${engineBinary}`);
    process.exit(1);
  }

  // 4. Execute strictly read-only 'can-connect-to-database' subcommand
  console.log('\n>>> EXECUTING PRISMA ENGINE READ-ONLY CONNECTION PROBE...');
  console.log('Command: schema-engine-windows.exe cli --datasource <REDACTED> can-connect-to-database');
  console.log('(Note: This probe only performs TLS/SCRAM authentication; zero database tables are queried or altered).\n');

  try {
    const output = execFileSync(
      engineBinary,
      ['cli', '--datasource', datasourceUrl, 'can-connect-to-database'],
      { encoding: 'utf8', timeout: 15000 }
    );

    console.log('====================================================================');
    console.log('✅ SUCCESS: Successfully authenticated and connected to PostgreSQL staging!');
    console.log(`Target: tatalora-staging (${expectedProject})`);
    console.log('Status: Connection is verified and ready for migration rehearsal.');
    console.log('====================================================================');
  } catch (err) {
    console.error('====================================================================');
    console.error('❌ CONNECTION PROBE FAILED:');
    let errOutput = err.stderr || err.stdout || err.message;
    // Redact password if present in raw error output
    errOutput = sanitizeUrl(errOutput);
    console.error(errOutput);
    console.error('====================================================================');
    process.exit(1);
  }
}

runReadOnlyStagingConnectionTest();
