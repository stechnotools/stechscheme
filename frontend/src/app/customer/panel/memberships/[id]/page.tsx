import CustomerMembershipDetailPage from '@views/customer-portal/CustomerMembershipDetailPage'

const CustomerMembershipDetailRoute = async ({
  params
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  return <CustomerMembershipDetailPage membershipId={Number(id)} />
}

export default CustomerMembershipDetailRoute
