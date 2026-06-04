"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { createProduct, updateProduct, setProductActive } from "@/lib/actions/products";
import { formatQty } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductsManager({ products }: { products: Product[] }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const unit = String(form.get("unit") ?? "");
    const minStock = Number(form.get("minStock") ?? 0);

    startTransition(async () => {
      setError(null);
      let res;
      if (editing) {
        res = await updateProduct({
          id: editing.id,
          name,
          unit,
          minStock,
          isActive: form.get("isActive") === "on",
        });
      } else {
        const initialStock = Number(form.get("initialStock") ?? 0);
        res = await createProduct({ name, unit, minStock, initialStock });
      }
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Gagal menyimpan.");
    });
  }

  function toggleActive(p: Product) {
    startTransition(async () => {
      await setProductActive(p.id, !p.is_active);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Barang
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="text-right">Min.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Belum ada barang.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className={p.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell className="text-right">{formatQty(p.current_stock)}</TableCell>
                  <TableCell className="text-right">{formatQty(p.min_stock)}</TableCell>
                  <TableCell>
                    <StatusBadge stock={p.current_stock} minStock={p.min_stock} />
                  </TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={p.is_active ? "ghost" : "secondary"}
                        disabled={pending}
                        onClick={() => toggleActive(p)}
                      >
                        {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Barang</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Satuan</Label>
                <Input
                  id="unit"
                  name="unit"
                  placeholder="kg, dus, ..."
                  defaultValue={editing?.unit ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input
                  id="minStock"
                  name="minStock"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={editing?.min_stock ?? 0}
                  required
                />
              </div>
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="initialStock">Stok Awal</Label>
                <Input
                  id="initialStock"
                  name="initialStock"
                  type="number"
                  min={0}
                  step="any"
                  defaultValue={0}
                />
              </div>
            )}
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing.is_active}
                  className="h-4 w-4"
                />
                Barang aktif
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
