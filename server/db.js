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
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      reset_token_hash TEXT,
      reset_token_expires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration : ajoute les colonnes de reset si la table users existait déjà sans elles
  const columns = await db.execute("PRAGMA table_info(users)");
  const columnNames = columns.rows.map(col => col.name);

  if (!columnNames.includes('reset_token_hash')) {
    await db.execute('ALTER TABLE users ADD COLUMN reset_token_hash TEXT');
  }
  if (!columnNames.includes('reset_token_expires')) {
    await db.execute('ALTER TABLE users ADD COLUMN reset_token_expires TEXT');
  }
}

module.exports = { db, initDb };