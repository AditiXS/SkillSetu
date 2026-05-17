require('dotenv').config();

/**
 * Send an email using the SkillSetu transporter (via Brevo REST API).
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 */
const sendMail = async ({ to, subject, html }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'SkillSetu',
          email: process.env.EMAIL_USER
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        headers: {
          'X-Mailin-custom': 'trackclicks=0'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }
    
    const data = await response.json();
    console.log(`📧 Email sent to ${to}: "${subject}"`, data);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}: "${subject}"`, error);
  }
};

// ─── Email Templates ────────────────────────────────────────────────────────

const emailWrapper = (content) => `
  <div style="font-family: 'Inter', -apple-system, sans-serif; background: #fafafa; padding: 40px 0;">
    <div style="max-width: 560px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="padding: 30px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
        <h1 style="color: #0a0a0a; margin: 0; font-size: 24px; letter-spacing: -0.03em;">SkillSetu</h1>
        <p style="color: #606060; margin: 6px 0 0; font-size: 13px;">Exchange Skills, Not Money.</p>
      </div>
      <div style="padding: 36px 40px; color: #3a3a3a; font-size: 15px; line-height: 1.7;">
        ${content}
      </div>
      <div style="padding: 20px 40px; text-align: center; font-size: 12px; color: #808080; border-top: 1px solid #f0f0f0; background: #fafafa;">
        © ${new Date().getFullYear()} SkillSetu · All rights reserved
      </div>
    </div>
  </div>
`;

const templates = {
  welcome: (name) => ({
    subject: 'Welcome to SkillSetu',
    html: emailWrapper(`
      <h2 style="color: #0a0a0a; margin-top: 0; font-size: 20px;">Hi ${name},</h2>
      <p>Welcome aboard! You've successfully joined <strong>SkillSetu</strong> — a platform where people learn, teach, and grow together.</p>
      <p>Here's what you can do right now:</p>
      <ul style="padding-left: 20px; color: #3a3a3a;">
        <li>Explore the Marketplace to find mentors</li>
        <li>Complete your profile with your skills</li>
        <li>Join a Community in your domain</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
      </div>
    `),
  }),

  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request',
    html: emailWrapper(`
      <h2 style="color: #0a0a0a; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
      <p>We received a request to reset your SkillSetu password. Please copy and paste the link below into your browser to set a new password:</p>
      
      <div style="background: #fafafa; padding: 16px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 24px 0; word-break: break-all;">
        <span style="font-family: monospace; font-size: 13px; color: #0a0a0a;">${resetUrl}</span>
      </div>

      <p style="font-size: 13px; color: #606060;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    `),
  }),

  sessionRequest: (mentorName, learnerName, topic) => ({
    subject: 'New Session Request',
    html: emailWrapper(`
      <h2 style="color: #0a0a0a; margin-top: 0; font-size: 20px;">Hi ${mentorName},</h2>
      <p><strong>${learnerName}</strong> wants to connect with you for a session.</p>
      <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #0a0a0a;">
        <p style="margin: 0;"><strong>Topic:</strong> ${topic}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/requests" style="background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">View Request</a>
      </div>
    `),
  }),

  sessionAccepted: (learnerName, mentorName, topic, scheduledDate) => ({
    subject: 'Your Session Request Was Accepted',
    html: emailWrapper(`
      <h2 style="color: #0a0a0a; margin-top: 0; font-size: 20px;">Great news, ${learnerName}!</h2>
      <p><strong>${mentorName}</strong> has accepted your session request.</p>
      <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #0a0a0a;">
        <p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${topic}</p>
        <p style="margin: 0;"><strong>Scheduled:</strong> ${new Date(scheduledDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/sessions" style="background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">View Session</a>
      </div>
    `),
  }),

  sessionCompleted: (recipientName, topic, sessionId) => ({
    subject: 'Session Complete — Leave a Rating',
    html: emailWrapper(`
      <h2 style="color: #0a0a0a; margin-top: 0; font-size: 20px;">Session Completed</h2>
      <p>Hi ${recipientName}, your session on <strong>"${topic}"</strong> has been marked as complete.</p>
      <p>Your feedback helps the SkillSetu community grow. Please take a moment to rate your experience.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/session/${sessionId}" style="background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Rate My Session</a>
      </div>
    `),
  }),
};

module.exports = { sendMail, templates };
