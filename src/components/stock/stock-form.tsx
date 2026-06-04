"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyManualMovement } from "@/lib/actions/stock";
import { formatQty } from "@/lib/format";
import type { MovementType, Product } from "@/lib/types";

export function StockForm({ products }: { products: Product[] }) {
  const [productId, setProductId] = React.useState<string>("");
  const [movementType, setMovementType] = React.useState<MovementType>("IN");
  const [qty, setQty] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  const selected = products.find((p) => p.id === productId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await applyManualMovement({
        productId,
        movementType,
        qty: Number(qty),
        note,
      });
      if (res.ok) {
        setMessage({ ok: true, text: "Stok berhasil diperbarui." });
        setQty("");
        setNote("");
      } else {
        setMessage({ ok: false, text: res.error ?? "Gagal memperbarui stok." });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label>Barang</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih barang" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({formatQty(p.current_stock)} {p.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-muted-foreground">
            Stok saat ini: {formatQty(selected.current_stock)} {selected.unit}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jenis Pergerakan</Label>
          <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN">Masuk (tambah)</SelectItem>
              <SelectItem value="OUT">Keluar (kurangi)</SelectItem>
              <SelectItem value="ADJUSTMENT">Koreksi (set nilai)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qty">
            {movementType === "ADJUSTMENT" ? "Stok Baru" : "Jumlah"}
          </Label>
          <Input
            id="qty"
            type="number"
            min={0}
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Catatan (opsional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Misal: koreksi stok opname"
        />
      </div>

      {message && (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={pending || !productId}>
        {pending ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
