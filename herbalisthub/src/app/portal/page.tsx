import { Metadata } from "next"
import { ClientPage } from "@/lib/auth/page-protection"

export const metadata: Metadata = {
  title: "Client Portal | HerbalistHub",
  description: "Your personal health portal",
}

export default function PortalPage() {
  return (
    <ClientPage>
      <PortalContent />
    </ClientPage>
  )
}

function PortalContent() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Health Portal</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortalCard
            title="My Treatments"
            description="View your current and past treatments"
            href="/my-treatments"
          />
          
          <PortalCard
            title="My Consultations"
            description="Schedule and view consultation history"
            href="/my-consultations"
          />
          
          <PortalCard
            title="Health Records"
            description="Access your health information"
            href="/my-records"
          />
          
          <PortalCard
            title="Profile Settings"
            description="Update your personal information"
            href="/profile"
          />
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-600">Your recent consultations and treatments will appear here.</p>
        </div>
      </div>
    </div>
  )
}

interface PortalCardProps {
  title: string
  description: string
  href: string
}

function PortalCard({ title, description, href }: PortalCardProps) {
  return (
    <a
      href={href}
      className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </a>
  )
}