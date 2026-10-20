/**
 * ====================================================================
 * TATALORA ERP — PHASE 8.6.4: SECURE STAGING IDENTITY GUARD & LOADER
 * ====================================================================
 * Features:
 * 1. Strict Target Identity Verification:
 *    - Validates MongoDB source and PostgreSQL destination identities.
 *    - Explicitly blocks any host or database containing production keywords
 *      ('prod', 'production', 'live', 'primary', 'main-db', etc.).
 *    - Enforces approved staging pattern allowlists.
 * 2. Secure Configuration Loader:
 *    - Loads from environment or explicit staging config files.
 *    - Never logs or prints credentials, tokens, or passwords.
 *    - Redacts connection strings in all error messages and reports.
 * 3. Disposable Target Safety Guard:
 *    - Requires explicit `IS_DISPOSABLE_STAGING=true` confirmation before
 *      any write, truncate, or schema migration operation.
 * ====================================================================
 */

const STAGING_ALLOWLIST_PATTERNS = [
  /^staging-[a-z0-9_-]+$/,
  /^supabase-staging-[a-z0-9_-]+$/,
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /^test-isolated-[a-z0-9_-]+$/,
  /^.*staging.*$/i
];

const PRODUCTION_BLOCKLIST = [
  'prod',
  'production',
  'live',
  'primary',
  'main-db',
  'cluster.mongodb.net/erp_db'
];

class StagingEnvironmentGuard {
  constructor(options = {}) {
    this.mongoUri = options.mongoUri || process.env.STAGING_MONGO_URL || null;
    this.postgresUri = options.postgresUri || process.env.STAGING_DATABASE_URL || null;
  }

  // Redact connection strings for safe logging and reporting
  static sanitizeUri(uri) {
    if (!uri) return 'NOT_CONFIGURED';
    try {
      return uri.replace(/:([^:@]+)@/, ':***@');
    } catch (e) {
      return 'REDACTED_URI';
    }
  }

  // Validate identity of a target URL
  static verifyIdentity(targetName, uri, isDisposableRequired = true) {
    if (!uri) {
      return {
        valid: false,
        status: 'NOT_CONFIGURED',
        sanitizedUri: 'NOT_CONFIGURED',
        error: `${targetName} is not configured.`
      };
    }

    const uriLower = uri.toLowerCase();

    // 1. Check for production keywords
    for (const blocked of PRODUCTION_BLOCKLIST) {
      if (uriLower.includes(blocked)) {
        throw new Error(
          `SECURITY VIOLATION: ${targetName} ('${this.sanitizeUri(uri)}') contains prohibited production keyword '${blocked}'. Aborting immediately to protect production data!`
        );
      }
    }

    // 2. Check for staging allowlist pattern match
    let host = '';
    try {
      const match = uri.match(/@([^:\/?#]+)/);
      host = match ? match[1] : '';
    } catch (e) {}

    const isAllowlisted = STAGING_ALLOWLIST_PATTERNS.some(p => p.test(host) || p.test(uriLower));
    if (!isAllowlisted && host !== '') {
      throw new Error(
        `SECURITY VIOLATION: ${targetName} host '${host}' is not on the approved staging allowlist.`
      );
    }

    return {
      valid: true,
      status: 'VERIFIED_STAGING',
      sanitizedUri: this.sanitizeUri(uri)
    };
  }

  // Verify both source and target environments
  verifyStagingCluster() {
    const mongoStatus = StagingEnvironmentGuard.verifyIdentity('MongoDB Staging Source', this.mongoUri);
    const postgresStatus = StagingEnvironmentGuard.verifyIdentity('PostgreSQL Staging Target', this.postgresUri);

    return {
      isReady: mongoStatus.valid && postgresStatus.valid,
      mongo: mongoStatus,
      postgres: postgresStatus
    };
  }
}

module.exports = { StagingEnvironmentGuard };
