/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.7.2B: PRODUCTION-GRADE CDC RELAY WORKER
 * ====================================================================
 * STATUS: LOCAL REMEDIATED IMPLEMENTATION — DORMANT BY DEFAULT
 *
 * Remediated Capabilities:
 * 1. Explicit Asynchronous Connection Lifecycle (connect / disconnect).
 * 2. Strict Target Policy: Validates host and rejects any URI containing
 *    production hostnames, cluster tags, or database names.
 * 3. Persistent Atomic Nonce Tracking: Pre-allocates single-use nonces in
 *    _cdc_recreate_nonces collection within the MongoDB transaction.
 * 4. Multi-Document ACID Transactions on MongoDB (Business mutation + applied_events ledger).
 * 5. Deterministic Concurrent Duplicate-Key Handling (E11000 ledger convergence vs. mismatch).
 * 6. Persistent Entity Quarantine for isolated dead-letter handling.
 * 7. Cryptographic RECREATE Authorization verification (Ed25519).
 * ====================================================================
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Approved Staging Host Allowlist (Reject anything outside this explicit set)
const STAGING_HOST_ALLOWLIST = [
  'staging-cluster.internal',
  'staging-mongo.internal',
  'localhost',
  '127.0.0.1'
];

class ProductionCdcRelayWorker {
  constructor(config = {}) {
    this.targetEnv = config.targetEnv || process.env.TATALORA_STAGE || 'UNKNOWN';
    this.prisma = config.prisma; // Injected PrismaClient instance
    this.mongoUri = config.mongoUri || process.env.STAGING_MONGODB_URI;
    this.allowedHosts = config.allowedHosts || STAGING_HOST_ALLOWLIST;
    this.postgresUri = config.postgresUri || process.env.STAGING_DATABASE_URL;
    this.batchSize = config.batchSize || 50;
    this.workerId = config.workerId || `worker-${crypto.randomBytes(4).toString('hex')}`;
    this.leaseDurationSeconds = config.leaseDurationSeconds || 30;
    this.maxRetries = config.maxRetries || 3;
    this.recreatePublicKey = config.recreatePublicKey || process.env.CDC_RECREATE_PUBLIC_KEY;

    this.mongoClient = null;
    this.mongoDb = null;
    this.isConnected = false;
    this.isPolling = false;

    // Fail-Closed Target Validation:
    this.validateTargetPolicy();
  }

  /**
   * Helper to safely format URIs in error logs without leaking passwords
   */
  static sanitizeUri(uri) {
    if (!uri) return '';
    try {
      return uri.replace(/\/\/[^@]+@/, '//[REDACTED_CREDENTIALS]@');
    } catch {
      return '[REDACTED_URI]';
    }
  }

  /**
   * Validate that configuration strictly adheres to staging and contains no production indicators
   * Validates protocol, hostname allowlist, db path, port, and security/TLS parameters
   */
  validateTargetPolicy() {
    if (this.targetEnv !== 'tatalora-staging') {
      throw new Error(`CRITICAL_SAFETY_ABORT: RelayWorker must only be initialized with targetEnv='tatalora-staging'. Got: '${this.targetEnv}'`);
    }

    if (!this.mongoUri) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Missing STAGING_MONGODB_URI configuration.`);
    }

    // 1. Strict Target Policy Validation: Reject any URI with production signatures FIRST
    const prodSignatures = [/production/i, /prod/i, /tatalora-live/i, /atlas-prod/i];
    for (const sig of prodSignatures) {
      if (sig.test(this.mongoUri)) {
        throw new Error(`CRITICAL_SAFETY_ABORT: Target URI failed staging safety policy: matches production signature '${sig}'`);
      }
    }

    // 2. Strict Protocol Check for MongoDB
    const isMongoProto = this.mongoUri.startsWith('mongodb://') || this.mongoUri.startsWith('mongodb+srv://');
    if (!isMongoProto) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Invalid MongoDB protocol in target URI: ${ProductionCdcRelayWorker.sanitizeUri(this.mongoUri)}`);
    }

    // 3. Strict URL Parsing & Hostname Allowlist Extraction
    let parsedMongo;
    try {
      parsedMongo = new URL(this.mongoUri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    } catch (err) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Malformed target URI: ${ProductionCdcRelayWorker.sanitizeUri(this.mongoUri)}`);
    }

    const hostname = parsedMongo.hostname;
    const isHostAllowed = this.allowedHosts.some(allowed => 
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    if (!isHostAllowed) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Target host '${hostname}' is not in approved staging allowlist: [${this.allowedHosts.join(', ')}]`);
    }

    // 4. Strict Database Path Check for MongoDB (/tatalora_staging)
    const mongoPath = parsedMongo.pathname ? parsedMongo.pathname.replace(/^\//, '').split('?')[0] : '';
    if (mongoPath !== 'tatalora_staging') {
      throw new Error(`CRITICAL_SAFETY_ABORT: Target database path must be 'tatalora_staging'. Got: '${mongoPath}'`);
    }

    // 5. Reject Insecure TLS / SSL Parameters in MongoDB URI
    const searchParams = parsedMongo.searchParams;
    if (
      searchParams.get('tlsInsecure') === 'true' ||
      searchParams.get('sslInsecure') === 'true' ||
      searchParams.get('tlsAllowInvalidCertificates') === 'true' ||
      searchParams.get('tlsAllowInvalidHostnames') === 'true' ||
      searchParams.get('ssl') === 'false'
    ) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Insecure TLS parameter detected in MongoDB target URI.`);
    }

    // 6. If PostgreSQL URI is provided or configured, validate its staging policy
    if (this.postgresUri) {
      this.validatePostgresTargetPolicy(this.postgresUri);
    }
  }

  /**
   * Validate PostgreSQL connection URI against staging safety policy
   */
  validatePostgresTargetPolicy(pgUri) {
    if (!pgUri.startsWith('postgresql://') && !pgUri.startsWith('postgres://')) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Invalid PostgreSQL protocol in target URI.`);
    }

    let parsedPg;
    try {
      parsedPg = new URL(pgUri);
    } catch (err) {
      throw new Error(`CRITICAL_SAFETY_ABORT: Malformed PostgreSQL target URI: ${ProductionCdcRelayWorker.sanitizeUri(pgUri)}`);
    }

    const pgHost = parsedPg.hostname;
    const pgPort = parsedPg.port || '5432';

    // Must match Supabase staging pooler or localhost test sandbox
    const allowedPgHosts = [
      'aws-0-ap-northeast-1.pooler.supabase.com',
      'localhost',
      '127.0.0.1'
    ];
    if (!allowedPgHosts.includes(pgHost)) {
      throw new Error(`CRITICAL_SAFETY_ABORT: PostgreSQL host '${pgHost}' is not in approved staging allowlist.`);
    }

    if (pgHost === 'aws-0-ap-northeast-1.pooler.supabase.com' && pgPort !== '5432' && pgPort !== '6543') {
      throw new Error(`CRITICAL_SAFETY_ABORT: Invalid port '${pgPort}' for Supabase pooler (expected 5432 or 6543).`);
    }

    // 4. Strict Database Path Check for PostgreSQL (/postgres)
    const pgPath = parsedPg.pathname ? parsedPg.pathname.replace(/^\//, '').split('?')[0] : '';
    if (pgPath !== 'postgres') {
      throw new Error(`CRITICAL_SAFETY_ABORT: PostgreSQL database path must be 'postgres'. Got: '${pgPath}'`);
    }

    // 5. Require TLS (sslmode=require or verify-full) on remote staging & reject insecure/disable
    const sslmode = parsedPg.searchParams.get('sslmode');
    if (pgHost !== 'localhost' && pgHost !== '127.0.0.1') {
      if (sslmode !== 'require' && sslmode !== 'verify-full') {
        throw new Error(`CRITICAL_SAFETY_ABORT: Remote staging PostgreSQL requires sslmode=require or sslmode=verify-full.`);
      }
    }
    if (sslmode === 'disable' || sslmode === 'allow' || sslmode === 'prefer' || parsedPg.searchParams.get('ssl') === 'false') {
      throw new Error(`CRITICAL_SAFETY_ABORT: Insecure SSL configuration rejected in PostgreSQL target URI.`);
    }

    // 6. Reject production signatures in PostgreSQL URI
    const prodSignatures = [/production/i, /prod\./i, /live/i];
    for (const sig of prodSignatures) {
      if (sig.test(pgUri)) {
        throw new Error(`CRITICAL_SAFETY_ABORT: PostgreSQL URI matches production signature '${sig}'.`);
      }
    }
  }

  /**
   * Explicit asynchronous connection lifecycle initialization
   */
  async connect() {
    if (this.isConnected) return;
    this.validateTargetPolicy();

    this.mongoClient = new MongoClient(this.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });

    await this.mongoClient.connect();
    this.mongoDb = this.mongoClient.db();
    this.isConnected = true;
  }

  /**
   * Cleanly disconnect MongoDB client
   */
  async disconnect() {
    if (!this.isConnected || !this.mongoClient) return;
    this.isPolling = false;
    await this.mongoClient.close();
    this.isConnected = false;
    this.mongoDb = null;
    this.mongoClient = null;
  }

  /**
   * Deterministic SHA-256 fingerprint generator
   */
  static generateFingerprint(operation, model, recordId, version, state) {
    const content = `${operation}:${model}:${recordId}:${version}:${JSON.stringify(state || {})}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Cryptographically verify an Ed25519 RECREATE token with canonical claim serialization
   */
  verifyRecreateToken(tokenBase64, expectedModel, expectedRecordId, currentTombstoneVersion) {
    if (!this.recreatePublicKey) {
      throw new Error('RECREATE_DISABLED: No public key configured for authorization verification');
    }
    try {
      const tokenBuffer = Buffer.from(tokenBase64, 'base64');
      const tokenData = JSON.parse(tokenBuffer.toString('utf8'));
      const { payload, signature } = tokenData;

      if (!payload || !signature || !payload.nonce) {
        return { valid: false, reason: 'MALFORMED_TOKEN_STRUCTURE' };
      }

      // Canonical serialization of signed claims
      const canonicalClaims = JSON.stringify({
        action: payload.action,
        model_name: payload.model_name,
        record_id: payload.record_id,
        target_env: payload.target_env,
        tombstone_version_to_supersede: payload.tombstone_version_to_supersede,
        minimum_new_version: payload.minimum_new_version,
        nonce: payload.nonce,
        issued_at: payload.issued_at,
        expires_at: payload.expires_at
      });

      // Verify asymmetric Ed25519 signature
      const isVerified = crypto.verify(
        null,
        Buffer.from(canonicalClaims),
        this.recreatePublicKey,
        Buffer.from(signature, 'hex')
      );
      if (!isVerified) return { valid: false, reason: 'INVALID_SIGNATURE' };

      // Verify claims
      if (payload.action !== 'AUTHORIZE_ENTITY_RECREATE') return { valid: false, reason: 'INVALID_ACTION' };
      if (payload.model_name !== expectedModel) return { valid: false, reason: 'MODEL_MISMATCH' };
      if (payload.record_id !== expectedRecordId) return { valid: false, reason: 'RECORD_ID_MISMATCH' };
      if (payload.target_env !== this.targetEnv) return { valid: false, reason: 'ENV_MISMATCH' };
      if (Date.now() > payload.expires_at) return { valid: false, reason: 'TOKEN_EXPIRED' };
      if (payload.tombstone_version_to_supersede < currentTombstoneVersion) {
        return { valid: false, reason: 'STALE_TOMBSTONE_VERSION' };
      }

      return { valid: true, payload };
    } catch (err) {
      return { valid: false, reason: `PARSE_ERROR: ${err.message}` };
    }
  }

  /**
   * Claim a batch of outbox rows from PostgreSQL using row leases
   */
  async claimOutboxBatch() {
    if (!this.prisma) throw new Error('CLIENT_UNAVAILABLE: Prisma instance required for polling');
    const query = `
      UPDATE public._reverse_sync_outbox
      SET status = 'IN_FLIGHT',
          worker_id = $1,
          lease_expires_at = NOW() + INTERVAL '${this.leaseDurationSeconds} seconds',
          attempt_count = attempt_count + 1
      WHERE id IN (
          SELECT id FROM public._reverse_sync_outbox
          WHERE (status = 'PENDING' OR (status = 'IN_FLIGHT' AND lease_expires_at < NOW()))
            AND (model_name, record_id) NOT IN (SELECT model_name, record_id FROM public._cdc_quarantine WHERE unquarantined_at IS NULL)
          ORDER BY transaction_timestamp ASC, id ASC
          LIMIT ${this.batchSize}
          FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    return this.prisma.$queryRawUnsafe(query, this.workerId);
  }

  /**
   * Atomically replay a single event to MongoDB within a Multi-Document Transaction
   */
  async replayEventToMongo(event) {
    if (!this.isConnected || !this.mongoClient || !this.mongoDb) {
      throw new Error('CLIENT_UNAVAILABLE: MongoDB client is not connected. Call connect() first.');
    }

    const session = this.mongoClient.startSession();
    const ledger = this.mongoDb.collection('_cdc_applied_events');
    const nonceCollection = this.mongoDb.collection('_cdc_recreate_nonces');
    const collection = this.mongoDb.collection(event.model_name);

    try {
      let replayResult = null;

      await session.withTransaction(async () => {
        // 1. Check idempotency ledger first
        const applied = await ledger.findOne({ event_id: event.event_id }, { session });
        if (applied) {
          if (applied.fingerprint !== event.replay_fingerprint) {
            throw new Error(`CRITICAL_FINGERPRINT_MISMATCH: Existing event ${event.event_id} has conflicting fingerprint`);
          }
          replayResult = { status: 'ALREADY_COMMITTED_IN_LEDGER' };
          return;
        }

        // 2. Fetch current document inside transaction
        const doc = await collection.findOne({ _id: event.record_id }, { session });

        // 3. Process Replay State Machine
        if (event.operation === 'HARD_DELETE') {
          await collection.updateOne(
            { _id: event.record_id },
            {
              $set: {
                _is_deleted: true,
                _tombstone_at: new Date(),
                _tombstone_version: Number(event.entity_version),
                entity_version: Number(event.entity_version),
                _last_fingerprint: event.replay_fingerprint
              }
            },
            { upsert: true, session }
          );
          replayResult = { status: 'TOMBSTONE_APPLIED' };
        } else if (doc && doc._is_deleted) {
          // Document is currently a dead tombstone
          if ((event.operation === 'RECREATE' || event.operation === 'CREATE') && event.recreate_token) {
            const auth = this.verifyRecreateToken(event.recreate_token, event.model_name, event.record_id, doc._tombstone_version);
            if (!auth.valid) {
              throw new Error(`UNAUTHORIZED_RECREATE_REJECTED: ${auth.reason}`);
            }

            // Atomic Nonce Consumption: Insert into nonce ledger inside same transaction
            try {
              await nonceCollection.insertOne({
                nonce: auth.payload.nonce,
                model_name: event.model_name,
                record_id: event.record_id,
                consumed_at: new Date()
              }, { session });
            } catch (nonceErr) {
              if (nonceErr.code === 11000) {
                throw new Error(`NONCE_REPLAY_REJECTED: Nonce ${auth.payload.nonce} was already consumed`);
              }
              throw nonceErr;
            }

            // Authorized Recreate Execution
            await collection.updateOne(
              { _id: event.record_id },
              {
                $set: {
                  ...event.current_state,
                  _is_deleted: false,
                  entity_version: Number(event.entity_version),
                  _resurrected_at: new Date(),
                  _last_fingerprint: event.replay_fingerprint
                }
              },
              { session }
            );
            replayResult = { status: 'AUTHORIZED_RECREATE_APPLIED' };
          } else {
            // Normal UPDATE or unauthorized mutation against tombstone is strictly rejected
            replayResult = { status: 'REJECTED_STALE_AGAINST_TOMBSTONE' };
          }
        } else if (doc && Number(doc.entity_version) >= Number(event.entity_version)) {
          // Stale or duplicate update
          replayResult = { status: 'REJECTED_STALE_VERSION' };
        } else {
          // Valid Progressive INSERT or UPDATE
          const updatePayload = {
            ...event.current_state,
            _id: event.record_id,
            entity_version: Number(event.entity_version),
            _is_deleted: false,
            _last_fingerprint: event.replay_fingerprint,
            _cdc_replayed_at: new Date()
          };
          delete updatePayload.id;

          await collection.updateOne(
            { _id: event.record_id },
            { $set: updatePayload },
            { upsert: true, session }
          );
          replayResult = { status: 'MUTATION_APPLIED' };
        }

        // 4. Record Applied Event in Ledger inside IDENTICAL transaction
        await ledger.insertOne({
          event_id: event.event_id,
          model_name: event.model_name,
          record_id: event.record_id,
          entity_version: Number(event.entity_version),
          fingerprint: event.replay_fingerprint,
          result: replayResult.status,
          applied_at: new Date()
        }, { session });

      }, {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true }
      });

      return replayResult;
    } catch (err) {
      // Handle Duplicate Key Collision on _cdc_applied_events specifically:
      if (err.code === 11000 && err.keyPattern && err.keyPattern.event_id) {
        // Query the ledger outside transaction to determine if it converged or collided
        const existing = await ledger.findOne({ event_id: event.event_id });
        if (existing && existing.fingerprint === event.replay_fingerprint) {
          return { status: 'CONVERGED_DUPLICATE_RACE' };
        } else {
          throw new Error(`CRITICAL_DUPLICATE_KEY_HASH_MISMATCH: ${err.message}`);
        }
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Quarantine a failing entity to avoid head-of-line blocking
   */
  async quarantineEntity(event, reason) {
    if (!this.prisma) return;
    const query = `
      INSERT INTO public._cdc_quarantine (model_name, record_id, reason, last_event_id, quarantined_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (model_name, record_id) DO UPDATE
      SET reason = $3, last_event_id = $4, quarantined_at = NOW();
    `;
    await this.prisma.$executeRawUnsafe(query, event.model_name, event.record_id, reason, event.event_id);

    const updateOutbox = `
      UPDATE public._reverse_sync_outbox
      SET status = 'DEAD_LETTER', dead_letter_reason = $1
      WHERE id = $2;
    `;
    await this.prisma.$executeRawUnsafe(updateOutbox, reason, event.id);
  }

  /**
   * Safely acknowledge outbox event in PostgreSQL after confirmed MongoDB commit
   * Enforces lease ownership so an expired worker whose lease was stolen cannot acknowledge
   */
  async acknowledgePostgres(eventId) {
    if (!this.prisma) return;
    const query = `
      UPDATE public._reverse_sync_outbox
      SET status = 'PROCESSED', processed_at = NOW()
      WHERE event_id = $1 AND worker_id = $2;
    `;
    return this.prisma.$executeRawUnsafe(query, eventId, this.workerId);
  }
}

module.exports = { ProductionCdcRelayWorker };
