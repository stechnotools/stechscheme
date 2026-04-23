import PaymentListPage from '@views/payments/PaymentListPage'

const PaymentsFailedPage = () => (
  <PaymentListPage title='Failed Payments' query='status=failed&sort_by=payment_date&sort_direction=desc' showCreateForm={false} />
)

export default PaymentsFailedPage
