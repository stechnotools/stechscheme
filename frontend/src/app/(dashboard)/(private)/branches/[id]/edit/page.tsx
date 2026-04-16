import EditBranchPage from '@views/branches/EditBranchPage'

const BranchEditRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <EditBranchPage branchId={Number(id)} />
}

export default BranchEditRoutePage
