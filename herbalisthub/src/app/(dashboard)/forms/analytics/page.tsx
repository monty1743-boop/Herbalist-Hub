import { Metadata } from 'next'
import { AnalyticsDashboard } from '@/components/forms/AnalyticsDashboard'

export const metadata: Metadata = {
  title: 'Form Analytics | HerbalistHub',
  description: 'Comprehensive analytics and insights for your intake forms',
}

interface AnalyticsPageProps {
  searchParams: {
    formId?: string
    mode?: 'single' | 'multi' | 'overview'
  }
}

export default function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  // In a real implementation, this would get the practitioner ID from auth
  const practitionerId = 'current-practitioner-id'

  return (
    <div className="container mx-auto py-6">
      <AnalyticsDashboard
        practitionerId={practitionerId}
        formId={searchParams.formId}
        mode={searchParams.mode || 'overview'}
      />
    </div>
  )
}