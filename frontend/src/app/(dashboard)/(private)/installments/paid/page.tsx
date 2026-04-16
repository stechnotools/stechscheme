import InstallmentListPage from '@views/installments/InstallmentListPage'

const InstallmentsPaidPage = () => <InstallmentListPage title='Paid Installments' query='paid=1&sort_by=due_date&sort_direction=desc' />

export default InstallmentsPaidPage
