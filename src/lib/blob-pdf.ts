import { access, readFile } from "fs/promises";
import { constants } from "fs";
import { isAbsolute, join } from "path";
import { head } from "@vercel/blob";

const DEFAULT_PDF_NAMES = [
  "NRNA HK Everest Day_2.pdf",
  "NRNA_HK_EverestDay_2.pdf",
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalPdfPath(): Promise<string> {
  const configured = process.env.PDF_LOCAL_PATH?.trim();
  const candidates: string[] = [];

  if (configured) {
    candidates.push(
      isAbsolute(configured)
        ? configured
        : join(/* turbopackIgnore: true */ process.cwd(), configured),
    );
  }

  for (const name of DEFAULT_PDF_NAMES) {
    candidates.push(join(/* turbopackIgnore: true */ process.cwd(), name));
  }

  for (const path of candidates) {
    if (await fileExists(path)) return path;
  }

  const tried = candidates.join(", ");
  throw new Error(
    `PDF not found. Set PDF_LOCAL_PATH in .env.local (tried: ${tried})`,
  );
}

export async function getPdfBuffer(): Promise<Buffer> {
  const blobPath = process.env.PDF_BLOB_PATH;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobPath && token) {
    const meta = await head(blobPath, { token });
    const res = await fetch(meta.url);
    if (!res.ok) throw new Error("Failed to fetch PDF from blob storage");
    return Buffer.from(await res.arrayBuffer());
  }

  const localPath = await resolveLocalPdfPath();
  return readFile(localPath);
}
