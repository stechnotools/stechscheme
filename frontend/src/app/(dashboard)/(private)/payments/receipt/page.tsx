import PaymentListPage from '@views/payments/PaymentListPage'

const PaymentsReceiptPage = () => <PaymentListPage title='Receipts' query='status=success&sort_by=payment_date&sort_direction=desc' />

export default PaymentsReceiptPage
