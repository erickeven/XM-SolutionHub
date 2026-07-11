import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'node:path';
import { AppError } from '../../lib/errors';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new AppError(1003, `File extension not allowed: ${ext}`, 400));
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new AppError(1003, `MIME type not allowed: ${file.mimetype}`, 400));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

// Magic bytes validation for uploaded file buffer
export function validateMagicBytes(buffer: Buffer, mimeType: string): void {
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isOle =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1;

  if (mimeType === 'application/pdf') {
    // PDF files start with %PDF
    const header = buffer.subarray(0, 4).toString('ascii');
    if (header !== '%PDF') {
      throw new AppError(1003, 'File content does not match MIME type (expected PDF)', 400);
    }
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    if (!isZip) {
      throw new AppError(1003, 'File content does not match MIME type (expected Office ZIP)', 400);
    }
  }

  if (mimeType === 'application/msword' || mimeType === 'application/vnd.ms-excel') {
    if (!isOle) {
      throw new AppError(1003, 'File content does not match MIME type (expected legacy Office)', 400);
    }
  }
}
