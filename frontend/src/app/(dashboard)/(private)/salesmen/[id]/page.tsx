import SalesmanDetailPage from '@views/salesmen/SalesmanDetailPage'

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <SalesmanDetailPage salesmanId={Number(id)} />
}

export default Page
