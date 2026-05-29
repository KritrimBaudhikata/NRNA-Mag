import { readFile } from "fs/promises";
import { head } from "@vercel/blob";

export async function getPdfBuffer(): Promise<Buffer> {
  const blobPath = process.env.PDF_BLOB_PATH;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobPath && token) {
    const meta = await head(blobPath, { token });
    const res = await fetch(meta.url);
    if (!res.ok) throw new Error("Failed to fetch PDF from blob storage");
    return Buffer.from(await res.arrayBuffer());
  }

  const localPath = process.env.PDF_LOCAL_PATH;
  if (!localPath) {
    throw new Error("PDF_LOCAL_PATH or Blob storage must be configured");
  }
  return readFile(localPath);
}
