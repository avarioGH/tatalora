/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.7.3B: EXPANDED CDC RELAY UNIT TEST SUITE
 * ====================================================================
 * Comprehensive offline unit tests verifying:
 * 1. Dormant import safety: importing module does NOT connect or poll
 * 2. Fail-closed safety guard against missing or non-staging targetEnv
 * 3. Fail-closed safety guard against empty mongoUri
 * 4. Strict Staging Host Allowlist: Rejects non-allowlisted hostnames
 * 5. Rejects any production signatures (/prod/, /production/, etc.)
 * 6. Sanitizes passwords in URI logging to avoid credential leaks
 * 7. Deterministic SHA-256 fingerprint generation & version divergence
 * 8. Cryptographic Ed25519 RECREATE token verification (Valid canonical token)
 * 9. Forged signature rejection
 * 10. Mismatched record ID / model replay rejection
 * 11. Target environment mismatch rejection
 * 12. Expired authorization token rejection
 * 13. Stale tombstone version rejection
 * 14. Malformed token structure / missing nonce rejection
 * 15. Acknowledge Postgres checks worker lease ownership
 * 16. Event Contract Transitions & Tombstone Simulation (Offline Mock)
 *     - Rejects unauthenticated INSERT / UPDATE on tombstone
 *     - Accepts authorized RECREATE on tombstone with valid nonce
 *     - Rejects second use of same nonce (duplicate key 11000)
 * ====================================================================
 */

const crypto = require('crypto');
const { ProductionCdcRelayWorker } = require('./production_cdc_relay_worker');

async function runUnitTests() {
  console.log('====================================================================');
  console.log('TATALORA ERP — PHASE 8.7.3B: OFFLINE CDC RELAY UNIT TESTS');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Generate an Ed25519 Keypair for test signing
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const validStagingUri = 'mongodb://staging-user:secret_password@staging-cluster.internal:27017/tatalora_staging';

  // Test 1: Dormancy check: creating instance does NOT auto-connect or start polling
  const dormantWorker = new ProductionCdcRelayWorker({
    targetEnv: 'tatalora-staging',
    mongoUri: validStagingUri,
    recreatePublicKey: publicKey
  });
  assert(dormantWorker.isConnected === false, 'Test 1a: Worker is initially disconnected');
  assert(dormantWorker.isPolling === false, 'Test 1b: Worker is initially dormant (not polling)');

  // Test 2: Reject invalid environment label
  try {
    new ProductionCdcRelayWorker({ targetEnv: 'production', mongoUri: validStagingUri });
    assert(false, 'Test 2: Must reject non-staging environment');
  } catch (err) {
    assert(err.message.includes('CRITICAL_SAFETY_ABORT'), 'Test 2: Rejects targetEnv="production" with safety abort');
  }

  // Test 3: Reject missing URI
  try {
    new ProductionCdcRelayWorker({ targetEnv: 'tatalora-staging', mongoUri: '' });
    assert(false, 'Test 3: Must reject missing URI');
  } catch (err) {
    assert(err.message.includes('Missing STAGING_MONGODB_URI'), 'Test 3: Rejects empty URI configuration');
  }

  // Test 4: Host Allowlist: Rejects non-whitelisted host even if not matching prod regex
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: 'mongodb://user:pass@some-unknown-server.net:27017/tatalora_staging'
    });
    assert(false, 'Test 4: Must reject non-allowlisted host');
  } catch (err) {
    assert(err.message.includes('not in approved staging allowlist'), 'Test 4: Rejects host outside approved allowlist');
  }

  // Test 5: Rejects production URI signatures
  const dangerousUris = [
    'mongodb://user:pass@staging-cluster.internal:27017/production',
    'mongodb://user:pass@staging-cluster.internal:27017/tatalora-production',
    'mongodb://user:pass@staging-cluster.internal:27017/atlas-prod',
    'mongodb://user:pass@staging-cluster.internal:27017/tatalora-live'
  ];
  let rejectedCount = 0;
  for (const uri of dangerousUris) {
    try {
      new ProductionCdcRelayWorker({ targetEnv: 'tatalora-staging', mongoUri: uri });
    } catch (e) {
      if (e.message.includes('production signature')) rejectedCount++;
    }
  }
  assert(rejectedCount === dangerousUris.length, 'Test 5: All production URI signatures rejected by target policy');

  // Test 6: Credential redaction in URI sanitization
  const sanitized = ProductionCdcRelayWorker.sanitizeUri('mongodb://admin:super_secret_pw@staging-cluster.internal:27017/db');
  assert(!sanitized.includes('super_secret_pw') && sanitized.includes('[REDACTED_CREDENTIALS]'), 'Test 6: URI passwords are redacted cleanly');

  // Test 7: Deterministic SHA-256 fingerprint generator
  const fp1 = ProductionCdcRelayWorker.generateFingerprint('UPDATE', 'Invoice', 'inv-123', 5, { total: 1000 });
  const fp2 = ProductionCdcRelayWorker.generateFingerprint('UPDATE', 'Invoice', 'inv-123', 5, { total: 1000 });
  const fp3 = ProductionCdcRelayWorker.generateFingerprint('UPDATE', 'Invoice', 'inv-123', 6, { total: 1000 });
  assert(fp1 === fp2, 'Test 7a: Identical inputs produce identical fingerprints');
  assert(fp1 !== fp3, 'Test 7b: Different entity versions produce distinct fingerprints');

  // Helper to create canonical signed tokens
  function createSignedToken(claims, privKey = privateKey) {
    const canonical = JSON.stringify({
      action: claims.action,
      model_name: claims.model_name,
      record_id: claims.record_id,
      target_env: claims.target_env,
      tombstone_version_to_supersede: claims.tombstone_version_to_supersede,
      minimum_new_version: claims.minimum_new_version,
      nonce: claims.nonce,
      issued_at: claims.issued_at,
      expires_at: claims.expires_at
    });
    const sig = crypto.sign(null, Buffer.from(canonical), privKey).toString('hex');
    return Buffer.from(JSON.stringify({ payload: claims, signature: sig })).toString('base64');
  }

  // Test 8: Valid Ed25519 RECREATE token
  const validClaims = {
    action: 'AUTHORIZE_ENTITY_RECREATE',
    model_name: 'Customer',
    record_id: 'cust-uuid-001',
    target_env: 'tatalora-staging',
    tombstone_version_to_supersede: 3,
    minimum_new_version: 4,
    nonce: crypto.randomUUID(),
    issued_at: Date.now(),
    expires_at: Date.now() + 60000
  };
  const validTokenB64 = createSignedToken(validClaims);
  const authResult = dormantWorker.verifyRecreateToken(validTokenB64, 'Customer', 'cust-uuid-001', 3);
  assert(authResult.valid === true, 'Test 8: Valid canonical Ed25519 token verifies successfully');

  // Test 9: Forged signature rejection
  const forgedSig = crypto.randomBytes(64).toString('hex');
  const forgedTokenB64 = Buffer.from(JSON.stringify({ payload: validClaims, signature: forgedSig })).toString('base64');
  const forgedResult = dormantWorker.verifyRecreateToken(forgedTokenB64, 'Customer', 'cust-uuid-001', 3);
  assert(forgedResult.valid === false && forgedResult.reason === 'INVALID_SIGNATURE', 'Test 9: Forged signature is strictly rejected');

  // Test 10: Mismatched record ID rejection
  const mismatchedResult = dormantWorker.verifyRecreateToken(validTokenB64, 'Customer', 'DIFFERENT-RECORD-ID', 3);
  assert(mismatchedResult.valid === false && mismatchedResult.reason === 'RECORD_ID_MISMATCH', 'Test 10: Replay against different record ID rejected');

  // Test 11: Mismatched model rejection
  const mismatchedModelResult = dormantWorker.verifyRecreateToken(validTokenB64, 'Invoice', 'cust-uuid-001', 3);
  assert(mismatchedModelResult.valid === false && mismatchedModelResult.reason === 'MODEL_MISMATCH', 'Test 11: Replay against different model rejected');

  // Test 12: Target environment mismatch rejection
  const wrongEnvClaims = { ...validClaims, target_env: 'production', nonce: crypto.randomUUID() };
  const wrongEnvTokenB64 = createSignedToken(wrongEnvClaims);
  const wrongEnvResult = dormantWorker.verifyRecreateToken(wrongEnvTokenB64, 'Customer', 'cust-uuid-001', 3);
  assert(wrongEnvResult.valid === false && wrongEnvResult.reason === 'ENV_MISMATCH', 'Test 12: Environment mismatch rejected');

  // Test 13: Expired token rejection
  const expiredClaims = { ...validClaims, expires_at: Date.now() - 5000, nonce: crypto.randomUUID() };
  const expiredTokenB64 = createSignedToken(expiredClaims);
  const expiredResult = dormantWorker.verifyRecreateToken(expiredTokenB64, 'Customer', 'cust-uuid-001', 3);
  assert(expiredResult.valid === false && expiredResult.reason === 'TOKEN_EXPIRED', 'Test 13: Expired token is rejected');

  // Test 14: Stale tombstone version rejection
  const staleResult = dormantWorker.verifyRecreateToken(validTokenB64, 'Customer', 'cust-uuid-001', 5);
  assert(staleResult.valid === false && staleResult.reason === 'STALE_TOMBSTONE_VERSION', 'Test 14: Token attempting to supersede newer tombstone is rejected');

  // Test 15: Missing nonce / malformed structure rejection
  const noNonceClaims = { ...validClaims, nonce: undefined };
  const noNonceTokenB64 = Buffer.from(JSON.stringify({ payload: noNonceClaims, signature: 'some_sig' })).toString('base64');
  const noNonceResult = dormantWorker.verifyRecreateToken(noNonceTokenB64, 'Customer', 'cust-uuid-001', 3);
  assert(noNonceResult.valid === false && noNonceResult.reason === 'MALFORMED_TOKEN_STRUCTURE', 'Test 15: Missing nonce is rejected as malformed');

  // Test 16: PostgreSQL Acknowledge Lease Ownership Verification
  let capturedAckQuery = '';
  let capturedAckParams = [];
  const mockPrisma = {
    $executeRawUnsafe: async (sql, ...params) => {
      capturedAckQuery = sql;
      capturedAckParams = params;
      return 1;
    }
  };
  const leaseWorker = new ProductionCdcRelayWorker({
    targetEnv: 'tatalora-staging',
    mongoUri: validStagingUri,
    workerId: 'worker-node-alpha',
    prisma: mockPrisma
  });
  await leaseWorker.acknowledgePostgres('evt-uuid-999');
  assert(
    capturedAckQuery.includes('worker_id = $2') && 
    capturedAckParams[0] === 'evt-uuid-999' && 
    capturedAckParams[1] === 'worker-node-alpha',
    'Test 16: Acknowledge verifies worker lease ownership ($2 = worker_id)'
  );

  // Test 17: Mock Session State Machine for Recreate & Tombstone Handling
  const mockDocs = new Map();
  const mockLedger = new Map();
  const mockNonces = new Set();

  // Create an in-memory test harness simulating replayEventToMongo behavior
  class MockWorkerHarness extends ProductionCdcRelayWorker {
    constructor(cfg) {
      super(cfg);
      this.isConnected = true;
      this.mongoClient = {
        startSession: () => ({
          withTransaction: async (fn) => fn(),
          endSession: async () => {}
        })
      };
      this.mongoDb = {
        collection: (name) => ({
          findOne: async (query) => {
            if (name === '_cdc_applied_events') return mockLedger.get(query.event_id);
            if (name === '_cdc_recreate_nonces') return mockNonces.has(query.nonce) ? { nonce: query.nonce } : null;
            return mockDocs.get(query._id);
          },
          insertOne: async (doc) => {
            if (name === '_cdc_applied_events') {
              if (mockLedger.has(doc.event_id)) {
                const err = new Error('E11000 duplicate key');
                err.code = 11000;
                err.keyPattern = { event_id: 1 };
                throw err;
              }
              mockLedger.set(doc.event_id, doc);
            }
            if (name === '_cdc_recreate_nonces') {
              if (mockNonces.has(doc.nonce)) {
                const err = new Error('E11000 duplicate key');
                err.code = 11000;
                err.keyPattern = { nonce: 1 };
                throw err;
              }
              mockNonces.add(doc.nonce);
            }
          },
          updateOne: async (query, update) => {
            let doc = mockDocs.get(query._id) || { _id: query._id };
            if (update.$set) doc = { ...doc, ...update.$set };
            mockDocs.set(query._id, doc);
          }
        })
      };
    }
  }

  const harness = new MockWorkerHarness({
    targetEnv: 'tatalora-staging',
    mongoUri: validStagingUri,
    recreatePublicKey: publicKey
  });

  // 17a. Create and then tombstone an entity
  await harness.replayEventToMongo({
    event_id: 'evt-delete-01',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 1,
    operation: 'HARD_DELETE',
    replay_fingerprint: 'fp-del-01'
  });
  const deletedDoc = mockDocs.get('cust-resurrect-01');
  assert(deletedDoc && deletedDoc._is_deleted === true, 'Test 17a: HARD_DELETE marks document as tombstone');

  // 17b. Normal INSERT or UPDATE against tombstone is rejected without authorization
  const rejectedUpdate = await harness.replayEventToMongo({
    event_id: 'evt-update-stale',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 2,
    operation: 'UPDATE',
    current_state: { name: 'Unauthorized Corp' },
    replay_fingerprint: 'fp-upd-stale'
  });
  assert(rejectedUpdate.status === 'REJECTED_STALE_AGAINST_TOMBSTONE', 'Test 17b: Mutation against tombstone is rejected');

  // 17c. Authorized RECREATE succeeds with valid token
  const recreateClaims = {
    action: 'AUTHORIZE_ENTITY_RECREATE',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    target_env: 'tatalora-staging',
    tombstone_version_to_supersede: 1,
    minimum_new_version: 2,
    nonce: 'nonce-alpha-123',
    issued_at: Date.now(),
    expires_at: Date.now() + 60000
  };
  const recreateToken = createSignedToken(recreateClaims);
  const recreateResult = await harness.replayEventToMongo({
    event_id: 'evt-recreate-01',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 2,
    operation: 'RECREATE',
    recreate_token: recreateToken,
    current_state: { name: 'Resurrected Customer' },
    replay_fingerprint: 'fp-recreate-01'
  });
  assert(recreateResult.status === 'AUTHORIZED_RECREATE_APPLIED', 'Test 17c: Authorized RECREATE successfully resurrects entity');
  assert(mockDocs.get('cust-resurrect-01')._is_deleted === false, 'Test 17d: Entity is active again (_is_deleted === false)');

  // 17e. Reusing the exact same nonce fails (Single-Use Nonce Guarantee)
  // First, simulate another HARD_DELETE to put document back into tombstone state with version 3
  await harness.replayEventToMongo({
    event_id: 'evt-delete-02',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 3,
    operation: 'HARD_DELETE',
    replay_fingerprint: 'fp-del-02'
  });

  // Create a new signed token targeting tombstone version 3
  const recreateClaimsV2 = {
    action: 'AUTHORIZE_ENTITY_RECREATE',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    target_env: 'tatalora-staging',
    tombstone_version_to_supersede: 3,
    minimum_new_version: 4,
    nonce: 'reusable-test-nonce-123',
    issued_at: Date.now(),
    expires_at: Date.now() + 60000
  };
  const tokenV2 = createSignedToken(recreateClaimsV2);

  // First consumption of tokenV2 succeeds
  const firstRecreate = await harness.replayEventToMongo({
    event_id: 'evt-recreate-v2-first',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 4,
    operation: 'RECREATE',
    recreate_token: tokenV2,
    current_state: { name: 'Resurrected Twice' },
    replay_fingerprint: 'fp-rec-v2-first'
  });
  assert(firstRecreate.status === 'AUTHORIZED_RECREATE_APPLIED', 'Test 17e: First use of tokenV2 succeeds');

  // Put into tombstone again with version 5
  await harness.replayEventToMongo({
    event_id: 'evt-delete-03',
    model_name: 'Customer',
    record_id: 'cust-resurrect-01',
    entity_version: 5,
    operation: 'HARD_DELETE',
    replay_fingerprint: 'fp-del-03'
  });

  // Second token targeting tombstone 5, BUT with the same consumed nonce 'reusable-test-nonce-123'
  const reusedNonceClaims = {
    ...recreateClaimsV2,
    tombstone_version_to_supersede: 5,
    minimum_new_version: 6,
    nonce: 'reusable-test-nonce-123' // Reused nonce!
  };
  const reusedNonceToken = createSignedToken(reusedNonceClaims);

  try {
    await harness.replayEventToMongo({
      event_id: 'evt-recreate-v2-reused-nonce',
      model_name: 'Customer',
      record_id: 'cust-resurrect-01',
      entity_version: 6,
      operation: 'RECREATE',
      recreate_token: reusedNonceToken,
      current_state: { name: 'Duplicate Recreate' },
      replay_fingerprint: 'fp-rec-v2-reused'
    });
    assert(false, 'Test 17f: Replay of consumed nonce must be rejected');
  } catch (err) {
    assert(err.message.includes('NONCE_REPLAY_REJECTED'), 'Test 17f: Reused nonce correctly rejected with NONCE_REPLAY_REJECTED');
  }

  // ====================================================================
  // PHASE 8.7.3D: STRICT URI POLICY & INDEX SCRIPT UNIT TESTS
  // ====================================================================

  // Test 18: Reject MongoDB URI with wrong database path (not /tatalora_staging)
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: 'mongodb://staging-user:secret@staging-cluster.internal:27017/wrong_db'
    });
    assert(false, 'Test 18: Reject MongoDB URI with wrong database path');
  } catch (err) {
    assert(err.message.includes("must be 'tatalora_staging'"), 'Test 18: Rejects database name other than tatalora_staging');
  }

  // Test 19: Reject MongoDB URI with insecure TLS parameters
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: 'mongodb://staging-user:secret@staging-cluster.internal:27017/tatalora_staging?tlsInsecure=true'
    });
    assert(false, 'Test 19: Reject MongoDB URI with tlsInsecure=true');
  } catch (err) {
    assert(err.message.includes('Insecure TLS parameter detected'), 'Test 19: Rejects tlsInsecure parameter');
  }

  // Test 20: Reject non-MongoDB protocol in mongoUri
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: 'http://staging-cluster.internal:27017/tatalora_staging'
    });
    assert(false, 'Test 20: Reject non-mongodb protocol');
  } catch (err) {
    assert(err.message.includes('Invalid MongoDB protocol'), 'Test 20: Rejects HTTP protocol for MongoDB');
  }

  // Test 21: PostgreSQL Staging URI validation - Valid Supabase Pooler URI accepted
  const validPgUri = 'postgresql://postgres.xywfoixgmqhecsufhlvz:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require';
  const workerWithPg = new ProductionCdcRelayWorker({
    targetEnv: 'tatalora-staging',
    mongoUri: validStagingUri,
    postgresUri: validPgUri
  });
  assert(workerWithPg.targetEnv === 'tatalora-staging', 'Test 21: Valid Supabase pooler PostgreSQL URI accepted');

  // Test 22: Reject PostgreSQL URI without sslmode=require on remote host
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: validStagingUri,
      postgresUri: 'postgresql://user:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=disable'
    });
    assert(false, 'Test 22: Reject PostgreSQL URI without SSL');
  } catch (err) {
    assert(err.message.includes('Remote staging PostgreSQL requires sslmode=require'), 'Test 22: Rejects sslmode=disable');
  }

  // Test 23: Reject PostgreSQL URI pointing to non-whitelisted host
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: validStagingUri,
      postgresUri: 'postgresql://user:pass@unknown-postgres-host.net:5432/postgres?sslmode=require'
    });
    assert(false, 'Test 23: Reject non-allowlisted PostgreSQL host');
  } catch (err) {
    assert(err.message.includes('not in approved staging allowlist'), 'Test 23: Rejects unapproved PostgreSQL host');
  }

  // Test 24: MongoDB Index Script Validator - Accepts valid staging URI
  const { validateStagingMongoUri } = require('./04_staging_mongo_cdc_indexes');
  let indexValidatorPassed = false;
  try {
    validateStagingMongoUri(validStagingUri);
    indexValidatorPassed = true;
  } catch (e) {
    indexValidatorPassed = false;
  }
  assert(indexValidatorPassed, 'Test 24: Index script validator accepts valid staging URI');

  // Test 25: MongoDB Index Script Validator - Rejects wrong DB path and non-whitelisted host
  let rejectedIndexCount = 0;
  try {
    validateStagingMongoUri('mongodb://user:pass@staging-cluster.internal:27017/wrong_db');
  } catch (e) {
    if (e.message.includes("Target database must be 'tatalora_staging'")) rejectedIndexCount++;
  }
  try {
    validateStagingMongoUri('mongodb://user:pass@unknown-mongo-host.com:27017/tatalora_staging');
  } catch (e) {
    if (e.message.includes('not in approved staging allowlist')) rejectedIndexCount++;
  }
  try {
    validateStagingMongoUri('mongodb://user:pass@staging-cluster.internal:27017/tatalora_staging_production');
  } catch (e) {
    if (e.message.includes('Attempted to run index provisioning against production URI!')) rejectedIndexCount++;
  }
  assert(rejectedIndexCount === 3, 'Test 25: Index script validator rejects wrong DB, unknown host, and production signature');

  // ====================================================================
  // PHASE 8.7.4A: F-04 & F-05 NEGATIVE TESTS
  // ====================================================================

  // Test 26: Reject PostgreSQL URI with wrong database path (not /postgres)
  try {
    new ProductionCdcRelayWorker({
      targetEnv: 'tatalora-staging',
      mongoUri: validStagingUri,
      postgresUri: 'postgresql://user:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/wrong_pg_db?sslmode=require'
    });
    assert(false, 'Test 26: Reject PostgreSQL URI with wrong database path');
  } catch (err) {
    assert(err.message.includes("database path must be 'postgres'"), 'Test 26: Rejects PostgreSQL database path other than /postgres');
  }

  // Test 27: Reject PostgreSQL URI with insecure/disabled SSL mode
  const insecurePgModes = ['disable', 'allow', 'prefer'];
  let pgInsecureRejected = 0;
  for (const mode of insecurePgModes) {
    try {
      new ProductionCdcRelayWorker({
        targetEnv: 'tatalora-staging',
        mongoUri: validStagingUri,
        postgresUri: `postgresql://user:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=${mode}`
      });
    } catch (err) {
      if (err.message.includes('Remote staging PostgreSQL requires sslmode=require') || err.message.includes('Insecure SSL configuration rejected')) {
        pgInsecureRejected++;
      }
    }
  }
  assert(pgInsecureRejected === insecurePgModes.length, 'Test 27: Rejects all insecure PostgreSQL sslmode settings (disable, allow, prefer)');

  // Test 28: MongoDB Index Provisioning Gatekeeper Rejects Insecure TLS Parameters (F-05)
  const insecureMongoParams = [
    'tlsInsecure=true',
    'sslInsecure=true',
    'tlsAllowInvalidCertificates=true',
    'tlsAllowInvalidHostnames=true',
    'ssl=false'
  ];
  let mongoInsecureTlsRejected = 0;
  for (const p of insecureMongoParams) {
    try {
      validateStagingMongoUri(`mongodb://user:pass@staging-cluster.internal:27017/tatalora_staging?${p}`);
    } catch (err) {
      if (err.message.includes('Insecure TLS parameter detected')) mongoInsecureTlsRejected++;
    }
  }
  assert(mongoInsecureTlsRejected === insecureMongoParams.length, 'Test 28: Index script validator rejects all insecure MongoDB TLS parameters');

  // ====================================================================
  // PHASE 8.7.4C: PLACEHOLDER & MISSING CONFIGURATION REJECTION TESTS
  // ====================================================================

  // Test 29: Reject unapproved placeholder hosts in ProductionCdcRelayWorker
  const placeholderHosts = [
    'staging-cluster-placeholder.internal',
    'todo-mongo-host.internal',
    'mongodb-staging.example.com',
    'unverified-mongo-host.net'
  ];
  let rejectedPlaceholders = 0;
  for (const h of placeholderHosts) {
    try {
      new ProductionCdcRelayWorker({
        targetEnv: 'tatalora-staging',
        mongoUri: `mongodb://user:pass@${h}:27017/tatalora_staging`
      });
    } catch (err) {
      if (err.message.includes('not in approved staging allowlist')) rejectedPlaceholders++;
    }
  }
  assert(rejectedPlaceholders === placeholderHosts.length, 'Test 29: Rejects unapproved and placeholder MongoDB hosts');

  // Test 30: Reject missing/undefined STAGING_MONGODB_URI in index validator
  let missingIndexUriRejected = false;
  try {
    validateStagingMongoUri(undefined);
  } catch (err) {
    if (err.message.includes('STAGING_MONGODB_URI is required')) missingIndexUriRejected = true;
  }
  assert(missingIndexUriRejected, 'Test 30: Index script validator rejects undefined or missing URI');

  console.log(`\n====================================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================================`);

  if (failed > 0) process.exit(1);
}

runUnitTests();
