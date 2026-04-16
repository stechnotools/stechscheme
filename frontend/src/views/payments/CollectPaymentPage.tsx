'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'

type MembershipLookup = {
  id: number
  customer?: { id: number; name?: string | null; mobile: string } | null
  scheme?: { id: number; name: string; code: string; installment_value?: string | number } | null
  installments?: Array<{ 
    id: number; 
    installment_no: number; 
    due_date: string; 
    paid: boolean;
    amount?: string | number;
    penalty?: string | number;
  }>
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const CollectPaymentPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMembershipId = searchParams.get('membership_id')
  const initialInstallmentId = searchParams.get('installment_id')

  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [searchMobile, setSearchMobile] = useState('')
  const [membership, setMembership] = useState<MembershipLookup | null>(null)
  
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>(initialInstallmentId || '')
  
  const [gateway, setGateway] = useState('cash')
  const [transactionId, setTransactionId] = useState('')
  const [remarks, setRemarks] = useState('')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')
    const response = await fetch(`${backendApiUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      }
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || 'Request failed')
    return payload as T
  }, [accessToken])

  const loadMembership = useCallback(async (id: string | number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await request<{ data: MembershipLookup }>(`/memberships/${id}`)
      setMembership(res.data)
      
      // Auto-select next available installment if none selected
      if (!selectedInstallmentId) {
        const nextPending = res.data.installments?.find(i => !i.paid)
        if (nextPending) setSelectedInstallmentId(String(nextPending.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership.')
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }, [request, selectedInstallmentId])

  useEffect(() => {
    if (status === 'authenticated' && accessToken && initialMembershipId) {
      void loadMembership(initialMembershipId)
    }
  }, [status, accessToken, initialMembershipId, loadMembership])

  const handleSearch = async () => {
    if (!searchMobile.trim()) return setError('Enter mobile number to search.')
    setLoading(true)
    setError(null)
    try {
      const searchRes = await request<{ data: Array<{ id: number }> }>(`/customers?search=${encodeURIComponent(searchMobile.trim())}`)
      if (!searchRes.data.length) throw new Error('No customer found with that mobile.')
      
      const customerRes = await request<{ data: { memberships?: Array<{ id: number; status: string }> } }>(`/customers/${searchRes.data[0].id}`)
      const activeMemberships = customerRes.data.memberships?.filter(m => m.status === 'active')
      if (!activeMemberships || !activeMemberships.length) throw new Error('Customer has no active memberships.')
      
      // Load the first active membership
      await loadMembership(activeMemberships[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }

  const selectedInstallment = useMemo(() => {
    if (!membership || !membership.installments) return null
    return membership.installments.find(i => String(i.id) === selectedInstallmentId)
  }, [membership, selectedInstallmentId])

  const amounts = useMemo(() => {
    if (!selectedInstallment) return { base: 0, penalty: 0, total: 0 }
    const base = Number(selectedInstallment.amount || membership?.scheme?.installment_value || 0)
    const penalty = Number(selectedInstallment.penalty || 0)
    return { base, penalty, total: base + penalty }
  }, [selectedInstallment, membership])

  const handlePayment = async () => {
    if (!membership || !selectedInstallment) return setError('Invalid membership or installment selected.')
    if (amounts.total <= 0) return setError('Payment amount must be greater than zero.')
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      await request('/payments', {
        method: 'POST',
        body: JSON.stringify({
          membership_id: membership.id,
          installment_id: selectedInstallment.id,
          amount: amounts.total,
          gateway,
          transaction_id: gateway !== 'cash' ? transactionId : null,
          payment_date: new Date().toISOString().slice(0, 10),
          status: 'success' // Marking success immediately for simple integration
        })
      })
      
      // Update installment as paid (backend might already do this via events, but we emulate if needed or just reload)
      await loadMembership(membership.id)
      setSuccess('Payment collected successfully!')
      
      // reset form elements
      setTransactionId('')
      setRemarks('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems='flex-start' spacing={2}>
          <div>
            <Typography variant="h4">Collect Payment</Typography>
            <Typography color="text.secondary">Process installment payments for active memberships.</Typography>
          </div>
          <Button component={Link} href={membership ? `/membership/${membership.id}` : '/schemes'} variant="outlined" color="secondary">
            Back
          </Button>
        </Stack>
      </Grid>
      
      {error && <Grid size={{ xs: 12 }}><Alert severity="error">{error}</Alert></Grid>}
      {success && <Grid size={{ xs: 12 }}><Alert severity="success">{success}</Alert></Grid>}

      {/* SEARCH SECTION */}
      {!initialMembershipId && !membership && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Search Account</Typography>
              <Stack direction="row" spacing={2}>
                <TextField 
                  fullWidth 
                  placeholder="Enter Mobile Number" 
                  value={searchMobile} 
                  onChange={e => setSearchMobile(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><i className="ri-search-line" /></InputAdornment>
                  }}
                />
                <Button variant="contained" onClick={() => void handleSearch()} disabled={loading}>Search</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ACCOUNT SUMMARY & PAYMENT INTERFACE */}
      {membership && (
        <>
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid" borderColor="divider" pb={1}>
                    Customer & Plan Reference
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Name</Typography>
                      <Typography fontWeight={600}>{membership.customer?.name || 'Unknown'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Mobile</Typography>
                      <Typography fontWeight={600}>{membership.customer?.mobile}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Scheme</Typography>
                      <Typography fontWeight={600}>{membership.scheme?.name} ({membership.scheme?.code})</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">Membership ID</Typography>
                      <Typography fontWeight={600}>#{membership.id}</Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 8 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant="subtitle1" fontWeight={700} borderBottom="1px solid" borderColor="divider" pb={1}>
                    Payment Breakdown
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        label="Select Pending Installment"
                        value={selectedInstallmentId}
                        onChange={(e) => setSelectedInstallmentId(e.target.value)}
                      >
                        <MenuItem value="" disabled>Select an installment...</MenuItem>
                        {membership.installments?.filter(i => !i.paid).map(inst => (
                          <MenuItem key={inst.id} value={String(inst.id)}>
                            {`Installment #${inst.installment_no} • Due ${new Date(inst.due_date).toLocaleDateString()}`}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        label="Payment Gateway"
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value)}
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="card">Credit/Debit Card</MenuItem>
                        <MenuItem value="upi">UPI</MenuItem>
                        <MenuItem value="netbanking">Net Banking</MenuItem>
                      </TextField>
                    </Grid>
                    
                    {gateway !== 'cash' && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Transaction / Reference ID"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                        />
                      </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                      {selectedInstallment ? (
                        <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                          <CardContent>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="text.secondary">Base Amount</Typography>
                                <Typography fontWeight={600}>₹{amounts.base.toLocaleString('en-IN')}</Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography color="error.main">Penalty / Late Fee</Typography>
                                <Typography color="error.main" fontWeight={600}>₹{amounts.penalty.toLocaleString('en-IN')}</Typography>
                              </Stack>
                              <Divider />
                              <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1}>
                                <Typography variant="h6">Total Payable</Typography>
                                <Typography variant="h5" color="primary.main" fontWeight={700}>
                                  ₹{amounts.total.toLocaleString('en-IN')}
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ) : (
                        <Alert severity="info" variant="outlined">Please select a pending installment to view the payment calculation.</Alert>
                      )}
                    </Grid>
                  </Grid>

                  <Stack direction="row" justifyContent="flex-end">
                    <Button 
                      variant="contained" 
                      size="large" 
                      disabled={!selectedInstallment || amounts.total <= 0 || saving}
                      onClick={() => void handlePayment()}
                    >
                      {saving ? 'Processing...' : `Collect ₹${amounts.total.toLocaleString('en-IN')}`}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default CollectPaymentPage
