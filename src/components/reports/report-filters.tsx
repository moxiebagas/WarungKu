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
  const [from, setFrom] = React.useState(params.get("from") ?? "");
  const [to, setTo] = React.useState(params.get("to") ?? "");

  function go(q: URLSearchParams) {
    if (productId !== ALL) q.set("product", productId);
    router.push(`/reports?${q.toString()}`);
  }

  function applyPeriod(period: string) {
    const q = new URLSearchParams();
    q.set("period", period);
    go(q);
  }

  function applyCustom() {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (!from && !to) q.set("period", "month");
    go(q);
  }

  function applyProductOnly(value: string) {
    setProductId(value);
    const q = new URLSearchParams();
    const period = params.get("period");
    if (period) q.set("period", period);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (value !== ALL) q.set("product", value);
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
            onClick={() => applyPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Barang</Label>
          <Select value={productId} onValueChange={applyProductOnly}>
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
            onClick={applyCustom}
          >
            Terapkan Rentang
          </Button>
        </div>
      </div>
    </div>
  );
}
