import { describe, expect, it } from 'vitest';
import { createZipArchive } from '../archive/zip';
import {
  createOfficeTextPreview,
  getLimitedOfficePreviewStorageKey,
} from './preview';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function createDocx(paragraphs: string[]): Buffer {
  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    ...paragraphs.map((paragraph) => `<w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>`),
    '</w:body></w:document>',
  ].join('');
  return createZipArchive([
    { filename: 'word/document.xml', data: Buffer.from(documentXml, 'utf8') },
  ]);
}

describe('Office preview derivation', () => {
  it('creates a limited anonymous preview and a full authenticated preview', () => {
    const paragraphs = Array.from({ length: 160 }, (_, index) => `Paragraph ${index + 1}`);
    const document = createDocx(paragraphs);

    const limited = createOfficeTextPreview(document, DOCX_MIME, 'example.docx', true).toString();
    const full = createOfficeTextPreview(document, DOCX_MIME, 'example.docx').toString();

    expect(limited).toContain('前 3 页等量');
    expect(limited).toContain('Paragraph 120');
    expect(limited).not.toContain('Paragraph 121');
    expect(full).toContain('完整文档文本');
    expect(full).toContain('Paragraph 160');
    expect(full.length).toBeGreaterThan(limited.length);
  });

  it('derives a separate storage key for the anonymous preview', () => {
    expect(getLimitedOfficePreviewStorageKey('previews/example.docx.txt')).toBe(
      'previews/example.docx.limited.txt',
    );
  });

  it('keeps all Excel rows for authenticated preview', () => {
    const rows = Array.from(
      { length: 160 },
      (_, index) => `<row><c t="inlineStr"><is><t>Row ${index + 1}</t></is></c></row>`,
    ).join('');
    const workbook = createZipArchive([
      {
        filename: 'xl/worksheets/sheet1.xml',
        data: Buffer.from(`<worksheet><sheetData>${rows}</sheetData></worksheet>`, 'utf8'),
      },
    ]);

    const limited = createOfficeTextPreview(workbook, XLSX_MIME, 'example.xlsx', true).toString();
    const full = createOfficeTextPreview(workbook, XLSX_MIME, 'example.xlsx').toString();

    expect(limited).toContain('Row 120');
    expect(limited).not.toContain('Row 121');
    expect(full).toContain('Row 160');
  });
});
