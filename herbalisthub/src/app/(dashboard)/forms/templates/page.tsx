import { Metadata } from 'next'
import { TemplateLibrary } from '@/components/forms/TemplateLibrary'

export const metadata: Metadata = {
  title: 'Form Templates | HerbalistHub',
  description: 'Browse and customize professional intake form templates',
}

interface TemplatesPageProps {
  searchParams: {
    category?: string
    specialty?: string
    mode?: 'browse' | 'select' | 'manage'
  }
}

export default function TemplatesPage({ searchParams }: TemplatesPageProps) {
  // In a real implementation, this would get the practitioner ID from auth
  const practitionerId = 'current-practitioner-id'

  const handleTemplateSelect = (template: any) => {
    // Handle template selection
    console.log('Template selected:', template)
  }

  const handleTemplateCustomize = (template: any) => {
    // Handle template customization
    console.log('Template customize:', template)
  }

  return (
    <div className="container mx-auto py-6">
      <TemplateLibrary
        practitionerId={practitionerId}
        onTemplateSelect={handleTemplateSelect}
        onTemplateCustomize={handleTemplateCustomize}
        mode={searchParams.mode || 'browse'}
      />
    </div>
  )
}