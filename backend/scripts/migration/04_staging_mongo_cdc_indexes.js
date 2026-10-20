/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.7.3B: MONGODB CDC IDEMPOTENCY & NONCE INDEXES
 * ====================================================================
 * STATUS: LOCAL PROVISIONING SCRIPT — NOT EXECUTED IN THIS PHASE
 * Target: MongoDB Staging Sandbox (Future Staging Preparation)
 * 
 * Collections & Indexes defined:
 * 1. _cdc_applied_events:
 *    - event_id (UNIQUE): Guarantees strictly-once commit per outbox event.
 *    - applied_at (TTL 30 days): Automates archival/cleanup of stale sync receipts.
 * 2. _cdc_recreate_nonces:
 *    - nonce (UNIQUE): Guarantees single-use cryptographic token authorization.
 *    - consumed_at (TTL 30 days): Cleans up expired nonces after authorization validity.
 * 3. Operational Models (e.g. Invoice, Customer, etc.):
 *    - _is_deleted + entity_version: Fast filtering for active documents and conflict resolution.
 * ====================================================================
 */

const { MongoClient } = require('mongodb');

// Approved Staging Host Allowlist
const STAGING_HOST_ALLOWLIST = [
  'staging-cluster.internal',
  'staging-mongo.internal',
  'localhost',
  '127.0.0.1'
];

function validateStagingMongoUri(mongoUri, allowedHosts = STAGING_HOST_ALLOWLIST) {
  if (!mongoUri) {
    throw new Error('CRITICAL_SAFETY_ABORT: STAGING_MONGODB_URI is required to provision staging CDC indexes.');
  }

  // 1. Reject production signatures FIRST
  if (/production|prod|tatalora-live|atlas-prod/i.test(mongoUri)) {
    throw new Error('CRITICAL_SAFETY_ABORT: Attempted to run index provisioning against production URI!');
  }

  // 2. Protocol check
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('CRITICAL_SAFETY_ABORT: Invalid MongoDB protocol in target URI.');
  }

  // 3. Parse URL and validate hostname allowlist
  let parsed;
  try {
    parsed = new URL(mongoUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
  } catch (err) {
    throw new Error('CRITICAL_SAFETY_ABORT: Malformed target URI.');
  }

  const hostname = parsed.hostname;
  const isAllowed = allowedHosts.some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`));
  if (!isAllowed) {
    throw new Error(`CRITICAL_SAFETY_ABORT: Target host '${hostname}' is not in approved staging allowlist.`);
  }

  // 4. Database path check
  const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '').split('?')[0] : '';
  if (dbName !== 'tatalora_staging') {
    throw new Error(`CRITICAL_SAFETY_ABORT: Target database must be 'tatalora_staging'. Got: '${dbName}'`);
  }

  // 5. Reject Insecure TLS / SSL Parameters in MongoDB URI
  const searchParams = parsed.searchParams;
  if (
    searchParams.get('tlsInsecure') === 'true' ||
    searchParams.get('sslInsecure') === 'true' ||
    searchParams.get('tlsAllowInvalidCertificates') === 'true' ||
    searchParams.get('tlsAllowInvalidHostnames') === 'true' ||
    searchParams.get('ssl') === 'false'
  ) {
    throw new Error('CRITICAL_SAFETY_ABORT: Insecure TLS parameter detected in MongoDB target URI.');
  }
}

async function provisionMongoCdcIndexes(mongoUri) {
  validateStagingMongoUri(mongoUri);

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();

  try {
    console.log('Provisioning index: _cdc_applied_events (event_id UNIQUE)...');
    await db.collection('_cdc_applied_events').createIndex(
      { event_id: 1 },
      { unique: true, name: 'uniq_cdc_applied_event_id' }
    );

    console.log('Provisioning index: _cdc_applied_events (applied_at TTL 30 days)...');
    await db.collection('_cdc_applied_events').createIndex(
      { applied_at: 1 },
      { expireAfterSeconds: 30 * 24 * 3600, name: 'ttl_cdc_applied_events_30d' }
    );

    console.log('Provisioning index: _cdc_recreate_nonces (nonce UNIQUE)...');
    await db.collection('_cdc_recreate_nonces').createIndex(
      { nonce: 1 },
      { unique: true, name: 'uniq_cdc_recreate_nonce' }
    );

    console.log('Provisioning index: _cdc_recreate_nonces (consumed_at TTL 30 days)...');
    await db.collection('_cdc_recreate_nonces').createIndex(
      { consumed_at: 1 },
      { expireAfterSeconds: 30 * 24 * 3600, name: 'ttl_cdc_recreate_nonces_30d' }
    );

    console.log('Staging MongoDB CDC indexes provisioned successfully.');
  } finally {
    await client.close();
  }
}

module.exports = { 
  provisionMongoCdcIndexes,
  validateStagingMongoUri,
  STAGING_HOST_ALLOWLIST
};
