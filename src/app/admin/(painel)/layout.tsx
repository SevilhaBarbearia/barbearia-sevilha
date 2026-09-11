import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { exigirAdmin } from '@/lib/auth/permissoes';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();

  return (
    <main className="fundo-premium min-h-screen">
      <div className="flex flex-col md:flex-row">
        <AdminSidebar />
        <section className="min-w-0 flex-1 p-4 sm:p-5 md:p-8">{children}</section>
      </div>
    </main>
  );
}
