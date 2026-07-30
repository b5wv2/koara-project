const fs = require('fs');
const path = 'backend/src/config/initDb.js';
let content = fs.readFileSync(path, 'utf-8');

const tableDef = `
const createReportGenerationsTableQuery = \`
  CREATE TABLE IF NOT EXISTS report_generations (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
\`;

// Run initial schema DDL in a transaction`;

if (content.includes('// Run initial schema DDL in a transaction') && !content.includes('createReportGenerationsTableQuery')) {
  content = content.replace('// Run initial schema DDL in a transaction', tableDef);
  
  // Now add it to the transaction array
  const executePoint = `await pool.query(createSubscriptionAdminLogsTableQuery);`;
  const executeReplacement = `await pool.query(createSubscriptionAdminLogsTableQuery);\n    await pool.query(createReportGenerationsTableQuery);`;
  content = content.replace(executePoint, executeReplacement);
  
  fs.writeFileSync(path, content, 'utf-8');
  console.log('Database schema patched successfully.');
} else {
  console.log('Patch failed or already patched.');
}
