import MembershipEditPage from '@views/membership/MembershipEditPage'

const MembershipEditRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <MembershipEditPage membershipId={Number(id)} />
}

export default MembershipEditRoutePage
