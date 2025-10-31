import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Content',
  description: 'HerbalistHub public content and education',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* TODO: Add public site navigation */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-primary">HerbalistHub</h1>
          <nav className="hidden md:flex space-x-6">
            {/* TODO: Public navigation menu will be added in WP09 */}
          </nav>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}