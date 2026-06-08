"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const ALL = "all";

const PERIODS: { value: string; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "3month", label: "3 Bulan" },
  { value: "6month", label: "6 Bulan" },
  { value: "year", label: "Tahun Ini" },
];

export function ReportFilters({ products }: { products: Product[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const activePeriod = params.get("period") ?? (params.get("from") || params.get("to") ? "" : "month");
  const [productId, setProductId] = React.useState(params.get("product") ?? ALL);
  const [payment, setPayment] = React.useState(params.get("payment") ?? ALL);
  const [from, setFrom] = React.useState(params.get("from") ?? "");
  const [to, setTo] = React.useState(params.get("to") ?? "");

  function pushWith(o: {
    mode?: "period" | "range";
    period?: string;
    product?: string;
    payment?: string;
  }) {
    const product = o.product ?? productId;
    const pay = o.payment ?? payment;
    const q = new URLSearchParams();

    if (o.mode === "period") {
      q.set("period", o.period!);
    } else if (o.mode === "range") {
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      if (!from && !to) q.set("period", "month");
    } else {
      // preserve current period/range
      const f = params.get("from");
      const t = params.get("to");
      if (f || t) {
        if (f) q.set("from", f);
        if (t) q.set("to", t);
      } else {
        q.set("period", params.get("period") || "month");
      }
    }

    if (product !== ALL) q.set("product", product);
    if (pay !== ALL) q.set("payment", pay);
    router.push(`/reports?${q.toString()}`);
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={activePeriod === p.value ? "default" : "outline"}
            onClick={() => pushWith({ mode: "period", period: p.value })}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label>Barang</Label>
          <Select
            value={productId}
            onValueChange={(v) => {
              setProductId(v);
              pushWith({ product: v });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua barang</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Metode Bayar</Label>
          <Select
            value={payment}
            onValueChange={(v) => {
              setPayment(v);
              pushWith({ payment: v });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua metode</SelectItem>
              <SelectItem value="cash">Tunai</SelectItem>
              <SelectItem value="qris">QRIS</SelectItem>
              <SelectItem value="hutang">Hutang</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">Dari</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Sampai</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className={cn("w-full", (from || to) && activePeriod === "" && "ring-2 ring-ring")}
            variant="secondary"
            onClick={() => pushWith({ mode: "range" })}
          >
            Terapkan Rentang
          </Button>
        </div>
      </div>
    </div>
  );
}
