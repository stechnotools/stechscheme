import MembershipDetailPage from '@views/membership/MembershipDetailPage'

const MembershipDetailRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <MembershipDetailPage membershipId={Number(id)} />
}

export default MembershipDetailRoutePage
