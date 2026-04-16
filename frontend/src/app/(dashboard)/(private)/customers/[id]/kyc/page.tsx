import CustomerKycUpdatePage from '@views/customers/CustomerKycUpdatePage'

const CustomerKycRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <CustomerKycUpdatePage customerId={Number(id)} />
}

export default CustomerKycRoutePage
