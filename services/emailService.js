// server/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */
const {
  EMAIL_USER,
  EMAIL_PASS,
  FRONTEND_URL = 'https://example.com',
  SENDER_NAME = 'Recruiter Skills Insight',
} = process.env;

// Trim trailing slashes to avoid double slashes in links
const FRONTEND = String(FRONTEND_URL).replace(/\/+$/, '');

/* ------------------------------------------------------------------ *
 * Transport: Gmail over SSL (App Password required)
 * ------------------------------------------------------------------ */
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

/** Verify once at boot; prints ✅ or ❌ so you know auth is correct. */
export async function verifyEmailTransport() {
  try {
    await transporter.verify();
    console.log('✅ Email transporter verified');
  } catch (err) {
    console.error('❌ Email transporter FAILED verify:', err);
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function normalizeFrom() {
  // Many providers reject if "from" doesn't match the authenticated user
  return `${SENDER_NAME} <${EMAIL_USER}>`;
}

async function sendMailWithLogs(options) {
  const info = await transporter.sendMail({
    ...options,
    from: options.from || normalizeFrom(),
    // Enforce envelope to match Gmail user for deliverability
    envelope: { from: EMAIL_USER, to: options.to },
  });

  console.log('✉️  Email send response:', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });

  return info;
}

/* ------------------------------------------------------------------ *
 * Application status (used by Accept/Reject)
 * ------------------------------------------------------------------ */
/**
 * Send application status email.
 * Call with an object:
 *   sendApplicationStatusEmail({ to, status, applicationId, name, jobTitle, company })
 * The "accepted" version includes a CTA to the interviews page.
 */
export async function sendApplicationStatusEmail({
  to,
  status,
  applicationId,
  name,
  jobTitle,
  company,
}) {
  const subject =
    status === 'accepted'
      ? 'You’re accepted — schedule your interview'
      : status === 'rejected'
      ? 'Application update'
      : `Application status: ${status}`;

  // Frontend route for scheduling interviews
  const scheduleUrl = `${FRONTEND}/schedule-interview/${encodeURIComponent(
  applicationId ?? ''
)}`;


  const html =
    status === 'accepted'
      ? `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5">
        <h2 style="margin:0 0 8px">Congratulations${name ? ', ' + name : ''}!</h2>
        <p>Your application for <b>${jobTitle || 'the position'}</b>${
          company ? ' at <b>' + company + '</b>' : ''
        } has been <b>accepted</b>.</p>
        <p>Please pick an interview slot here:</p>
        <p>
          <a href="${scheduleUrl}" style="background:#27AE60;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
            Choose Interview Time
          </a>
        </p>
        <p style="color:#555">Or open: <br><a href="${scheduleUrl}">${scheduleUrl}</a></p>
      </div>`
      : `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5">
        <p>Hi${name ? ' ' + name : ''},</p>
        <p>Your application status for <b>${jobTitle || 'the position'}</b>${
          company ? ' at <b>' + company + '</b>' : ''
        } is: <b>${status}</b>.</p>
        <p>Thank you for your interest${
          company ? ' in ' + company : ''
        }. We appreciate the time you invested.</p>
      </div>`;

  return sendMailWithLogs({
    to,
    subject,
    html,
  });
}

/* ------------------------------------------------------------------ *
 * Account emails (verification, welcome, reset)
 * Keep signatures compatible with your existing code.
 * ------------------------------------------------------------------ */
export async function sendVerificationEmail(email, name, token) {
  const verificationLink = `${FRONTEND}/verify/${encodeURIComponent(token)}`;

  const subject = 'Verify your email - Resume Parser';
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Resume Parser</h1>
      </div>
      <div style="padding: 30px; background: #f5f5f5;">
        <h2>Hi ${name || 'there'},</h2>
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: #21B573; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    </div>
  `;
  const text = `Hi ${name || 'there'},\n\nVisit to verify: ${verificationLink}\n(This link expires in 24h)`;

  return sendMailWithLogs({ to: email, subject, html, text });
}

export async function sendWelcomeEmail(email, name) {
  const subject = 'Welcome to Resume Parser!';
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Welcome to Resume Parser!</h1>
      </div>
      <div style="padding: 30px; background: #f5f5f5;">
        <h2>Hi ${name || 'there'},</h2>
        <p>Your email has been verified successfully!</p>
        <p>You can now upload resumes, apply for jobs, and track your applications.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND}/login"
             style="background: #21B573; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  `;
  const text = `Hi ${name || 'there'},\n\nYour email is verified. Get started: ${FRONTEND}/login`;
  return sendMailWithLogs({ to: email, subject, html, text });
}

export async function sendPasswordResetEmail(email, name, resetToken) {
  const resetLink = `${FRONTEND}/reset-password/${encodeURIComponent(resetToken)}`;

  const subject = 'Reset your password - Resume Parser';
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #21B573;">Password Reset Request</h2>
      <p>Hi ${name || 'there'},</p>
      <p>You requested to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #21B573; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetLink}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    </div>
  `;
  const text = `Hi ${name || 'there'},\n\nReset your password: ${resetLink}\n(This link expires in 1 hour)`;

  return sendMailWithLogs({ to: email, subject, html, text });
}

/* ------------------------------------------------------------------ *
 * Interview confirmation (after user books)
 * ------------------------------------------------------------------ */
export async function sendInterviewConfirmationEmail(
  email,
  name,
  jobTitle,
  company,
  interviewDate,
  interviewTime,
  location
) {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Interview Confirmation - ${jobTitle} at ${company}`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Interview Scheduled ✅</h1>
      </div>
      <div style="padding: 30px; background: #f5f5f5;">
        <p>Hi ${name || 'there'},</p>
        <p>Your interview has been successfully scheduled!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Position:</strong> ${jobTitle}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${interviewTime}</p>
          <p><strong>Location:</strong> ${location || 'To be confirmed'}</p>
        </div>
        <p>Please arrive 10 minutes early. If you need to reschedule, please contact us as soon as possible.</p>
        <p>Best regards,<br>${company} Team</p>
      </div>
    </div>
  `;
  const text = `Interview booked:\n- Position: ${jobTitle}\n- Company: ${company}\n- Date: ${formattedDate}\n- Time: ${interviewTime}\n- Location: ${location || 'TBA'}`;

  return sendMailWithLogs({ to: email, subject, html, text });
}
