import CustomerPortalProductDetailPage from '@views/customer-portal/CustomerPortalProductDetailPage'

const CustomerProductDetailRoute = async ({
  params
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params

  return <CustomerPortalProductDetailPage productId={Number(id)} />
}

export default CustomerProductDetailRoute
