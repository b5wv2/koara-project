const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'backend/src/templates');

if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir);
  files.forEach(file => {
    if (file.endsWith('.html') && !file.endsWith('-ar.html')) {
      let content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      
      // Inject RTL
      content = content.replace(/<body/i, '<body dir="rtl" style="direction: rtl; text-align: right;"');
      
      // Simple string replacements for common English words
      content = content.replace(/Order Confirmation/g, 'تأكيد الطلب');
      content = content.replace(/Total/g, 'الإجمالي');
      content = content.replace(/Subtotal/g, 'المجموع الفرعي');
      content = content.replace(/Thank you/g, 'شكراً لك');
      content = content.replace(/View Order/g, 'عرض الطلب');
      content = content.replace(/Hi/g, 'مرحباً');
      content = content.replace(/Hello/g, 'مرحباً');
      
      fs.writeFileSync(path.join(templatesDir, file.replace('.html', '-ar.html')), content);
    }
  });
  console.log('Translated templates generated.');
}
