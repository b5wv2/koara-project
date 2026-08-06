const fs = require('fs');
const data = JSON.parse(fs.readFileSync('audit_results.json'));

let md = '# Translation Audit Report\n\n';
md += `**Total Hardcoded Strings:** ${data.totalHardcoded}\n\n`;

for (const [file, strings] of Object.entries(data.report)) {
  const relativeFile = file.replace(/\\\\/g, '/');
  md += `### ${relativeFile}\n`;
  for (const str of strings) {
    md += `- \`${str}\`\n`;
  }
  md += '\n';
}

fs.writeFileSync('C:/Users/Ay166/.gemini/antigravity-ide/brain/fec8c592-3005-40d9-b33f-3445f3d9aa90/translation_audit.md', md);
