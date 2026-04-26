import MembershipCreatePage from '@views/membership/MembershipCreatePage'

const MembershipCreateRoutePage = async ({
  searchParams
}: {
  searchParams: Promise<{ customerId?: string }>
}) => {
  const { customerId } = await searchParams

  return <MembershipCreatePage customerId={customerId ? Number(customerId) : undefined} />
}

export default MembershipCreateRoutePage
