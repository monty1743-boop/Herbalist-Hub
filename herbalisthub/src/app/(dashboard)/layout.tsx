import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'HerbalistHub practice management dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* TODO: Add dashboard navigation sidebar */}
      <div className="flex">
        <aside className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex h-16 items-center px-6">
            <h1 className="text-xl font-bold text-primary">HerbalistHub</h1>
          </div>
          {/* TODO: Navigation menu will be added in later work packages */}
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}