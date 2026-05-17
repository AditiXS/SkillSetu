require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testConnection() {
  try {
    console.log("Verifying connection...");
    await transporter.verify();
    console.log("Connection verified successfully!");
    
    // Attempt to send a test email
    console.log("Attempting to send a test email...");
    let info = await transporter.sendMail({
      from: `"SkillSetu Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Test Nodemailer",
      text: "This is a test from Nodemailer",
    });
    console.log("Email sent! Message ID:", info.messageId);
  } catch (error) {
    console.error("Nodemailer error:", error);
  }
}

testConnection();
