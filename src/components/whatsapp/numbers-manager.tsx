"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  addAllowedNumber,
  updateAllowedNumber,
  setNumberActive,
} from "@/lib/actions/whatsapp";
import type { AllowedWhatsappNumber } from "@/lib/types";

export function NumbersManager({ numbers }: { numbers: AllowedWhatsappNumber[] }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AllowedWhatsappNumber | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }
  function openEdit(n: AllowedWhatsappNumber) {
    setEditing(n);
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    startTransition(async () => {
      setError(null);
      let res;
      if (editing) {
        res = await updateAllowedNumber({
          id: editing.id,
          name,
          isActive: form.get("isActive") === "on",
        });
      } else {
        res = await addAllowedNumber({
          phoneNumber: String(form.get("phoneNumber") ?? ""),
          name,
        });
      }
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Gagal menyimpan.");
    });
  }

  function toggle(n: AllowedWhatsappNumber) {
    startTransition(async () => {
      await setNumberActive(n.id, !n.is_active);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Nomor
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Nomor WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {numbers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Belum ada nomor terdaftar.
                </TableCell>
              </TableRow>
            ) : (
              numbers.map((n) => (
                <TableRow key={n.id} className={n.is_active ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell className="font-mono">{n.phone_number}</TableCell>
                  <TableCell>
                    {n.is_active ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={n.is_active ? "ghost" : "secondary"}
                        disabled={pending}
                        onClick={() => toggle(n)}
                      >
                        {n.is_active ? "Nonaktifkan" : "Aktifkan"}
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
            <DialogTitle>{editing ? "Edit Nomor" : "Tambah Nomor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Nomor WhatsApp</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="62812xxxxxxx"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format internasional tanpa tanda +, contoh: 6281234567890.
                </p>
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
                Nomor aktif
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
