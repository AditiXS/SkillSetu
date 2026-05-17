require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email using the SkillSetu transporter.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 */
const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"SkillSetu" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: "${subject}"`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}: "${subject}"`, error);
  }
};

// ─── Email Templates ────────────────────────────────────────────────────────

const emailWrapper = (content) => `
  <div style="font-family: 'Segoe UI', sans-serif; background: #0f0f0f; padding: 40px 0;">
    <div style="max-width: 560px; margin: auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 28px; letter-spacing: 1px;">SkillSetu</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">Learn. Teach. Grow.</p>
      </div>
      <div style="padding: 36px 40px; color: #ccc; font-size: 15px; line-height: 1.7;">
        ${content}
      </div>
      <div style="padding: 20px 40px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #2a2a4a;">
        © ${new Date().getFullYear()} SkillSetu · All rights reserved
      </div>
    </div>
  </div>
`;

const templates = {
  welcome: (name) => ({
    subject: '🎉 Welcome to SkillSetu!',
    html: emailWrapper(`
      <h2 style="color: #fff; margin-top: 0;">Hi ${name}! 👋</h2>
      <p>Welcome aboard! You've successfully joined <strong style="color: #667eea;">SkillSetu</strong> — a platform where people learn, teach, and grow together.</p>
      <p>Here's what you can do right now:</p>
      <ul style="padding-left: 20px;">
        <li>🔍 <strong>Explore the Marketplace</strong> to find mentors</li>
        <li>✍️ <strong>Complete your profile</strong> with your skills</li>
        <li>💬 <strong>Join a Community</strong> in your domain</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard →</a>
      </div>
      <p style="font-size: 13px; color: #888;">You received this because you signed up at SkillSetu.</p>
    `),
  }),

  passwordReset: (resetUrl) => ({
    subject: '🔒 Password Reset Request',
    html: emailWrapper(`
      <h2 style="color: #fff; margin-top: 0;">Reset Your Password</h2>
      <p>We received a request to reset your SkillSetu password. Click the button below to set a new one.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password →</a>
      </div>
      <p style="font-size: 13px; color: #888;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    `),
  }),

  sessionRequest: (mentorName, learnerName, topic) => ({
    subject: '📬 New Session Request!',
    html: emailWrapper(`
      <h2 style="color: #fff; margin-top: 0;">Hi ${mentorName},</h2>
      <p><strong style="color: #667eea;">${learnerName}</strong> wants to connect with you for a session.</p>
      <div style="background: #0f0f1a; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
        <p style="margin: 4px 0;"><strong style="color: #fff;">Topic:</strong> ${topic}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/requests" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">View Request →</a>
      </div>
      <p style="font-size: 13px; color: #888;">You can accept or decline this request from your dashboard.</p>
    `),
  }),

  sessionAccepted: (learnerName, mentorName, topic, scheduledDate) => ({
    subject: '✅ Your Session Request Was Accepted!',
    html: emailWrapper(`
      <h2 style="color: #fff; margin-top: 0;">Great news, ${learnerName}! 🎉</h2>
      <p><strong style="color: #667eea;">${mentorName}</strong> has accepted your session request.</p>
      <div style="background: #0f0f1a; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
        <p style="margin: 4px 0;"><strong style="color: #fff;">Topic:</strong> ${topic}</p>
        <p style="margin: 4px 0;"><strong style="color: #fff;">Scheduled:</strong> ${new Date(scheduledDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/sessions" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">View Session →</a>
      </div>
      <p style="font-size: 13px; color: #888;">Make sure you're ready at the scheduled time. Good luck! 🚀</p>
    `),
  }),

  sessionCompleted: (recipientName, topic, sessionId) => ({
    subject: '⭐ Session Complete — Leave a Rating!',
    html: emailWrapper(`
      <h2 style="color: #fff; margin-top: 0;">Session Completed! 🏁</h2>
      <p>Hi ${recipientName}, your session on <strong style="color: #667eea;">"${topic}"</strong> has been marked as complete.</p>
      <p>Your feedback helps the SkillSetu community grow. Please take a moment to rate your experience.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/session/${sessionId}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; display: inline-block;">Rate My Session ⭐</a>
      </div>
      <p style="font-size: 13px; color: #888;">Thank you for being part of the SkillSetu community!</p>
    `),
  }),
};

module.exports = { sendMail, templates };
