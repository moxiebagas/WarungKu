import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/wa/handler";
import { sendWhatsappMessage } from "@/lib/fonnte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Extract { sender, message } from whatever shape Fonnte POSTs. */
async function readPayload(
  req: Request
): Promise<{ sender?: string; message?: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return {
      sender: body.sender ?? body.from ?? body.phone,
      message: body.message ?? body.text ?? body.body,
    };
  }

  // form-urlencoded or multipart
  const form = await req.formData().catch(() => null);
  if (form) {
    return {
      sender: (form.get("sender") ?? form.get("from") ?? form.get("phone"))?.toString(),
      message: (form.get("message") ?? form.get("text") ?? form.get("body"))?.toString(),
    };
  }
  return {};
}

/** Normalize a phone to digits only (international format, no `+`). */
function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    const { sender, message } = await readPayload(req);

    if (!sender || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid payload" },
        { status: 400 }
      );
    }

    const phone = normalizePhone(sender);
    if (!phone) {
      return NextResponse.json({ ok: false, error: "invalid sender" }, { status: 400 });
    }

    const reply = await handleIncomingMessage(phone, message);

    if (reply) {
      await sendWhatsappMessage(phone, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fonnte webhook] error", err);
    // Always return 200-ish so Fonnte does not hammer retries on our bugs.
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 200 });
  }
}

// Convenience GET for a quick "is it alive?" check in the browser.
export async function GET() {
  return NextResponse.json({ ok: true, service: "fonnte-webhook" });
}
