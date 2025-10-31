import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Welcome to HerbalistHub - Professional herbalist practice management platform',
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to{' '}
          <span className="text-primary">HerbalistHub</span>
        </h1>

        <p className="mt-3 text-2xl">
          Professional herbalist practice management platform
        </p>

        <div className="mt-6 flex max-w-4xl flex-wrap items-center justify-around sm:w-full">
          <div className="mt-6 w-96 rounded-xl border p-6 text-left hover:text-primary focus:text-primary">
            <h3 className="text-2xl font-bold">Client Management &rarr;</h3>
            <p className="mt-4 text-xl">
              Securely manage client profiles with HIPAA-compliant encryption
            </p>
          </div>

          <div className="mt-6 w-96 rounded-xl border p-6 text-left hover:text-primary focus:text-primary">
            <h3 className="text-2xl font-bold">Inventory Tracking &rarr;</h3>
            <p className="mt-4 text-xl">
              Track herb inventory, costs, and expiration dates
            </p>
          </div>

          <div className="mt-6 w-96 rounded-xl border p-6 text-left hover:text-primary focus:text-primary">
            <h3 className="text-2xl font-bold">Formula Creation &rarr;</h3>
            <p className="mt-4 text-xl">
              Create and manage herbal formulas with cost calculations
            </p>
          </div>

          <div className="mt-6 w-96 rounded-xl border p-6 text-left hover:text-primary focus:text-primary">
            <h3 className="text-2xl font-bold">Appointment Scheduling &rarr;</h3>
            <p className="mt-4 text-xl">
              Schedule appointments with Google Calendar integration
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}