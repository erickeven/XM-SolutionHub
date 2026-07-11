interface ZipEntryInput {
  filename: string;
  data: Buffer;
  date?: Date;
}

interface PreparedEntry extends ZipEntryInput {
  crc32: number;
  localHeaderOffset: number;
  filenameBuffer: Buffer;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date = new Date()): { date: number; time: number } {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  return { date: dosDate, time: dosTime };
}

function createLocalHeader(entry: PreparedEntry): Buffer {
  const { date, time } = toDosDateTime(entry.date);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(entry.crc32, 14);
  header.writeUInt32LE(entry.data.length, 18);
  header.writeUInt32LE(entry.data.length, 22);
  header.writeUInt16LE(entry.filenameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function createCentralHeader(entry: PreparedEntry): Buffer {
  const { date, time } = toDosDateTime(entry.date);
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(date, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(entry.data.length, 20);
  header.writeUInt32LE(entry.data.length, 24);
  header.writeUInt16LE(entry.filenameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.localHeaderOffset, 42);
  return header;
}

function createEndRecord(entryCount: number, centralSize: number, centralOffset: number): Buffer {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

export function createZipArchive(entries: ZipEntryInput[]): Buffer {
  const prepared: PreparedEntry[] = [];
  const localParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, 'utf8');
    const preparedEntry: PreparedEntry = {
      ...entry,
      crc32: crc32(entry.data),
      localHeaderOffset: offset,
      filenameBuffer,
    };
    prepared.push(preparedEntry);

    const header = createLocalHeader(preparedEntry);
    localParts.push(header, filenameBuffer, entry.data);
    offset += header.length + filenameBuffer.length + entry.data.length;
  }

  const centralOffset = offset;
  const centralParts = prepared.flatMap((entry) => [
    createCentralHeader(entry),
    entry.filenameBuffer,
  ]);
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = createEndRecord(prepared.length, centralSize, centralOffset);

  return Buffer.concat([...localParts, ...centralParts, endRecord]);
}
