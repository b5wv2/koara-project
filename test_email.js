const { sendEmail } = require('./backend/src/services/emailService');

async function test() {
  try {
    const success = await sendEmail('test@example.com', 'Test Subject', 'verification-email.html', '123456');
    console.log('sendEmail returned:', success);
  } catch (error) {
    console.error('sendEmail threw an exception:');
    console.error(error);
  }
}

test();
