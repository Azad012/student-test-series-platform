const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendOtpEmail({ to, otp, purpose, name = 'Student' }) {
  const isReset = purpose === 'reset_password';
  const subject = isReset
    ? 'ExamPulse — Password Reset OTP'
    : 'ExamPulse — Verify Your Email Address';

  const actionText = isReset
    ? 'resetting your ExamPulse password'
    : 'completing your ExamPulse student registration';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;">
      <div style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 12px;">⚡ ExamPulse</div>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">Hi ${name},</p>
      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
        Use the following 6-digit OTP for ${actionText}. This code is valid for <strong>10 minutes</strong>.
      </p>
      <div style="margin: 24px 0; padding: 16px; background: #EEF2FF; border: 1px dashed #4F46E5; border-radius: 10px; text-align: center;">
        <span style="font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #3730A3;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #64748B;">
        If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[OTP DEMO MODE] (${purpose}) To: ${to} | OTP: ${otp}`);
    return { sent: true, mode: 'demo', devOtp: otp };
  }

  const from = process.env.SMTP_FROM || `ExamPulse <${process.env.SMTP_USER}>`;
  await transporter.sendMail({
    from,
    to,
    subject,
    text: `Your ExamPulse OTP for ${actionText} is: ${otp} (valid for 10 minutes).`,
    html,
  });

  return { sent: true, mode: 'smtp' };
}

module.exports = { sendOtpEmail };
