import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
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
 */
export function createDb(dbPath = DB_PATH) {
  const resolved = join(process.cwd(), dbPath);

  // Ensure parent directory exists
  mkdirSync(dirname(resolved), { recursive: true });

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

  return db;
}

const db = createDb();
export default db;
