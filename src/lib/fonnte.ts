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
    if (!res.ok) {
      console.error("[fonnte] send failed", res.status, body);
      return { ok: false, status: res.status, body };
    }
    return { ok: true, status: res.status, body };
  } catch (err) {
    console.error("[fonnte] send error", err);
    return { ok: false, error: (err as Error).message };
  }
}
