import SchemeClosingPreviewPage from '@views/membership/SchemeClosingPreviewPage'

const MembershipClosingPreviewRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <SchemeClosingPreviewPage membershipId={Number(id)} />
}

export default MembershipClosingPreviewRoutePage
