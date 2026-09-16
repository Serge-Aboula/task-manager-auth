require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      reset_token_hash TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await migrateColumns('users', {
    reset_token_hash: 'TEXT',
    reset_token_expires: 'TEXT',
    name: "TEXT NOT NULL DEFAULT ''",
    updated_at: 'TEXT'
  });

  await migrateColumns('tasks', {
    updated_at: 'TEXT'
  });

  // Comble updated_at pour les lignes déjà existantes avant l'ajout de la colonne
  await db.execute("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL");
  await db.execute("UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL");

  // Migration : ajoute les colonnes de reset si la table existait déjà sans elles
  async function migrateColumns(table, columnsToAdd) {
    const columns = await db.execute(`PRAGMA table_info(${table})`);
    const existingNames = columns.rows.map(col => col.name);

    for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
      if (!existingNames.includes(columnName)) {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnName} ${columnDef}`);
      }
    }
  }
}

module.exports = { db, initDb };