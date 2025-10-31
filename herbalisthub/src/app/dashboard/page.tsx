import { Metadata } from "next"
import { DashboardOverview } from "@/components/dashboard/DashboardOverview"

export const metadata: Metadata = {
  title: "Dashboard | HerbalistHub",
  description: "Your HerbalistHub dashboard - HIPAA-compliant practice management",
}

export default function DashboardPage() {
  return <DashboardOverview />
}

