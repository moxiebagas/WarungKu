"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardEdit,
  History,
  MessageCircle,
  BarChart3,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";

const NAV = [
  { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/products", label: "Barang", icon: Package },
  { href: "/stock", label: "Koreksi Stok", icon: ClipboardEdit },
  { href: "/history", label: "Riwayat", icon: History },
  { href: "/settings/whatsapp", label: "Nomor WA", icon: MessageCircle },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-gray-200 bg-white px-4 py-6 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-2 px-2"
          onClick={closeMobile}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Store className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold text-gray-800">WarungKu</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            Menu
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-brand-500" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
