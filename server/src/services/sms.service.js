import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function sendSms({ phone, message }) {
  if (env.SMS_PROVIDER === 'none') {
    logger.info({ phone, message }, 'SMS skipped because provider is not configured');
    return { skipped: true };
  }
  throw new Error(
    `SMS provider ${env.SMS_PROVIDER} is not implemented. Add an adapter in sms.service.js.`,
  );
}
