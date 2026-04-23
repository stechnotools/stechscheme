import PaymentReceiptPage from '@views/payments/PaymentReceiptPage'

const PaymentsReceiptDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <PaymentReceiptPage paymentId={Number(id)} />
}

export default PaymentsReceiptDetailPage
