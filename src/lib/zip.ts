import { crc32 } from "zlib";

/**
 * A minimal ZIP writer.
 *
 * WHY NOT A LIBRARY. This is about a hundred lines of a format that has not
 * changed since 1993, against a dependency in the tree of an application that
 * handles bank statements and tax returns. The zip is assembled from files a
 * lender will open, so the supply chain matters more here than the line count
 * saved.
 *
 * STORED, NOT DEFLATED. Every file going into a lender package is a PDF, a JPEG
 * or an office document — all already compressed. Deflating them again would
 * spend CPU to save low single-digit percentages, and would double the amount of
 * this format that has to be correct. The one uncompressed member is the
 * manifest, and a text file measured in bytes is not worth a compressor.
 *
 * Everything is buffered in memory. A package is a handful of documents capped
 * at 25MB each by the bucket, which is comfortable; if that stops being true,
 * this wants to become a stream rather than growing a chunking scheme.
 */

export interface ZipEntry {
  /** Path inside the archive. Forward slashes, no leading slash. */
  name: string;
  data: Uint8Array;
  /** Defaults to now. Zip stores local time with 2-second granularity. */
  modified?: Date;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

/** No compression. The only method every unzip implementation agrees on. */
const METHOD_STORE = 0;

/**
 * Bit 11 of the general purpose flags: filename is UTF-8.
 *
 * Without it a lender's copy of Windows reads the name in its own code page,
 * and "Bank Statements — 6 Months.pdf" arrives mojibake. The em dash is ours,
 * so this is not hypothetical.
 */
const FLAG_UTF8 = 0x0800;

export function createZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const checksum = crc32(data);
    const { time, date } = toDosDateTime(entry.modified ?? new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_HEADER, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(METHOD_STORE, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18); // compressed
    local.writeUInt32LE(data.length, 22); // uncompressed — identical when stored
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // no extra field

    chunks.push(local, nameBytes, data);

    const entryHeader = Buffer.alloc(46);
    entryHeader.writeUInt32LE(CENTRAL_HEADER, 0);
    entryHeader.writeUInt16LE(20, 4); // version made by
    entryHeader.writeUInt16LE(20, 6); // version needed
    entryHeader.writeUInt16LE(FLAG_UTF8, 8);
    entryHeader.writeUInt16LE(METHOD_STORE, 10);
    entryHeader.writeUInt16LE(time, 12);
    entryHeader.writeUInt16LE(date, 14);
    entryHeader.writeUInt32LE(checksum, 16);
    entryHeader.writeUInt32LE(data.length, 20);
    entryHeader.writeUInt32LE(data.length, 24);
    entryHeader.writeUInt16LE(nameBytes.length, 28);
    entryHeader.writeUInt16LE(0, 30); // extra field length
    entryHeader.writeUInt16LE(0, 32); // comment length
    entryHeader.writeUInt16LE(0, 34); // disk number
    entryHeader.writeUInt16LE(0, 36); // internal attributes
    entryHeader.writeUInt32LE(0, 38); // external attributes
    entryHeader.writeUInt32LE(offset, 42); // where the local header sits

    central.push(entryHeader, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }

  const centralBuffer = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16); // central directory starts after the data
  end.writeUInt16LE(0, 20); // no archive comment

  return Buffer.concat([...chunks, centralBuffer, end]);
}

/**
 * MS-DOS date and time, which is what the format still stores.
 *
 * Two-second granularity, and the year is an offset from 1980 — so anything
 * earlier cannot be represented and is clamped rather than wrapping into a
 * nonsense date.
 */
function toDosDateTime(value: Date): { time: number; date: number } {
  const year = Math.max(1980, value.getFullYear());

  const time =
    (value.getHours() << 11) |
    (value.getMinutes() << 5) |
    (Math.floor(value.getSeconds() / 2) & 0x1f);

  const date =
    ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate();

  return { time, date };
}

/**
 * Make a string safe as a filename on every operating system a lender might use.
 *
 * Windows is the strict one: it rejects \ / : * ? " < > | outright, and trailing
 * dots and spaces disappear silently, which turns two differently named files
 * into one and loses a document from the package.
 *
 * ASCII ONLY, AND NOT OUT OF CAUTION. The UTF-8 flag above is set correctly and
 * modern tools honour it, but testing this writer with Info-ZIP's `unzip` — the
 * one on most Linux boxes — showed it ignoring the flag and re-encoding the
 * bytes: an em dash came out the far end as Cyrillic. These files go to a
 * stranger's computer running software we will never see, and a filename is not
 * worth being clever about. Curly quotes, dashes and accents are folded to their
 * plain equivalents; anything else unrepresentable is dropped.
 */
export function safeFileName(value: string, fallback = "document"): string {
  const cleaned = value
    // Normalise accents apart from their base letters, then drop the marks —
    // "Peña" becomes "Pena" rather than "Pea".
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―]/g, "-") // dashes of every width
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, "") // anything still not plain ASCII
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");

  return cleaned.slice(0, 120) || fallback;
}
