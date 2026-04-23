import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const PaymentsReceiptIndexPage = () => {
  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <div>
            <Typography variant='h4'>Receipt Center</Typography>
            <Typography color='text.secondary'>
              Open a specific receipt from payment history or right after collecting a payment.
            </Typography>
          </div>
          <Alert severity='info'>
            Receipt pages are now generated per payment so staff can print or download the exact installment collection record.
          </Alert>
          <Stack direction='row' spacing={2}>
            <Button component={Link} href='/payments/history' variant='contained'>
              Open Payment History
            </Button>
            <Button component={Link} href='/payments' variant='outlined'>
              Go to Payments
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default PaymentsReceiptIndexPage
