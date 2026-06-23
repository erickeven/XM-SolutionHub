import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'node:path';
import { AppError } from '../../lib/errors';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
  if (mimeType === 'application/pdf') {
    // PDF files start with %PDF
    const header = buffer.subarray(0, 4).toString('ascii');
    if (header !== '%PDF') {
      throw new AppError(1003, 'File content does not match MIME type (expected PDF)', 400);
    }
  }
  // DOCX is a ZIP archive starting with PK (0x50 0x4B)
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new AppError(1003, 'File content does not match MIME type (expected DOCX/ZIP)', 400);
    }
  }
}