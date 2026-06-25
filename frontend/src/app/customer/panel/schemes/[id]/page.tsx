import CustomerPortalSchemeDetailPage from '@views/customer-portal/CustomerPortalSchemeDetailPage'

const CustomerSchemeDetailRoute = async ({
  params
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  return <CustomerPortalSchemeDetailPage schemeId={Number(id)} />
}

export default CustomerSchemeDetailRoute
