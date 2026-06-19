const Database = require('better-sqlite3');
const db = new Database('loans.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS borrowers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    loan_amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
  );
`);

module.exports = db;