import InstallmentListPage from '@views/installments/InstallmentListPage'

const InstallmentsPendingPage = () => <InstallmentListPage title='Pending Installments' query='paid=0&sort_by=due_date&sort_direction=asc' />

export default InstallmentsPendingPage
