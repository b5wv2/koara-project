const db = require('./backend/src/config/db');

async function createTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        channel VARCHAR(50) DEFAULT 'email',
        success BOOLEAN DEFAULT false,
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(query);
    console.log('Successfully created notification_logs table');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createTable();
