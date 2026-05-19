'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import { SkeletonTable } from '@/components/SkeletonLoader'
import {
  getCustomerName,
  resolveBackendApiUrl,
  type Customer,
  type CustomersResponse
} from '../customers/customerData'
import TableSortLabel from '@mui/material/TableSortLabel'
import Collapse from '@mui/material/Collapse'

const LoyaltyCustomerPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [sortField, setSortField] = useState<string | null>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    sl_no: '',
    loyalty_card_no: '',
    old_card_no: '',
    name: '',
    phone: '',
    mobile: '',
    city: '',
    introducer_card_no: '',
    introducer_name: ''
  })

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadCustomers = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<CustomersResponse>('/customers?per_page=200&sort_by=created_at&sort_direction=desc')
      setCustomers(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${getCustomerName(customer)}?`)) return

    setError(null)
    setSuccess(null)

    try {
      await request(`/customers/${customer.id}`, {
        method: 'DELETE'
      })
      setSuccess(`${getCustomerName(customer)} deleted successfully.`)
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer.')
    }
  }
  
  const handleRegenerateCardNo = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to regenerate the loyalty card number for ${getCustomerName(customer)}?`)) return

    setError(null)
    setSuccess(null)

    try {
      await request(`/customers/${customer.id}/regenerate-loyalty-card`, {
        method: 'POST'
      })
      setSuccess(`Loyalty card number for ${getCustomerName(customer)} regenerated successfully.`)
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate loyalty card number.')
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadCustomers()
    }
  }, [status, accessToken, loadCustomers])

  const getIntroducerDisplayName = useCallback((customer: Customer) => {
    if (!customer.introducer_card_no) return '-'
    
    // Search in the loaded customers list
    const introducer = customers.find(c => c.loyalty_card_no === customer.introducer_card_no)
    if (introducer) {
      return getCustomerName(introducer)
    }

    return customer.introducer_name || '-'
  }, [customers])

  const handleRequestSort = (field: string) => {
    const isAsc = sortField === field && sortDirection === 'asc'
    setSortDirection(isAsc ? 'desc' : 'asc')
    setSortField(field)
  }

  const handleFilterChange = (field: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [field]: value }))
  }

  const filteredAndSortedCustomers = useMemo(() => {
    const globalQuery = search.trim().toLowerCase()

    let result = customers.map((c, i) => ({ ...c, sl_no: i + 1 }))

    // 1. Global Search
    if (globalQuery) {
      result = result.filter(customer => {
        const name = getCustomerName(customer)
        return (
          name.toLowerCase().includes(globalQuery) ||
          customer.mobile.toLowerCase().includes(globalQuery) ||
          (customer.loyalty_card_no || '').toLowerCase().includes(globalQuery) ||
          (customer.kyc?.city || '').toLowerCase().includes(globalQuery)
        )
      })
    }

    // 2. Column Filters
    Object.keys(columnFilters).forEach(key => {
      const filterValue = columnFilters[key].trim().toLowerCase()
      if (!filterValue) return

      result = result.filter(customer => {
        switch (key) {
          case 'sl_no': return String(customer.sl_no).includes(filterValue)
          case 'loyalty_card_no': return (customer.loyalty_card_no || '').toLowerCase().includes(filterValue)
          case 'old_card_no': return (customer.old_card_no || '').toLowerCase().includes(filterValue)
          case 'name': return getCustomerName(customer).toLowerCase().includes(filterValue)
          case 'phone': return (customer.kyc?.phone_no_1 || '').toLowerCase().includes(filterValue)
          case 'mobile': return customer.mobile.toLowerCase().includes(filterValue)
          case 'city': return (customer.kyc?.city || '').toLowerCase().includes(filterValue)
          case 'introducer_card_no': return (customer.introducer_card_no || '').toLowerCase().includes(filterValue)
          case 'introducer_name': return (customer.introducer_name || '').toLowerCase().includes(filterValue)
          default: return true
        }
      })
    })

    // 3. Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA: any = ''
        let valB: any = ''

        switch (sortField) {
          case 'sl_no': valA = a.sl_no; valB = b.sl_no; break
          case 'loyalty_card_no': valA = a.loyalty_card_no || ''; valB = b.loyalty_card_no || ''; break
          case 'old_card_no': valA = a.old_card_no || ''; valB = b.old_card_no || ''; break
          case 'name': valA = getCustomerName(a); valB = getCustomerName(b); break
          case 'phone': valA = a.kyc?.phone_no_1 || ''; valB = b.kyc?.phone_no_1 || ''; break
          case 'mobile': valA = a.mobile || ''; valB = b.mobile || ''; break
          case 'city': valA = a.kyc?.city || ''; valB = b.kyc?.city || ''; break
          case 'introducer_card_no': valA = a.introducer_card_no || ''; valB = b.introducer_card_no || ''; break
          case 'introducer_name': valA = a.introducer_name || ''; valB = b.introducer_name || ''; break
          default: valA = (a as any)[sortField]; valB = (b as any)[sortField]; break
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [customers, search, columnFilters, sortField, sortDirection])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ p: { xs: 4, md: 5 } }}>
            <Stack spacing={2}>
              <Typography variant='h4' sx={{ color: 'common.white', fontWeight: 700 }}>
                Loyalty Customer List
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                Comprehensive view of loyalty members, card details, and introducer relationships.
              </Typography>
            </Stack>
            <Box
               sx={{
                 position: 'absolute',
                 right: -20,
                 top: -20,
                 width: 150,
                 height: 150,
                 borderRadius: '50%',
                 background: 'rgba(255,255,255,0.1)',
                 zIndex: 0
               }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          {/* Header Bar like the image */}
          <Box 
            sx={{ 
              px: 3, 
              py: 2, 
              bgcolor: 'rgba(241, 245, 249, 0.5)', 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Drag a column header here to group by that column
            </Typography>
          </Box>

          <CardContent>
            <Stack spacing={4}>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems='center'>
                <TextField
                  size='small'
                  placeholder='Search by name, mobile, card no...'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 320 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-search-line' />
                      </InputAdornment>
                    )
                  }}
                />
                <Stack direction='row' spacing={2}>
                  <Button 
                    variant='outlined' 
                    size='small' 
                    startIcon={<i className='ri-refresh-line' />}
                    onClick={() => void loadCustomers()}
                  >
                    Refresh
                  </Button>
                  <Button 
                    component={Link}
                    href='/customers/add'
                    variant='contained' 
                    size='small' 
                    startIcon={<i className='ri-add-line' />}
                  >
                    Add Customer
                  </Button>
                </Stack>
              </Stack>

              {loading ? (
                <SkeletonTable rows={10} cols={8} />
              ) : error ? (
                <Alert severity='error'>{error}</Alert>
              ) : (
                <TableContainer 
                  component={Paper} 
                  variant='outlined' 
                  sx={{ 
                    borderRadius: 1, 
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                      height: 8
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: 10
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: 10,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.2)'
                      }
                    }
                  }}
                >
                  <Table sx={{ minWidth: 1000 }} size='small'>
                    <TableHead>
                      <TableRow 
                        sx={{ 
                          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                          '& .MuiTableCell-head': {
                            color: 'text.primary',
                            fontWeight: 700,
                            py: 1.5,
                            borderBottom: '2px solid',
                            borderColor: 'divider'
                          }
                        }}
                      >
                        <TableCell>
                          <TableSortLabel active={sortField === 'sl_no'} direction={sortField === 'sl_no' ? sortDirection : 'asc'} onClick={() => handleRequestSort('sl_no')}>Sl No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'loyalty_card_no'} direction={sortField === 'loyalty_card_no' ? sortDirection : 'asc'} onClick={() => handleRequestSort('loyalty_card_no')}>Card No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'old_card_no'} direction={sortField === 'old_card_no' ? sortDirection : 'asc'} onClick={() => handleRequestSort('old_card_no')}>Old Card No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'name'} direction={sortField === 'name' ? sortDirection : 'asc'} onClick={() => handleRequestSort('name')}>Customer Name</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'phone'} direction={sortField === 'phone' ? sortDirection : 'asc'} onClick={() => handleRequestSort('phone')}>Phone No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'mobile'} direction={sortField === 'mobile' ? sortDirection : 'asc'} onClick={() => handleRequestSort('mobile')}>Mobile No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'city'} direction={sortField === 'city' ? sortDirection : 'asc'} onClick={() => handleRequestSort('city')}>City</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'introducer_card_no'} direction={sortField === 'introducer_card_no' ? sortDirection : 'asc'} onClick={() => handleRequestSort('introducer_card_no')}>Introducer No</TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel active={sortField === 'introducer_name'} direction={sortField === 'introducer_name' ? sortDirection : 'asc'} onClick={() => handleRequestSort('introducer_name')}>Introducer Name</TableSortLabel>
                        </TableCell>
                        <TableCell align='right'>
                          <Stack direction='row' spacing={1} justifyContent='flex-end' alignItems='center'>
                            <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Action</Typography>
                            <IconButton size='small' onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                              <i className='ri-filter-3-line' />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                      
                      {/* Filter Row */}
                      <TableRow sx={{ display: showFilters ? 'table-row' : 'none', bgcolor: '#f8fafc' }}>
                        <TableCell><TextField size='small' variant='standard' placeholder='#' value={columnFilters.sl_no} onChange={e => handleFilterChange('sl_no', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Card...' value={columnFilters.loyalty_card_no} onChange={e => handleFilterChange('loyalty_card_no', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Old...' value={columnFilters.old_card_no} onChange={e => handleFilterChange('old_card_no', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Name...' value={columnFilters.name} onChange={e => handleFilterChange('name', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Phone...' value={columnFilters.phone} onChange={e => handleFilterChange('phone', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Mobile...' value={columnFilters.mobile} onChange={e => handleFilterChange('mobile', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='City...' value={columnFilters.city} onChange={e => handleFilterChange('city', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Intr. No...' value={columnFilters.introducer_card_no} onChange={e => handleFilterChange('introducer_card_no', e.target.value)} /></TableCell>
                        <TableCell><TextField size='small' variant='standard' placeholder='Intr. Name...' value={columnFilters.introducer_name} onChange={e => handleFilterChange('introducer_name', e.target.value)} /></TableCell>
                        <TableCell align='right'>
                           <IconButton size='small' onClick={() => setColumnFilters({ sl_no: '', loyalty_card_no: '', old_card_no: '', name: '', phone: '', mobile: '', city: '', introducer_card_no: '', introducer_name: '' })}>
                             <i className='ri-close-line' />
                           </IconButton>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAndSortedCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align='center' sx={{ py: 5 }}>
                            <Typography color='text.secondary'>No loyalty customers found.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedCustomers.map((customer, index) => (
                          <TableRow 
                            key={customer.id}
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          >
                            <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                              {index + 1}
                            </TableCell>
                            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
                              {customer.loyalty_card_no || '-'}
                            </TableCell>
                            <TableCell>{customer.old_card_no || '-'}</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {getCustomerName(customer)}
                            </TableCell>
                            <TableCell>{customer.kyc?.phone_no_1 || '-'}</TableCell>
                            <TableCell>{customer.mobile}</TableCell>
                            <TableCell>{customer.kyc?.city || '-'}</TableCell>
                            <TableCell>{customer.introducer_card_no || '-'}</TableCell>
                            <TableCell>{getIntroducerDisplayName(customer)}</TableCell>
                            <TableCell align='right'>
                              <Stack direction='row' spacing={1} justifyContent='flex-end'>
                                <Tooltip title='Edit Details'>
                                  <IconButton 
                                    size='small' 
                                    component={Link} 
                                    href={`/customers/${customer.id}/edit`}
                                    color='primary'
                                  >
                                    <i className='ri-edit-line' />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='View Profile'>
                                  <IconButton 
                                    size='small' 
                                    component={Link} 
                                    href={`/customers/${customer.id}`}
                                    color='info'
                                  >
                                    <i className='ri-eye-line' />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title='Point Adjustment'>
                                  <IconButton 
                                    size='small' 
                                    component={Link} 
                                    href={`/loyalty-card/add-redeem?customerId=${customer.id}`}
                                    sx={{ color: 'success.main' }}
                                  >
                                    <i className='ri-money-dollar-circle-line' />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title='Delete Customer'>
                                  <IconButton 
                                    size='small' 
                                    onClick={() => handleDeleteCustomer(customer)}
                                    color='error'
                                  >
                                    <i className='ri-delete-bin-7-line' />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default LoyaltyCustomerPage
