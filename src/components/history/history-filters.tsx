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
import type { Product } from "@/lib/types";

const ALL = "all";

export function HistoryFilters({ products }: { products: Product[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [productId, setProductId] = React.useState(params.get("product") ?? ALL);
  const [type, setType] = React.useState(params.get("type") ?? ALL);
  const [source, setSource] = React.useState(params.get("source") ?? ALL);
  const [from, setFrom] = React.useState(params.get("from") ?? "");
  const [to, setTo] = React.useState(params.get("to") ?? "");

  function apply() {
    const q = new URLSearchParams();
    if (productId !== ALL) q.set("product", productId);
    if (type !== ALL) q.set("type", type);
    if (source !== ALL) q.set("source", source);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    router.push(`/history?${q.toString()}`);
  }

  function reset() {
    setProductId(ALL);
    setType(ALL);
    setSource(ALL);
    setFrom("");
    setTo("");
    router.push("/history");
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1.5 lg:col-span-2">
        <Label>Barang</Label>
        <Select value={productId} onValueChange={setProductId}>
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
        <Label>Jenis</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua</SelectItem>
            <SelectItem value="IN">Masuk</SelectItem>
            <SelectItem value="OUT">Keluar</SelectItem>
            <SelectItem value="ADJUSTMENT">Koreksi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Sumber</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua</SelectItem>
            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
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
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <Button onClick={apply}>Terapkan</Button>
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
