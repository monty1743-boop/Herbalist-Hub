import { Metadata } from "next"
import { InventoryAlertsWidget, UpcomingAppointmentsWidget, RecentActivityWidget } from "@/components/dashboard/widgets"

export const metadata: Metadata = {
  title: "Dashboard Widgets | HerbalistHub",
  description: "Interactive widgets for practice management and monitoring",
}

export default function DashboardWidgetsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard Widgets
        </h1>
        <p className="text-muted-foreground mt-2">
          Interactive widgets for monitoring your practice operations in real-time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2">
        {/* Inventory Alerts Widget */}
        <div className="lg:col-span-1">
          <InventoryAlertsWidget />
        </div>

        {/* Upcoming Appointments Widget */}
        <div className="lg:col-span-1">
          <UpcomingAppointmentsWidget />
        </div>

        {/* Recent Activity Widget - Full Width */}
        <div className="lg:col-span-full">
          <RecentActivityWidget />
        </div>
      </div>
    </div>
  )
}