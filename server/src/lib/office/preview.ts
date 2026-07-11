import { inflateRawSync } from 'node:zlib';

const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const LEGACY_WORD_MIME = 'application/msword';
const LEGACY_EXCEL_MIME = 'application/vnd.ms-excel';

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

export function isOfficeMime(mimeType: string): boolean {
  return [WORD_MIME, EXCEL_MIME, LEGACY_WORD_MIME, LEGACY_EXCEL_MIME].includes(mimeType);
}

export function createOfficeTextPreview(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  limited = false,
): Buffer {
  const text = extractOfficeText(buffer, mimeType);
  const content = text.trim()
    ? buildPreviewText(originalName, text, limited)
    : buildPreviewText(
        originalName,
        '该 Office 文件暂无法抽取可读文本，可下载原文件查看。',
        limited,
      );
  return Buffer.from(content, 'utf8');
}

export function getLimitedOfficePreviewStorageKey(fullPreviewStorageKey: string): string {
  return fullPreviewStorageKey.endsWith('.txt')
    ? `${fullPreviewStorageKey.slice(0, -4)}.limited.txt`
    : `${fullPreviewStorageKey}.limited.txt`;
}

function extractOfficeText(buffer: Buffer, mimeType: string): string {
  try {
    if (mimeType === WORD_MIME) {
      const documentXml = readZipEntry(buffer, 'word/document.xml');
      return documentXml ? extractDocxText(documentXml.toString('utf8')) : '';
    }

    if (mimeType === EXCEL_MIME) {
      return extractXlsxText(buffer);
    }

    if (mimeType === LEGACY_WORD_MIME || mimeType === LEGACY_EXCEL_MIME) {
      return extractLegacyOfficeText(buffer);
    }
  } catch {
    return '';
  }

  return '';
}

function buildPreviewText(originalName: string, text: string, limited: boolean): string {
  const normalizedLines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const lines = limited ? normalizedLines.slice(0, 120) : normalizedLines;
  const body = lines.join('\n');
  const visibleBody = limited ? body.slice(0, 12000) : body;

  return [
    `文件：${originalName}`,
    limited
      ? '预览：以下为前 3 页等量的文档文本内容，登录后可查看完整内容。'
      : '预览：以下为系统抽取的完整文档文本内容。',
    '',
    visibleBody,
  ]
    .join('\n');
}

function extractLegacyOfficeText(buffer: Buffer): string {
  const utf16Text = buffer.toString('utf16le');
  const latinText = buffer.toString('latin1');
  const runs = [
    ...extractReadableRuns(utf16Text, 4),
    ...extractReadableRuns(latinText, 6),
  ];
  return Array.from(new Set(runs)).join('\n');
}

function extractReadableRuns(value: string, minimumLength: number): string[] {
  const pattern = new RegExp(
    `[\\p{L}\\p{N}\\p{P}\\p{Zs}\\t]{${minimumLength},}`,
    'gu',
  );
  return [...value.matchAll(pattern)]
    .map((match) => match[0].replace(/\s+/g, ' ').trim())
    .filter((text) => text.length >= minimumLength && /[\p{L}\p{N}]/u.test(text));
}

function extractDocxText(xml: string): string {
  return xmlToText(
    xml
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n'),
  );
}

function extractXlsxText(buffer: Buffer): string {
  const sharedStringsXml = readZipEntry(buffer, 'xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const rows: string[] = [];

  for (const entry of listZipEntries(buffer)) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) continue;
    const sheetBuffer = readZipEntry(buffer, entry.name);
    if (!sheetBuffer) continue;
    const sheetText = extractSheetText(sheetBuffer.toString('utf8'), sharedStrings);
    if (sheetText) rows.push(sheetText);
  }

  return rows.join('\n\n');
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => xmlToText(match[0]));
}

function extractSheetText(xml: string, sharedStrings: string[]): string {
  const rows: string[] = [];
  for (const rowMatch of xml.matchAll(/<row\b[\s\S]*?<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[0].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] ?? '';
      const body = cellMatch[2] ?? '';
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '';
      if (type === 's') {
        cells.push(sharedStrings[Number(rawValue)] ?? rawValue);
      } else if (type === 'inlineStr') {
        cells.push(xmlToText(body));
      } else {
        cells.push(decodeXmlEntities(rawValue));
      }
    }
    const row = cells.map((cell) => cell.trim()).filter(Boolean).join('\t');
    if (row) rows.push(row);
  }
  return rows.join('\n');
}

function xmlToText(xml: string): string {
  return decodeXmlEntities(xml.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function listZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) return [];

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');
    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entryName: string): Buffer | null {
  const entry = listZipEntries(buffer).find((item) => item.name === entryName);
  if (!entry) return null;
  const localOffset = entry.localHeaderOffset;
  if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    return null;
  }

  const fileNameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const data = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRawSync(data);
  return null;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}
