import path from 'node:path';
import { Router } from 'express';
import { getStorageAdapter } from '../../lib/storage';
import { verifyStorageToken } from '../../lib/storage/signed-token';

const router: Router = Router();

function getContentType(storageKey: string): string {
  const extension = path.extname(storageKey).toLowerCase();
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.doc') return 'application/msword';
  if (extension === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (extension === '.xls') return 'application/vnd.ms-excel';
  if (extension === '.xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (extension === '.txt') return 'text/plain; charset=utf-8';
  if (extension === '.zip') return 'application/zip';
  return 'application/octet-stream';
}

router.get('/:token', async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!token) {
      res.status(400).json({ code: 1002, message: 'Missing file token', data: null });
      return;
    }

    const payload = verifyStorageToken(token);
    const file = await getStorageAdapter().getObject(payload.key);
    const filename = path.basename(payload.key).replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', getContentType(payload.key));
    res.setHeader('Content-Length', String(file.length));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${payload.disposition}; filename="${filename}"`,
    );
    res.status(200).send(file);
  } catch (error) {
    next(error);
  }
});

export default router;
