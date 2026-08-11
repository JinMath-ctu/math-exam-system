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

function isResendApiKey(pass) {
  return String(pass || '').startsWith('re_');
}

/** Gửi bằng Resend HTTP API (HTTPS) — ổn định trên Railway hơn SMTP. */
async function sendMailViaResendApi({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'JinMath <onboarding@resend.dev>';

  if (!apiKey || !isResendApiKey(apiKey)) {
    const error = new Error('Resend API key không hợp lệ');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    const error = new Error('Không thể gửi email qua Resend API');
    error.code = 'MAIL_SEND_FAILED';
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (_) {
      /* ignore */
    }
    const error = new Error(`Resend API lỗi HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.code = 'MAIL_SEND_FAILED';
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.id || null };
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
  // Resend API key (re_...) → ưu tiên HTTPS API (tránh bị cloud chặn SMTP).
  if (isResendApiKey(process.env.RESEND_API_KEY || process.env.SMTP_PASS)) {
    return sendMailViaResendApi({ to, subject, text, html });
  }

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
