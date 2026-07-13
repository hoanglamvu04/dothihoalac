import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter;
function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

async function renderTemplate(name, variables = {}) {
  const file = path.resolve(process.cwd(), 'src', 'templates', 'emails', `${name}.html`);
  let html = await fs.readFile(file, 'utf8');
  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, String(value ?? ''));
  }
  return html;
}

export async function sendEmail({ to, subject, template, variables, text }) {
  const transport = getTransporter();
  const html = template ? await renderTemplate(template, variables) : undefined;
  if (!transport) {
    logger.info({ to, subject, variables }, 'Email skipped because SMTP is not configured');
    return { skipped: true };
  }
  return transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
}
