import PaymentListPage from '@views/payments/PaymentListPage'

const PaymentsCreatePage = () => <PaymentListPage title='Create Payment' query='sort_by=payment_date&sort_direction=desc' showLedger={false} />

export default PaymentsCreatePage
