'use strict';

const nodemailer = require('nodemailer');

let cachedTransporter = null;

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_USER
    && process.env.SMTP_PASS,
  );
}

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (isSmtpConfigured()) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Tránh form "quay mãi" khi SMTP bị firewall/chặn cổng trên cloud.
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
    });
    return cachedTransporter;
  }

  const error = new Error('SMTP is not configured');
  error.code = 'MAIL_NOT_CONFIGURED';
  throw error;
}

async function sendMail({ to, subject, text, html }) {
  const transporter = await getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@math-exam.local';

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  } catch (cause) {
    const error = new Error('Không thể gửi email qua SMTP');
    error.code = 'MAIL_SEND_FAILED';
    error.cause = cause;
    throw error;
  }

  return {
    messageId: info.messageId,
  };
}

module.exports = {
  sendMail,
  isSmtpConfigured,
};
