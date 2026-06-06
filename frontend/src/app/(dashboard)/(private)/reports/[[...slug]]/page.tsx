import { redirect } from 'next/navigation'
import ReportsModulePage from '@views/reports/ReportsModulePage'

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params

  if (slug.length === 0) {
    redirect('/reports/dashboard')
  }

  return <ReportsModulePage slug={slug} />
}

