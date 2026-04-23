import PaymentListPage from '@views/payments/PaymentListPage'

const PaymentsHistoryPage = () => (
  <PaymentListPage title='Payment History' query='status=success&sort_by=payment_date&sort_direction=desc' showCreateForm={false} />
)

export default PaymentsHistoryPage
