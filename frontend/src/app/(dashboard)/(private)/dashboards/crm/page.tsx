// Third-party Imports
import { getServerSession } from 'next-auth'
import { format } from 'date-fns'

// MUI Imports
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Lib Imports
import { authOptions } from '@/libs/auth'
import { getJewelleryDashboardData } from '@/libs/jewelleryApi'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const metricCards = (report: Awaited<ReturnType<typeof getJewelleryDashboardData>>['report']) => [
  {
    title: 'Total collected',
    value: currencyFormatter.format(report.total_collected_amount || 0),
    note: `${report.payments_count} successful payments`,
    icon: 'ri-wallet-3-line',
    color: '#0f766e'
  },
  {
    title: 'Active memberships',
    value: report.active_memberships_count.toString(),
    note: `${report.upcoming_maturities_count} maturing in 30 days`,
    icon: 'ri-medal-line',
    color: '#b45309'
  },
  {
    title: 'Customer base',
    value: report.customers_count.toString(),
    note: `${report.schemes_count} active scheme masters`,
    icon: 'ri-team-line',
    color: '#1d4ed8'
  },
  {
    title: 'Overdue installments',
    value: report.overdue_installments_count.toString(),
    note: `${report.pending_installments_count} pending in total`,
    icon: 'ri-timer-line',
    color: '#be123c'
  }
]

const DashboardCRM = async () => {
  const session = (await getServerSession(authOptions)) as
    | {
        accessToken?: string
        backendUser?: {
          name?: string
          email?: string | null
          mobile?: string | null
        }
      }
    | null

  let data: Awaited<ReturnType<typeof getJewelleryDashboardData>> | null = null
  let fetchError: string | null = null

  if (session?.accessToken) {
    try {
      data = await getJewelleryDashboardData(session.accessToken)
    } catch (error) {
      fetchError = error instanceof Error ? error.message : 'Unable to load dashboard data.'
    }
  } else {
    fetchError = 'No authenticated backend token found in session.'
  }

  const userName = session?.backendUser?.name || 'Team member'

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            background:
              'linear-gradient(135deg, rgba(120,53,15,1) 0%, rgba(180,83,9,1) 45%, rgba(245,158,11,1) 100%)',
            color: 'common.white'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 8 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: -60,
                insetBlockStart: -90,
                width: 240,
                height: 240,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
            <Stack spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                label='Jewellery Scheme Control Center'
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: 'common.white',
                  fontWeight: 700
                }}
              />
              <div>
                <Typography variant='h3' sx={{ color: 'common.white', mb: 1.5 }}>
                  {`Welcome back, ${userName}.`}
                </Typography>
                <Typography variant='body1' sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.82)' }}>
                  {`${themeConfig.templateName} now connects to the Laravel backend for schemes, customers, memberships, payments, and reporting. This dashboard gives your team a live operational snapshot instead of the stock template widgets.`}
                </Typography>
              </div>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap flexWrap='wrap'>
                <Chip
                  icon={<i className='ri-shield-check-line' />}
                  label={session?.accessToken ? 'Backend auth connected' : 'Session pending'}
                  sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'common.white' }}
                />
                <Chip
                  icon={<i className='ri-bank-card-line' />}
                  label='Reports, customers, schemes, payments'
                  sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'common.white' }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {fetchError ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            {`${fetchError} Sign in with the seeded admin account to view live data: admin@jewelleryscheme.test / password123.`}
          </Alert>
        </Grid>
      ) : null}

      {(data ? metricCards(data.report) : []).map(card => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Avatar sx={{ bgcolor: `${card.color}1A`, color: card.color, width: 52, height: 52 }}>
                  <i className={card.icon} />
                </Avatar>
                <div>
                  <Typography variant='body2' color='text.secondary'>
                    {card.title}
                  </Typography>
                  <Typography variant='h4'>{card.value}</Typography>
                </div>
                <Typography variant='body2' color='text.secondary'>
                  {card.note}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={4}>
              <div>
                <Typography variant='h5'>Recent Collections</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Latest successful payments captured from the backend payment ledger.
                </Typography>
              </div>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Scheme</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align='right'>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.payments.map(payment => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{payment.membership?.customer?.name || payment.membership?.customer?.mobile || payment.membership?.user?.name || 'Unknown member'}</TableCell>
                      <TableCell>{payment.membership?.scheme?.name || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={payment.status}
                          color={payment.status === 'success' ? 'success' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right'>{currencyFormatter.format(Number(payment.amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {!data?.payments.length ? (
                    <TableRow>
                      <TableCell colSpan={5} align='center'>
                        No payment activity yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>Customer Pulse</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Newer customer records with their KYC readiness.
                </Typography>
              </div>
              <List disablePadding>
                {data?.customers.map(customer => (
                  <ListItem key={customer.id} disableGutters sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                        {(customer.name || 'C').charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={customer.name || customer.mobile}
                      secondary={customer.mobile}
                    />
                    <Chip
                      size='small'
                      color={customer.kyc?.status === 'approved' ? 'success' : 'warning'}
                      label={customer.kyc?.status || 'kyc pending'}
                      variant='tonal'
                    />
                  </ListItem>
                ))}
                {!data?.customers.length ? (
                  <Typography variant='body2' color='text.secondary'>
                    No customers found yet.
                  </Typography>
                ) : null}
              </List>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>Scheme Catalogue</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Latest live schemes available to your membership team.
                </Typography>
              </div>
              {data?.schemes.map(scheme => (
                <Box
                  key={scheme.id}
                    sx={{
                      border: '1px solid var(--mui-palette-divider)',
                      borderRadius: 'var(--mui-shape-borderRadius)',
                      p: 3
                    }}
                >
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={2}>
                    <div>
                      <Typography variant='h6'>{scheme.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {`${scheme.code} • ${scheme.scheme_type} • ${scheme.total_installments} installments`}
                      </Typography>
                    </div>
                    <Chip
                      label={scheme.allow_overdue ? 'Overdue allowed' : 'Strict due dates'}
                      color={scheme.allow_overdue ? 'warning' : 'success'}
                      variant='tonal'
                      size='small'
                    />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='body2' color='text.secondary'>
                    Installment value
                  </Typography>
                  <Typography variant='h5'>{currencyFormatter.format(Number(scheme.installment_value || 0))}</Typography>
                </Box>
              ))}
              {!data?.schemes.length ? (
                <Typography variant='body2' color='text.secondary'>
                  No schemes created yet.
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>Membership Watchlist</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Active memberships that the branch team should keep an eye on.
                </Typography>
              </div>
              <List disablePadding>
                {data?.memberships.map(membership => (
                  <ListItem key={membership.id} disableGutters sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                        <i className='ri-vip-crown-line' />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={membership.customer?.name || membership.customer?.mobile || membership.user?.name || 'Unknown member'}
                      secondary={`${membership.scheme?.name || 'No scheme'} • maturity ${format(new Date(membership.maturity_date), 'dd MMM yyyy')}`}
                    />
                    <div className='text-right'>
                      <Chip size='small' label={membership.status} color='success' variant='tonal' />
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                        Paid {currencyFormatter.format(Number(membership.total_paid || 0))}
                      </Typography>
                    </div>
                  </ListItem>
                ))}
                {!data?.memberships.length ? (
                  <Typography variant='body2' color='text.secondary'>
                    No active memberships found.
                  </Typography>
                ) : null}
              </List>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DashboardCRM
