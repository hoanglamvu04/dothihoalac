import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { uploadRoot } from '../config/storage.js';

function safeBaseName(originalName = 'file') {
  return path
    .basename(originalName)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(-100);
}

export async function saveImageBuffer(
  buffer,
  originalName,
  { ownerId, width = 1920, quality = 82 } = {},
) {
  const date = new Date();
  const folder = path.join(
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
  );
  const absoluteFolder = path.join(uploadRoot, folder);
  await fs.mkdir(absoluteFolder, { recursive: true });
  const fileName = `${ownerId || 'anonymous'}-${crypto.randomUUID()}.webp`;
  const absolutePath = path.join(absoluteFolder, fileName);
  const image = sharp(buffer, { animated: true })
    .rotate()
    .resize({ width, withoutEnlargement: true });
  const metadata = await image.metadata();
  await image.webp({ quality }).toFile(absolutePath);
  const outputMetadata = await sharp(absolutePath).metadata();
  return {
    originalName: safeBaseName(originalName),
    fileName,
    relativePath: path.posix.join(folder.split(path.sep).join('/'), fileName),
    absolutePath,
    mimeType: 'image/webp',
    width: outputMetadata.width ?? metadata.width,
    height: outputMetadata.height ?? metadata.height,
    size: (await fs.stat(absolutePath)).size,
  };
}

export async function removeStoredFile(relativePath) {
  if (!relativePath) return;
  const resolved = path.resolve(uploadRoot, relativePath);
  if (!resolved.startsWith(uploadRoot)) return;
  await fs.rm(resolved, { force: true });
}
