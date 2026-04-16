import InstallmentListPage from '@views/installments/InstallmentListPage'

const InstallmentsOverduePage = () => <InstallmentListPage title='Overdue Installments' query='overdue=1&sort_by=due_date&sort_direction=asc' />

export default InstallmentsOverduePage
