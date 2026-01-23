'use client';

import { AdminSidebar } from '@/components/Admin/AdminSidebar';
import { AdminGuard } from '@/components/Admin/AdminGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
