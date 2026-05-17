import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { DB_PATH } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function migrate(db, statement) {
  try { db.exec(statement); } catch { /* column already exists */ }
}

/**
 * Create a new database connection. Use this for testing or
 * when you need a separate database instance.
 *
 * Path resolution: an absolute path (e.g. `/data/elevate.db` on Fly's
 * persistent volume) is used verbatim. A relative path (`../database/jokel.db`
 * in dev) is resolved against the process working directory. This matters
 * in production — `path.join(cwd, '/data/elevate.db')` silently writes to
 * `cwd/data/elevate.db` on some Node versions, which lands inside the
 * ephemeral container filesystem and gets wiped on every restart.
 */
export function createDb(dbPath = DB_PATH) {
  const resolved = isAbsolute(dbPath) ? dbPath : join(process.cwd(), dbPath);

  // Ensure parent directory exists
  mkdirSync(dirname(resolved), { recursive: true });

  // Log where we actually open SQLite so a misconfigured DB_PATH on Fly
  // (or any container) shows up immediately in `flyctl logs` instead of
  // silently writing to ephemeral disk and vanishing on every redeploy.
  if (process.env.NODE_ENV === 'production') {
    console.log(`[db] opening SQLite at ${resolved}`);
  }

  const db = new Database(resolved);

  // Security and durability pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = FULL');
  db.pragma('temp_store = MEMORY');
  db.pragma('secure_delete = ON');
  db.pragma('trusted_schema = OFF');

  // Run schema
  const schemaPath = join(__dirname, '../..', 'database', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Migrations: add columns if missing on existing databases
  migrate(db, 'ALTER TABLE columns ADD COLUMN deleted_at TEXT');
  migrate(db, 'ALTER TABLE tasks ADD COLUMN deleted_at TEXT');
  migrate(db, 'ALTER TABLE workspaces ADD COLUMN custom_fields TEXT DEFAULT "[]"');
  migrate(db, 'ALTER TABLE workspaces ADD COLUMN labels TEXT DEFAULT "[]"');
  migrate(db, 'ALTER TABLE tasks ADD COLUMN custom_fields TEXT DEFAULT "{}"');
  migrate(db, 'ALTER TABLE tasks ADD COLUMN label_ids TEXT DEFAULT "[]"');

  // Attachments: production-grade metadata
  migrate(db, 'ALTER TABLE attachments ADD COLUMN storage_key TEXT');
  migrate(db, 'ALTER TABLE attachments ADD COLUMN mime_type TEXT');
  migrate(db, 'ALTER TABLE attachments ADD COLUMN size INTEGER');
  migrate(db, 'ALTER TABLE attachments ADD COLUMN sha256 TEXT');

  // Backfill: legacy rows had url=/uploads/<filename> with the file at
  // backend/uploads/<filename>. Move them into the new layout so every
  // attachment goes through /api/v1/attachments/:id/file.
  try {
    const legacy = db
      .prepare(
        "SELECT id, url FROM attachments WHERE storage_key IS NULL AND url LIKE '/uploads/%'"
      )
      .all();
    if (legacy.length) {
      const update = db.prepare(
        'UPDATE attachments SET storage_key = ?, url = ? WHERE id = ?'
      );
      const tx = db.transaction((rows) => {
        for (const r of rows) {
          const filename = r.url.replace(/^\/uploads\//, '');
          // Keep the file where it is; the new key is just the bare filename
          // relative to the uploads root. Old uploads land alongside new
          // attachments/<task>/<id>.ext keys without conflict.
          update.run(filename, `/api/v1/attachments/${r.id}/file`, r.id);
        }
      });
      tx(legacy);
    }
  } catch {
    // Best-effort backfill; never block startup.
  }

  // Migrations: indexes on migrated columns (must run after ALTER TABLE)
  migrate(db, 'CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at)');
  migrate(db, 'CREATE INDEX IF NOT EXISTS idx_columns_deleted ON columns(deleted_at)');

  // Checklist items: quantity-based progress (target_count > 1 means counter mode)
  migrate(db, 'ALTER TABLE checklist_items ADD COLUMN target_count INTEGER NOT NULL DEFAULT 1');
  migrate(db, 'ALTER TABLE checklist_items ADD COLUMN current_count INTEGER NOT NULL DEFAULT 0');

  // Workspace: configurable issue code prefix
  migrate(db, "ALTER TABLE workspaces ADD COLUMN code_prefix TEXT NOT NULL DEFAULT 'SKY'");

  // Backlog: sprint staging
  migrate(db, 'ALTER TABLE tasks ADD COLUMN sprint_id TEXT');

  // Workspace: description
  migrate(db, "ALTER TABLE workspaces ADD COLUMN description TEXT NOT NULL DEFAULT ''");

  // Workspace branding: logo URL pointer + board background style.
  // Both nullable — null means "use defaults".
  migrate(db, 'ALTER TABLE workspaces ADD COLUMN logo TEXT');
  migrate(db, 'ALTER TABLE workspaces ADD COLUMN background TEXT');

  // OAuth identities table (Google / GitHub linkage).
  migrate(db, `
    CREATE TABLE IF NOT EXISTS oauth_identities (
      user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider         TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (provider, provider_user_id)
    )
  `);
  migrate(db, 'CREATE INDEX IF NOT EXISTS idx_oauth_identities_user ON oauth_identities(user_id)');

  // Task watchers — many-to-many join created lazily for old databases.
  migrate(db, `
    CREATE TABLE IF NOT EXISTS task_watchers (
      task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (task_id, user_id)
    )
  `);
  migrate(db, 'CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON task_watchers(user_id)');

  // Make users.password_hash nullable so OAuth-only users can exist.
  // SQLite can't drop NOT NULL in place, so we rewrite the table only
  // when the constraint is still present. Idempotent.
  try {
    const tableInfo = db.prepare("PRAGMA table_info('users')").all();
    const pwCol = tableInfo.find((c) => c.name === 'password_hash');
    if (pwCol && pwCol.notnull === 1) {
      db.exec('BEGIN');
      try {
        db.exec(`
          CREATE TABLE users__new (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            password_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          );
          INSERT INTO users__new (id, email, name, avatar, password_hash, created_at, updated_at)
            SELECT id, email, name, avatar, password_hash, created_at, updated_at FROM users;
          DROP TABLE users;
          ALTER TABLE users__new RENAME TO users;
        `);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
  } catch (err) {
    console.warn('[db] users.password_hash migration skipped:', err.message);
  }

  // Permissions: enforce single owner per workspace and normalize unknown roles.
  // SQLite can't add CHECK constraints to existing tables in-place, so we
  // backstop with a unique partial index plus a role normalization pass.
  try {
    db.exec(`UPDATE workspace_members
             SET role = 'member'
             WHERE role NOT IN ('owner', 'admin', 'member', 'viewer')`);
  } catch { /* ignore */ }
  migrate(
    db,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_one_owner
       ON workspace_members(workspace_id) WHERE role = 'owner'`
  );

  // Normalize legacy timestamp rows. Older inserts used SQLite's
  // `datetime('now')` which produces `'YYYY-MM-DD HH:MM:SS'` — no timezone
  // marker, so JS parses it as local time and "X ago" math drifts by the
  // user's timezone offset. New writes use ISO-8601 UTC; this backfills
  // any row that doesn't already match (idempotent — converts in place).
  const NORMALIZE_TS = (table, column) => `
    UPDATE ${table}
       SET ${column} = strftime('%Y-%m-%dT%H:%M:%fZ', ${column})
     WHERE ${column} IS NOT NULL
       AND ${column} NOT LIKE '%T%Z'`;
  for (const [table, column] of [
    ['users', 'created_at'], ['users', 'updated_at'],
    ['workspaces', 'created_at'], ['workspaces', 'updated_at'],
    ['workspace_members', 'created_at'],
    ['columns', 'created_at'], ['columns', 'updated_at'], ['columns', 'deleted_at'],
    ['tasks', 'created_at'], ['tasks', 'updated_at'], ['tasks', 'deleted_at'],
    ['comments', 'created_at'],
    ['attachments', 'created_at'],
    ['checklists', 'created_at'],
    ['checklist_items', 'created_at'],
    ['activity_log', 'created_at'],
    ['api_keys', 'created_at'], ['api_keys', 'last_used_at'], ['api_keys', 'expires_at'],
    ['webhooks', 'created_at'], ['webhooks', 'updated_at'],
  ]) {
    try { db.exec(NORMALIZE_TS(table, column)); } catch { /* table or column may not exist on old DBs */ }
  }

  return db;
}

const db = createDb();
export default db;
