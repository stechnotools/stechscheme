'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Autocomplete,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const EditDigitalMetalSalePage = () => {
  const router = useRouter()
  const { id } = useParams()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // Master Data
  const [customers, setCustomers] = useState<any[]>([])
  const [metals, setMetals] = useState<any[]>([])

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerMobile, setCustomerMobile] = useState('')
  const [voucherNo, setVoucherNo] = useState('')
  const [voucherDate, setVoucherDate] = useState('')
  
  const [selectedMetal, setSelectedMetal] = useState<any>(null)
  const [editableMetalRate, setEditableMetalRate] = useState(0)
  const [weight, setWeight] = useState('')
  const [pcs, setPcs] = useState('1')
  const [otherCharges, setOtherCharges] = useState('0')
  const [salesman, setSalesman] = useState('')
  const [salesmanId, setSalesmanId] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [discount, setDiscount] = useState('0')
  const [gstPercent, setGstPercent] = useState('3')
  const [customerAddress, setCustomerAddress] = useState('')

  // Multi-Payment State
  const [payments, setPayments] = useState([{ mode: 'Cash', amount: '', ref: '' }])
  const paymentModes = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!accessToken || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [custRes, metalRes, saleRes, userRes] = await Promise.all([
        fetch(`${backendApiUrl}/customers`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }),
        fetch(`${backendApiUrl}/digital-metal-masters`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }),
        fetch(`${backendApiUrl}/digital-metal-sales/${id}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }),
        fetch(`${backendApiUrl}/users`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } })
      ])
      
      const custJson = await custRes.json()
      const metalJson = await metalRes.json()
      const saleJson = await saleRes.json()
      const userJson = await userRes.json()
      
      const loadedCustomers = custJson.success !== false ? (custJson.data || []) : []
      const loadedMetals = metalJson.success !== false ? (metalJson.data || []) : []
      const sale = saleJson.data

      setCustomers(loadedCustomers)
      setMetals(loadedMetals)
      setUsers(userJson.success !== false ? (userJson.data || []) : [])

      if (sale) {
        const customer = loadedCustomers.find((c: any) => c.id === sale.customer_id) || sale.customer
        setSelectedCustomer(customer)
        setCustomerMobile(customer?.mobile || '')
        setVoucherNo(sale.voucher_no || '')
        setVoucherDate(sale.voucher_date ? new Date(sale.voucher_date).toISOString().split('T')[0] : '')
        setSelectedMetal(loadedMetals.find((m: any) => m.id === sale.digital_metal_master_id) || sale.digital_metal_master)
        setEditableMetalRate(parseFloat(sale.rate_per_gm) || 0)
        setWeight(sale.weight?.toString() || '')
        setPcs(sale.pcs?.toString() || '1')
        setOtherCharges(sale.other_charges?.toString() || '0')
        setSalesman(sale.salesman || '')
        setSalesmanId(sale.salesman_id?.toString() || '')
        setDiscount(sale.discount_amount?.toString() || '0')
        setGstPercent('3')
        setCustomerAddress(sale.customer?.kyc?.address || '')
        setPayments(sale.payment_details && sale.payment_details.length > 0 ? sale.payment_details : [{ mode: 'Cash', amount: '', ref: '' }])
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [accessToken, id])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [status, fetchData])

  // Calculations
  const metalAmount = useMemo(() => (parseFloat(weight) || 0) * editableMetalRate, [weight, editableMetalRate])
  const taxableAmount = useMemo(() => Math.max(0, metalAmount + (parseFloat(otherCharges) || 0) - (parseFloat(discount) || 0)), [metalAmount, otherCharges, discount])
  const gstAmount = useMemo(() => (taxableAmount * (parseFloat(gstPercent) || 0)) / 100, [taxableAmount, gstPercent])
  const finalAmount = useMemo(() => taxableAmount + gstAmount, [taxableAmount, gstAmount])
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments])
  const balanceDue = useMemo(() => Math.max(0, finalAmount - totalPaid), [finalAmount, totalPaid])

  // Payment Handlers
  const addPaymentRow = () => setPayments([...payments, { mode: 'Cash', amount: '', ref: '' }])
  const removePaymentRow = (index: number) => setPayments(payments.filter((_, i) => i !== index))
  const updatePayment = (index: number, field: string, value: string) => {
    const newPayments = [...payments]
    newPayments[index] = { ...newPayments[index], [field]: value }
    setPayments(newPayments)
  }

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedMetal || !weight) {
      setError('Please select customer, select metal and enter weight.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`${backendApiUrl}/digital-metal-sales/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          digital_metal_master_id: selectedMetal.id,
          voucher_no: voucherNo,
          voucher_date: voucherDate,
          weight: parseFloat(weight),
          pcs: parseInt(pcs),
          rate_per_gm: editableMetalRate,
          other_charges: parseFloat(otherCharges),
          salesman: salesman,
          salesman_id: salesmanId || null,
          markup_amount: parseFloat(selectedMetal.buy_markup_amount || '0'),
          discount_amount: parseFloat(discount),
          gst_amount: gstAmount,
          total_amount: finalAmount,
          customer_mobile: customerMobile,
          customer_address: customerAddress,
          payment_details: payments.filter(p => parseFloat(p.amount) > 0),
          status: 'Completed'
        })
      })

      if (response.ok) {
        router.push('/digital-metal/sales')
      } else {
        const json = await response.json()
        setError(json.message || 'Failed to update sale entry')
      }
    } catch (err) {
      setError('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" py={20}><CircularProgress /></Box>

  return (
    <Box sx={{ p: 4, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      <Grid container spacing={6}>
        <Grid item xs={12} md={9}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent sx={{ p: 6 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>Edit Digital Metal Sale</Typography>
              </Box>
              
              {error && <Alert severity="error" sx={{ mb: 6 }}>{error}</Alert>}

              <Box sx={{ mb: 6 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={12}>
                    <Autocomplete
                      options={customers}
                      getOptionLabel={(o) => `${o.name} (${o.mobile})`}
                      value={selectedCustomer}
                      onChange={(_, v) => {
                        setSelectedCustomer(v)
                        if (v) {
                          setCustomerMobile(v.mobile || '')
                          setCustomerAddress(v.kyc?.address || '')
                        } else {
                          setCustomerMobile('')
                          setCustomerAddress('')
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="Customer" variant="outlined" size="small" fullWidth required />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Mobile Number"
                      value={customerMobile}
                      onChange={e => setCustomerMobile(e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Select Salesman"
                      value={salesmanId}
                      onChange={e => {
                        const u = users.find(user => String(user.id) === String(e.target.value))
                        setSalesmanId(e.target.value)
                        setSalesman(u ? (u.fullName || u.name) : '')
                      }}
                      variant="outlined"
                    >
                      <MenuItem value="">Select Salesman</MenuItem>
                      {users
                        .filter(u => ['admin', 'super-admin', 'staff'].includes(u.role || ''))
                        .map(u => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.fullName || u.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Customer Address (Optional)"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      variant="outlined"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ mb: 6 }} />

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 6, borderRadius: '8px', overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>SL NO</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ITEM NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>NET WT</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>PCS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>METAL RATE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>METAL AMOUNT</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>SALESMAN</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>GST AMT</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>FINAL AMOUNT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ '& td': { py: 1, px: 1 } }}>
                      <TableCell>1</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={selectedMetal?.id || ''}
                          onChange={(e) => setSelectedMetal(metals.find(m => String(m.id) === String(e.target.value)))}
                          variant="standard"
                          InputProps={{ disableUnderline: true, style: { fontSize: '0.875rem' } }}
                        >
                          {metals.map(m => <MenuItem key={m.id} value={m.id}>{m.metal_name}</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ width: 80 }}><TextField type="number" size="small" value={weight} onChange={e => setWeight(e.target.value)} variant="standard" InputProps={{ disableUnderline: true, style: { fontSize: '0.875rem' } }} /></TableCell>
                      <TableCell sx={{ width: 60 }}><TextField type="number" size="small" value={pcs} onChange={e => setPcs(e.target.value)} variant="standard" InputProps={{ disableUnderline: true, style: { fontSize: '0.875rem' } }} /></TableCell>
                      <TableCell sx={{ width: 100 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={editableMetalRate}
                          onChange={e => setEditableMetalRate(parseFloat(e.target.value) || 0)}
                          variant="standard"
                          InputProps={{ disableUnderline: true, style: { fontSize: '0.875rem', fontWeight: 600 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ width: 100, fontWeight: 600 }}>{metalAmount.toFixed(2)}</TableCell>
                      <TableCell sx={{ width: 150 }}>
                        <Typography sx={{ fontSize: '0.875rem' }}>{salesman || '-'}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: 90, fontWeight: 600 }}>{gstAmount.toFixed(2)}</TableCell>
                      <TableCell sx={{ width: 110, fontWeight: 700, color: '#6366f1' }}>{finalAmount.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Box sx={{ position: 'sticky', top: 24 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#1e293b', py: 3, color: 'white', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Bill Summary</Typography>
              </Box>
              <CardContent sx={{ p: 5 }}>
                <Stack spacing={3}>
                    {/* Voucher Details moved to sidebar */}
                    <Box sx={{ bgcolor: '#f8fafc', p: 3, borderRadius: '12px', border: '1px solid #e2e8f0', mb: 1 }}>
                      <Stack spacing={2}>
                        <TextField label="Voucher No" value={voucherNo} size="small" fullWidth InputProps={{ readOnly: true, sx: { bgcolor: 'white' } }} />
                        <TextField type="date" label="Voucher Date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
                      </Stack>
                    </Box>

                    {/* Item Summary */}
                    <Box sx={{ mb: 1 }}>
                      <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography color="text.secondary" variant="body2">Total Weight</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{parseFloat(weight || '0').toFixed(3)} gm</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" variant="body2">Total Pcs</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{pcs || '0'}</Typography>
                      </Box>
                    </Box>

                    <Divider />

                    {/* Financial Inputs & Breakdown */}
                    <Stack spacing={2} sx={{ py: 2 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Metal Amount</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{metalAmount.toFixed(2)}</Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Other Charges</Typography>
                        <TextField 
                          size="small" 
                          type="number" 
                          value={otherCharges} 
                          onChange={e => setOtherCharges(e.target.value)} 
                          sx={{ width: 100, '& .MuiInputBase-input': { textAlign: 'right', py: 0.5 } }} 
                          variant="standard"
                        />
                      </Box>

                      <Box display="flex" justifyContent="space-between" sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: '4px' }}>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>Gross Amount</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{(metalAmount + parseFloat(otherCharges || '0')).toFixed(2)}</Typography>
                      </Box>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Discount</Typography>
                        <TextField 
                          size="small" 
                          type="number" 
                          value={discount} 
                          onChange={e => setDiscount(e.target.value)} 
                          sx={{ width: 100, '& .MuiInputBase-input': { textAlign: 'right', py: 0.5, color: '#ef4444' } }} 
                          variant="standard"
                        />
                      </Box>

                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Taxable Amount</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{taxableAmount.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>GST ({gstPercent}%)</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{gstAmount.toFixed(2)}</Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ bgcolor: '#6366f1', color: 'white', p: 3, borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }}>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, opacity: 0.9 }}>Net Payable</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>₹{finalAmount.toFixed(2)}</Typography>
                    </Box>

                    {/* Settlement Section */}
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', display: 'block', mb: 2, textTransform: 'uppercase' }}>Settlement Details</Typography>
                      <Stack spacing={2}>
                        {payments.map((p, i) => (
                          <Box key={i} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                            <Grid container spacing={1} alignItems="center">
                              <Grid item xs={6}>
                                <TextField select fullWidth size="small" value={p.mode} onChange={e => updatePayment(i, 'mode', e.target.value)} variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', fontWeight: 600 } }}>
                                  {paymentModes.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                </TextField>
                              </Grid>
                              <Grid item xs={6}>
                                <TextField fullWidth size="small" type="number" value={p.amount} onChange={e => updatePayment(i, 'amount', e.target.value)} variant="standard" placeholder="0.00" InputProps={{ disableUnderline: true, sx: { textAlign: 'right', fontSize: '0.875rem', fontWeight: 700 } }} />
                              </Grid>
                            </Grid>
                            {payments.length > 1 && (
                              <IconButton size="small" color="error" onClick={() => removePaymentRow(i)} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' }, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <i className="ri-close-line" />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <Button size="small" startIcon={<i className="ri-add-line" />} onClick={addPaymentRow} sx={{ textTransform: 'none', fontWeight: 700 }}>Add Payment Mode</Button>
                      </Stack>
                    </Box>

                    <Box sx={{ bgcolor: '#f1f5f9', p: 3, borderRadius: '12px' }}>
                      <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>Amount Paid</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981' }}>{totalPaid.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>Balance Due</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: balanceDue > 0.01 ? '#f59e0b' : '#10b981' }}>{balanceDue.toFixed(2)}</Typography>
                      </Box>
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleSubmit}
                      disabled={saving || balanceDue > 0.01 || !selectedCustomer || !selectedMetal || !weight}
                      sx={{ 
                        py: 3, 
                        borderRadius: '12px', 
                        fontWeight: 900, 
                        backgroundColor: '#1e293b',
                        '&:hover': { backgroundColor: '#0f172a' },
                        boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'
                      }}
                    >
                      {saving ? <CircularProgress size={24} color="inherit" /> : 'UPDATE TRANSACTION'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
        </Grid>

      </Grid>
    </Box>
  )
}

export default EditDigitalMetalSalePage
