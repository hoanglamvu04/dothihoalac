import path from 'node:path';
import fs from 'node:fs/promises';
import { env } from './env.js';

export const projectRoot = path.resolve(process.cwd());
export const uploadRoot = path.resolve(projectRoot, env.UPLOAD_DIR);

export async function ensureStorageDirectories() {
  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.mkdir(path.resolve(projectRoot, 'logs'), { recursive: true });
}
