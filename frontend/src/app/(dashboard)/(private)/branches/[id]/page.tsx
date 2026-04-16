import BranchDetailPage from '@views/branches/BranchDetailPage'

const BranchViewPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <BranchDetailPage branchId={Number(id)} />
}

export default BranchViewPage
