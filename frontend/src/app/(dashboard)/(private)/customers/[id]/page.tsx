import CustomerProfilePage from '@views/customers/CustomerProfilePage'

const CustomerProfileRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <CustomerProfilePage customerId={Number(id)} />
}

export default CustomerProfileRoutePage
