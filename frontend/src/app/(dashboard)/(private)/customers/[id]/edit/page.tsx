import EditCustomerPage from '@views/customers/EditCustomerPage'

const CustomerEditRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <EditCustomerPage customerId={Number(id)} />
}

export default CustomerEditRoutePage
