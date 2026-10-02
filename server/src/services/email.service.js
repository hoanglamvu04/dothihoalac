import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter;
let lastVerifiedAt = 0;
let verifyPromise = null;

const VERIFY_TTL_MS = 5 * 60 * 1000;

function hasSmtpConfig() {
  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.MAIL_FROM &&
      (!env.SMTP_USER || env.SMTP_PASS),
  );
}

function getTransporter() {
  if (!hasSmtpConfig()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    });
  }

  return transporter;
}

export function isEmailConfigured() {
  return hasSmtpConfig();
}

export async function verifyEmailDelivery() {
  const transport = getTransporter();

  if (!transport) {
    return false;
  }

  const now = Date.now();

  if (
    lastVerifiedAt > 0 &&
    now - lastVerifiedAt < VERIFY_TTL_MS
  ) {
    return true;
  }

  if (!verifyPromise) {
    verifyPromise = transport
      .verify()
      .then(() => {
        lastVerifiedAt = Date.now();
        logger.info(
          {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
          },
          'SMTP connection verified',
        );
        return true;
      })
      .catch((error) => {
        lastVerifiedAt = 0;
        logger.error(
          {
            err: error,
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
          },
          'SMTP connection verification failed',
        );
        return false;
      })
      .finally(() => {
        verifyPromise = null;
      });
  }

  return verifyPromise;
}

async function renderTemplate(name, variables = {}) {
  const file = path.resolve(
    process.cwd(),
    'src',
    'templates',
    'emails',
    `${name}.html`,
  );

  let html = await fs.readFile(file, 'utf8');

  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(
      `{{${key}}}`,
      String(value ?? ''),
    );
  }

  return html;
}

export async function sendEmail({
  to,
  subject,
  template,
  variables,
  text,
}) {
  const transport = getTransporter();
  const html = template
    ? await renderTemplate(template, variables)
    : undefined;

  if (!transport) {
    logger.warn(
      {
        to,
        subject,
      },
      'Email skipped because SMTP is not configured',
    );

    return { skipped: true };
  }

  try {
    const result = await transport.sendMail({
      from: {
        name: env.MAIL_FROM_NAME,
        address: env.MAIL_FROM,
      },
      to,
      subject,
      html,
      text,
    });

    logger.info(
      {
        to,
        subject,
        messageId: result.messageId,
      },
      'Email sent',
    );

    return {
      skipped: false,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  } catch (error) {
    logger.error(
      {
        err: error,
        to,
        subject,
      },
      'Email delivery failed',
    );

    throw error;
  }
}
