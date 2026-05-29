import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPdfBuffer } from "@/lib/blob-pdf";
import { COOKIE_NAME, verifyDownloadToken } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const session = await verifyDownloadToken(token);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const buffer = await getPdfBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="Everest-Day-Hong-Kong-2026.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("download-pdf", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
