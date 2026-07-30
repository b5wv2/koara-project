const fs = require('fs');

const path = 'backend/src/routes/admin.js';
let content = fs.readFileSync(path, 'utf-8');

// 1. Update GET /subscriptions query
const oldQuery = `      SELECT sub.*, s.store_name, s.subdomain, u.name AS owner_name, u.id AS owner_id, u.email AS owner_email 
      FROM subscriptions sub
      JOIN stores s ON s.id = sub.store_id
      JOIN users u ON u.id = s.owner_id
      ORDER BY sub.created_at DESC`;

const newQuery = `      SELECT 
        s.id as store_id,
        s.store_name, 
        s.subdomain, 
        u.name AS owner_name, 
        u.id AS owner_id, 
        u.email AS owner_email,
        COALESCE(sub.plan, 'basic') as plan,
        COALESCE(sub.status, 'free') as status,
        sub.expires_at,
        sub.starts_at,
        sub.id as subscription_id
      FROM stores s
      JOIN users u ON u.id = s.owner_id
      LEFT JOIN subscriptions sub ON sub.store_id = s.id
      ORDER BY s.created_at DESC`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  console.log('Query replaced successfully.');
} else {
  console.log('Old query not found!');
}

// 2. Update POST /subscriptions/grant signature and duration logic
const oldGrantSignature = `const { storeId, plan, duration, action, reason } = req.body;`;
const newGrantSignature = `const { storeId, plan, durationValue, durationUnit, action, reason } = req.body;`;

if (content.includes(oldGrantSignature)) {
  content = content.replace(oldGrantSignature, newGrantSignature);
  console.log('Grant signature replaced successfully.');
} else {
  console.log('Grant signature not found!');
}

const oldDurationLogic = `      let intervalStr = null;
      switch (duration) {
        case '1 Minute': intervalStr = "1 minute"; break;
        case '5 Minutes': intervalStr = "5 minutes"; break;
        case '1 Hour': intervalStr = "1 hour"; break;
        case '1 Day': intervalStr = "1 day"; break;
        case '7 Days': intervalStr = "7 days"; break;
        case '30 Days': intervalStr = "30 days"; break;
        case '90 Days': intervalStr = "90 days"; break;
        case '1 Year': intervalStr = "1 year"; break;
        case 'Lifetime': intervalStr = null; break; // null means no expiration
        default: 
          if (action !== 'Cancel') return res.status(400).json({ error: 'Invalid duration' });
      }`;

const newDurationLogic = `      let intervalStr = null;
      if (durationUnit === 'Lifetime') {
        intervalStr = null;
      } else if (action !== 'Cancel') {
        if (!durationValue || !durationUnit) {
          return res.status(400).json({ error: 'Invalid duration parameters' });
        }
        const val = parseInt(durationValue, 10);
        if (isNaN(val) || val <= 0) return res.status(400).json({ error: 'Duration value must be positive' });
        
        switch (durationUnit) {
          case 'Minutes': intervalStr = \`\${val} minutes\`; break;
          case 'Hours': intervalStr = \`\${val} hours\`; break;
          case 'Days': intervalStr = \`\${val} days\`; break;
          case 'Weeks': intervalStr = \`\${val} weeks\`; break;
          case 'Months': intervalStr = \`\${val} months\`; break;
          case 'Years': intervalStr = \`\${val} years\`; break;
          default: return res.status(400).json({ error: 'Invalid duration unit' });
        }
      }`;

if (content.includes(oldDurationLogic)) {
  content = content.replace(oldDurationLogic, newDurationLogic);
  console.log('Duration logic replaced successfully.');
} else {
  console.log('Duration logic not found!');
}

fs.writeFileSync(path, content, 'utf-8');
