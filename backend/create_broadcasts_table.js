const db = require('./src/config/db');

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS broadcasts (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(255),
      subject VARCHAR(255),
      message TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      total_targets INTEGER DEFAULT 0,
      successful INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(query);
    console.log("Broadcasts table created successfully");
  } catch (error) {
    console.error("Error creating broadcasts table:", error);
  } finally {
    process.exit(0);
  }
}

createTable();
