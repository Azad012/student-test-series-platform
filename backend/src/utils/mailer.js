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
    family: 4, // Force IPv4 (avoids IPv6 timeout on cloud hosts)
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: { user, pass },
  });
}

async function sendViaBrevo({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = process.env.SMTP_USER || process.env.EMAIL_FROM || 'no-reply@exampulse.app';
  const senderName = process.env.EMAIL_FROM_NAME || 'ExamPulse';

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Brevo email failed (${res.status}): ${errText}`);
  }
  return { sent: true, mode: 'brevo' };
}

async function sendViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'ExamPulse <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend email failed (${res.status}): ${errText}`);
  }
  return { sent: true, mode: 'resend' };
}

async function sendOtpEmail({ to, otp, purpose, name = 'Student' }) {
  const isReset = purpose === 'reset_password';
  const subject = isReset
    ? 'ExamPulse — Password Reset OTP'
    : 'ExamPulse — Verify Your Email Address';

  const actionText = isReset
    ? 'resetting your ExamPulse password'
    : 'completing your ExamPulse student registration';

  const text = `Your ExamPulse OTP for ${actionText} is: ${otp} (valid for 10 minutes).`;

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

  // 1. Prefer HTTPS Email APIs (Port 443 — never blocked on Render Free Tier)
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo({ to, subject, text, html });
  }
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, subject, text, html });
  }

  // 2. Fallback to SMTP (works locally or on paid instances with open SMTP ports)
  const transporter = getTransporter();
  if (transporter) {
    const from = process.env.SMTP_FROM || `ExamPulse <${process.env.SMTP_USER}>`;
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true, mode: 'smtp' };
  }

  // 3. Demo mode when no email provider is configured
  console.log(`[OTP DEMO MODE] (${purpose}) To: ${to} | OTP: ${otp}`);
  return { sent: true, mode: 'demo', devOtp: otp };
}

module.exports = { sendOtpEmail };
