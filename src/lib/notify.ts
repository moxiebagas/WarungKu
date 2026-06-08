import "server-only";
import { sendWhatsappToGroup } from "./fonnte";
import { formatQty } from "./format";
import type { MovementResult } from "./stock-core";

/** The configured WhatsApp group target for summaries and alerts. */
export function getGroupId(): string | null {
  return process.env.WHATSAPP_GROUP_ID || null;
}

/** Send a message to the configured group. No-op (logged) if unconfigured. */
export async function notifyGroup(message: string): Promise<void> {
  const groupId = getGroupId();
  if (!groupId) {
    console.warn("[notify] WHATSAPP_GROUP_ID belum di-set — pesan grup dilewati");
    return;
  }
  const res = await sendWhatsappToGroup(groupId, message);
  if (!res.ok) console.error("[notify] gagal kirim ke grup", { error: res.error });
}

/**
 * Fire a low-stock alert when a movement causes stock to cross at/below the
 * minimum threshold. Only alerts on the crossing transaction (before > min,
 * after <= min) to avoid repeated alerts on every subsequent sale.
 * Never throws — alerting must not break the transaction.
 */
export async function maybeSendLowStockAlert(r: MovementResult): Promise<void> {
  try {
    const crossed = r.stockBefore > r.minStock && r.stockAfter <= r.minStock;
    if (!crossed) return;

    const msg = `⚠️ Stok ${r.productName} mencapai batas minimum. Sisa stok saat ini: ${formatQty(
      r.stockAfter
    )}.`;

    console.log("[notify] low stock alert", {
      product: r.productName,
      stockAfter: r.stockAfter,
      minStock: r.minStock,
    });
    await notifyGroup(msg);
  } catch (err) {
    console.error("[notify] low stock alert error", err);
  }
}
