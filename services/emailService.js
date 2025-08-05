import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import db from '../db/database.js';

dotenv.config();

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  verification: (name, verificationLink) => ({
    subject: 'Verify your email - Resume Parser',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
    text: `
      Hi ${name || 'there'},
      
      Thanks for signing up! Please verify your email address by visiting:
      ${verificationLink}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `
  }),
  
  welcome: (name) => ({
    subject: 'Welcome to Resume Parser!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Resume Parser!</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2>Hi ${name},</h2>
          <p>Your email has been verified successfully!</p>
          <p>You can now:</p>
          <ul>
            <li>Upload and parse resumes</li>
            <li>Apply for jobs with smart matching</li>
            <li>Track your applications</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" 
               style="background: #21B573; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `,
    text: `
      Hi ${name},
      
      Your email has been verified successfully!
      
      You can now login and start using Resume Parser.
      
      Go to: ${process.env.FRONTEND_URL}/login
    `
  })
};

// Send email function
export const sendEmail = async (to, template, data) => {
  try {
    const emailContent = emailTemplates[template](...data);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Convenience functions
export const sendVerificationEmail = async (email, name, token) => {
  const verificationLink = `${process.env.FRONTEND_URL}/verify/${token}`;
  return sendEmail(email, 'verification', [name, verificationLink]);
};

export const sendWelcomeEmail = async (email, name) => {
  return sendEmail(email, 'welcome', [name]);
};
export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"Resume Parser" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your password - Resume Parser',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">Resume Parser - Your career advancement platform</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
export const sendApplicationStatusEmail = async (email, name, status, jobTitle, company, applicationId = null) => {
  try {
    let subject, html;
    
    if (status === 'accepted') {
      // Generate a scheduling token
      const schedulingToken = Buffer.from(`${applicationId}:${Date.now()}`).toString('base64');
      
      // Save the token to database
      await db('applications').where({ id: applicationId }).update({ 
        scheduling_token: schedulingToken 
      });
      
      // Include token in the scheduling link
      const scheduleLink = `${process.env.FRONTEND_URL}/schedule-interview/${applicationId}?token=${schedulingToken}`;
      
      subject = `Congratulations! Next Steps - ${jobTitle} at ${company}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎉 Congratulations!</h1>
          </div>
          <div style="padding: 30px; background: #f5f5f5;">
            <p>Dear ${name},</p>
            <p>We are pleased to inform you that your application for the <strong>${jobTitle}</strong> position at <strong>${company}</strong> has been successful!</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #21B573;">Next Step: Schedule Your Interview</h3>
              <p>Click the button below to view available time slots and book your interview:</p>
              <a href="${scheduleLink}" style="display: inline-block; background: #21B573; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">
                Schedule Interview 📅
              </a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break: break-all; color: #666;">${scheduleLink}</p>
            
            <p>Best regards,<br>${company} Team</p>
          </div>
        </div>
      `;
    } else {
      // Rejection email stays the same
      subject = `Application Update - ${jobTitle} at ${company}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ED6663; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Application Update</h1>
          </div>
          <div style="padding: 30px; background: #f5f5f5;">
            <p>Dear ${name},</p>
            <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${company}</strong>.</p>
            <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
            <p>We were impressed by your background and encourage you to apply for future openings that match your skills and experience.</p>
            <p>Best regards,<br>${company} Team</p>
          </div>
        </div>
      `;
    }

    const info = await transporter.sendMail({
      from: `"${company}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html
    });

    console.log('Application status email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending application status email:', error);
    throw error;
  }
};
export const sendInterviewConfirmationEmail = async (email, name, jobTitle, company, interviewDate, interviewTime, location) => {
  try {
    const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const subject = `Interview Confirmation - ${jobTitle} at ${company}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #21B573; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Interview Scheduled ✅</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <p>Dear ${name},</p>
          <p>Your interview has been successfully scheduled!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #21B573; margin-top: 0;">Interview Details:</h3>
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

    const info = await transporter.sendMail({
      from: `"${company}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html
    });

    console.log('Interview confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending interview confirmation email:', error);
    throw error;
  }
};