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

function isBrevoApiKey(pass) {
  return String(pass || '').startsWith('xkeysib-');
}

function resolveBrevoApiKey() {
  const key = process.env.BREVO_API_KEY || process.env.SMTP_PASS || '';
  return isBrevoApiKey(key) ? key : '';
}

/** Parse `Name <email@x.com>` hoặc email thuần. */
function parseFromAddress(raw, fallbackEmail) {
  const value = String(raw || '').trim();
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, '') || 'JinMath',
      email: match[2].trim(),
    };
  }
  if (value.includes('@')) {
    return { name: 'JinMath', email: value };
  }
  return {
    name: 'JinMath',
    email: fallbackEmail || 'noreply@jinmath.local',
  };
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

/** Gửi bằng Brevo HTTP API (HTTPS) — ổn định trên Railway hơn SMTP. */
async function sendMailViaBrevoApi({ to, subject, text, html }) {
  const apiKey = resolveBrevoApiKey();
  if (!apiKey) {
    const error = new Error('Brevo API key không hợp lệ (cần key dạng xkeysib-...)');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const sender = parseFromAddress(
    process.env.MAIL_FROM,
    process.env.SMTP_USER && String(process.env.SMTP_USER).includes('@')
      ? process.env.SMTP_USER
      : undefined,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    console.error('[mailer] Brevo API network error:', cause && cause.message ? cause.message : cause);
    const error = new Error('Không thể gửi email qua Brevo API');
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
    console.error('[mailer] Brevo API HTTP', response.status, detail);
    const error = new Error(`Brevo API lỗi HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.code = 'MAIL_SEND_FAILED';
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.messageId || null };
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
  // Ưu tiên HTTPS API trên cloud (Railway thường chặn SMTP outbound).
  if (resolveBrevoApiKey()) {
    return sendMailViaBrevoApi({ to, subject, text, html });
  }

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
    console.error('[mailer] SMTP error:', cause && cause.message ? cause.message : cause);
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
  isBrevoApiKey,
  isResendApiKey,
};
