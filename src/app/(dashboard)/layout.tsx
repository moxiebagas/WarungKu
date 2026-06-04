import Link from "next/link";
import { Store } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
      <aside className="border-b bg-background p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <Link href="/dashboard" className="mb-4 flex items-center gap-2 px-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">WarungKu</span>
        </Link>
        <SidebarNav />
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
