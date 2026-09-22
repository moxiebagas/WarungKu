"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/context/sidebar-context";

export function AppHeader() {
  const { toggleMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-8">
      <button
        onClick={toggleMobile}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 lg:hidden"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-sm font-semibold text-gray-700 lg:hidden">WarungKu</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-gray-500 sm:inline">Admin Toko</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
          A
        </span>
      </div>
    </header>
  );
}
