import { SidebarProvider } from "@/context/sidebar-context";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppHeader } from "@/components/app-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <SidebarNav />
        <div className="lg:pl-[260px]">
          <AppHeader />
          <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
