import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { reportHref, reportItemByPath, reportSections, type ReportPath } from '@/data/reports/reportRegistry'

const cardSx = {
  borderRadius: 0,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)'
} as const

const reportsByScope = {
  dashboard: 'Dashboard',
  operational: 'Operational',
  financial: 'Financial'
} as const

const ReportsModulePage = ({ slug = [] }: { slug?: string[] }) => {
  const path = (slug.join('/') || 'dashboard') as ReportPath
  const report = reportItemByPath.get(path)
  const isOverview = !report || path === 'dashboard'

  return (
    <Stack spacing={4}>
      <Card sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
              <div>
                <Typography variant='h4'>{isOverview ? 'Reports Dashboard' : report.title}</Typography>
                <Typography color='text.secondary' sx={{ mt: 1 }}>
                  {isOverview
                    ? 'Choose a report module to drill into collections, customer balances, installments, receipts, and accounting.'
                    : report.summary}
                </Typography>
              </div>
              <Stack direction='row' spacing={1} flexWrap='wrap'>
                <Chip label={isOverview ? 'Overview' : reportsByScope[report.scope]} color='primary' variant='outlined' />
                {!isOverview ? <Chip label={report.permission} variant='outlined' /> : null}
              </Stack>
            </Stack>

            <Divider />

            <Grid container spacing={3}>
              {(isOverview ? reportSections.flatMap(section => section.items) : [report]).map(item => (
                <Grid key={item.path} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Card sx={{ height: '100%', borderRadius: 0, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ height: '100%' }}>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                          <div>
                            <Typography variant='h6'>{item.title}</Typography>
                            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                              {item.summary}
                            </Typography>
                          </div>
                          <Chip label={reportsByScope[item.scope]} size='small' variant='outlined' />
                        </Box>

                        <Divider />

                        <Box>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                          >
                            Columns
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ mt: 1 }}>
                            {item.columns.map(column => (
                              <Chip key={column} label={column} size='small' />
                            ))}
                          </Stack>
                        </Box>

                        <Box>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                          >
                            Filters
                          </Typography>
                          <Typography variant='body2' sx={{ mt: 1 }}>
                            {item.filters.join(', ')}
                          </Typography>
                        </Box>

                        <Link href={reportHref(item.path)} style={{ marginTop: 'auto', textDecoration: 'none' }}>
                          <Button variant='contained' fullWidth>
                            Open Report
                          </Button>
                        </Link>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {!isOverview ? (
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant='h6'>What this report will show</Typography>
              <Typography color='text.secondary'>
                {report.title} is prepared as a dedicated module so we can plug in the backend query later without changing the menu or route structure.
              </Typography>
              <Divider />
              <Stack spacing={1}>
                <Typography variant='subtitle2'>Suggested implementation focus</Typography>
                <Typography color='text.secondary'>
                  Build the API first, then plug in branch, customer, and date filters so management can slice the report by operational need.
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  )
}

export default ReportsModulePage
