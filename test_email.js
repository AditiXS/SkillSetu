require('dotenv').config({ path: './server/.env' });
const { sendMail, templates } = require('./server/utils/mailer');

const testEmail = async () => {
  console.log('Testing Nodemailer connection...');
  try {
    await sendMail({
      to: 'aditisaini.aashray@gmail.com',
      subject: 'Test Email from SkillSetu',
      html: '<h1>Nodemailer is working!</h1>'
    });
    console.log('✅ Test email sent successfully.');
  } catch (err) {
    console.error('❌ Test email failed:', err.message);
  }
};

testEmail();
