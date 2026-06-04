import "server-only";

const FONNTE_SEND_URL = "https://api.fonnte.com/send";

export interface SendResult {
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}

/**
 * Send a WhatsApp message through the Fonnte gateway.
 * Phone number should be in international format without `+` (e.g. 6281234567890).
 */
export async function sendWhatsappMessage(
  phoneNumber: string,
  message: string
): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.error("[fonnte] FONNTE_TOKEN belum di-set");
    return { ok: false, error: "FONNTE_TOKEN missing" };
  }

  try {
    const res = await fetch(FONNTE_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: phoneNumber,
        message,
        countryCode: "62",
      }),
    });

    const body = await res.json().catch(() => null);

    // Fonnte replies with HTTP 200 even on logical failures (invalid token,
    // disconnected device, target not allowed on a free account, etc.). The
    // real outcome is in the `status` field of the JSON body.
    const apiStatus = (body as { status?: unknown })?.status;
    const ok = res.ok && apiStatus !== false;

    if (!ok) {
      console.error(
        "[fonnte] send failed",
        JSON.stringify({ httpStatus: res.status, body, target: phoneNumber })
      );
      return { ok: false, status: res.status, body };
    }

    console.log(
      "[fonnte] send ok",
      JSON.stringify({ target: phoneNumber, body })
    );
    return { ok: true, status: res.status, body };
  } catch (err) {
    console.error("[fonnte] send error", err);
    return { ok: false, error: (err as Error).message };
  }
}
