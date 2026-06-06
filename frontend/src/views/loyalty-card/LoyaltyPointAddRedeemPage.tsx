'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Autocomplete from '@mui/material/Autocomplete'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import { resolveBackendApiUrl, type Customer } from '../customers/customerData'

const LoyaltyPointAddRedeemPage = ({ 
  onClose, 
  initialCustomerId,
  editVoucherNo
}: { 
  onClose?: () => void
  initialCustomerId?: string
  editVoucherNo?: string
}) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [achievement, setAchievement] = useState<any>(null)
  const [achievementOpen, setAchievementOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    voucherPrefix: '',
    voucherNo: '',
    voucherDate: new Date().toISOString().split('T')[0],
    cardNo: '',
    customerId: '',
    customerName: '',
    address: '',
    city: '',
    phone: '',
    creditPoint: 0,
    addPoint: 0,
    redeemPoint: 0,
    closingPoint: 0,
    narration: ''
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [voucherPrefixes, setVoucherPrefixes] = useState<string[]>([])

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

      const payload = (await response.json().catch(() => null)) as { message?: string; data?: any } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadNextVoucherNo = useCallback(async (currentPrefix?: string) => {
    if (!accessToken) return null
    try {
      const url = currentPrefix 
        ? `/loyalty-point-adjustments/next-voucher-no?prefix=${encodeURIComponent(currentPrefix)}`
        : '/loyalty-point-adjustments/next-voucher-no'
      const response = await request<{ prefix: string; next_no: number }>(url)
      const prefix = response.prefix || 'LC'

      // Guarantee option exists in dropdown state array
      setVoucherPrefixes(prev => {
        if (!prev.includes(prefix)) {
          return Array.from(new Set([...prev, prefix]))
        }
        return prev
      })

      setFormData(prev => ({
        ...prev,
        voucherPrefix: prefix,
        voucherNo: String(response.next_no)
      }))
      return response
    } catch (err) {
      console.error('Failed to load next voucher no', err)
      return null
    }
  }, [accessToken, request])

  const handlePrefixChange = async (newPrefix: string) => {
    setFormData(prev => ({ ...prev, voucherPrefix: newPrefix }))
    await loadNextVoucherNo(newPrefix)
  }

  const loadVoucherDetails = useCallback(async () => {
    if (!accessToken || !editVoucherNo) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-point-adjustments/${encodeURIComponent(editVoucherNo)}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (response.ok && payload) {
        const parts = payload.voucher_no ? payload.voucher_no.split(/[\s\/]+/) : []
        const prefix = parts[0] || 'LC'
        const numPart = parts[1] || '1'

        const customer = payload.customer
        const kyc = customer?.kyc
        const addressParts = []
        if (kyc?.address) addressParts.push(kyc.address)
        if (kyc?.city) addressParts.push(kyc.city)
        if (kyc?.state) addressParts.push(kyc.state)
        if (kyc?.pincode) addressParts.push(kyc.pincode)
        const fullAddress = addressParts.join(', ')

        const addP = Number(payload.add_points) || 0
        const redeemP = Number(payload.redeem_points) || 0
        const currentBalance = Number(customer?.loyalty_points_balance) || 0
        const openingBalance = currentBalance - addP + redeemP

        setFormData({
          voucherPrefix: prefix,
          voucherNo: numPart,
          voucherDate: payload.transaction_date ? payload.transaction_date.split(' ')[0].split('T')[0] : new Date().toISOString().split('T')[0],
          cardNo: customer?.loyalty_card_no || '',
          customerId: String(payload.customer_id),
          customerName: customer?.name || '',
          address: fullAddress,
          city: customer?.kyc?.city || '',
          phone: customer?.mobile || '',
          creditPoint: openingBalance,
          addPoint: addP,
          redeemPoint: redeemP,
          closingPoint: openingBalance + addP - redeemP,
          narration: payload.narration || ''
        })
      } else {
        setError(payload.message || 'Failed to load voucher details')
      }
    } catch (err) {
      console.error('Failed to load voucher details', err)
      setError('An error occurred while loading voucher details')
    } finally {
      setLoading(false)
    }
  }, [accessToken, editVoucherNo])

  useEffect(() => {
    if (editVoucherNo) {
      void loadVoucherDetails()
    }
  }, [editVoucherNo, loadVoucherDetails])

  useEffect(() => {
    if (accessToken) {
      // 1. Fetch voucher setups to populate dynamic prefixes list first
      fetch(`${resolveBackendApiUrl()}/voucher-setup`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      .then(res => res.json())
      .then(json => {
        if (json.data && Array.isArray(json.data)) {
          // Filter ONLY setups that match 'Loyalty Card Redemption' or 'Loyalty Point Add/Redeem'
          const relevantSetups = json.data.filter((item: any) => 
            item.transaction_type === 'Loyalty Card Redemption' || 
            item.transaction_type === 'Loyalty Point Add/Redeem'
          )
          const prefixes = relevantSetups
            .map((item: any) => item.prefix)
            .filter((p: any) => !!p)
          
          setVoucherPrefixes(Array.from(new Set(prefixes)))

          // 2. Locate specifically the matching configuration setup
          const loyaltySetup = relevantSetups[0]
          const defaultPrefix = loyaltySetup?.prefix || 'LC'

          // 3. Request sequence start and increments specifically for this prefix
          if (!editVoucherNo) {
            void loadNextVoucherNo(defaultPrefix)
          }
        } else {
          if (!editVoucherNo) {
            void loadNextVoucherNo()
          }
        }
      })
      .catch(err => {
        console.error('Error fetching voucher setups', err)
        if (!editVoucherNo) {
          void loadNextVoucherNo()
        }
      })
    }
  }, [accessToken, editVoucherNo])

  useEffect(() => {
    if (voucherPrefixes.length > 0 && !formData.voucherPrefix) {
      setFormData(prev => ({
        ...prev,
        voucherPrefix: voucherPrefixes[0]
      }))
    }
  }, [voucherPrefixes, formData.voucherPrefix])

  const loadInitialCustomer = useCallback(async () => {
    if (!accessToken || !initialCustomerId) return
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/customers/${initialCustomerId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (payload.data) {
        handleCustomerSelect(payload.data)
      }
    } catch (err) {
      console.error('Failed to load initial customer', err)
    }
  }, [accessToken, initialCustomerId])

  useEffect(() => {
    void loadInitialCustomer()
  }, [loadInitialCustomer])

  const searchCustomers = useCallback(async (query: string) => {
    if (!accessToken || query.length < 2) return

    setSearchLoading(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/customers?search=${query}&per_page=20`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const data = await response.json()
      setCustomers(data.data || [])
    } catch (err) {
      console.error('Failed to search customers', err)
    } finally {
      setSearchLoading(false)
    }
  }, [accessToken])

  const handleCustomerSelect = (customer: Customer | null) => {
    if (customer) {
      const kyc = customer.kyc
      const addressParts = []
      if (kyc?.address) addressParts.push(kyc.address)
      if (kyc?.city) addressParts.push(kyc.city)
      if (kyc?.state) addressParts.push(kyc.state)
      if (kyc?.pincode) addressParts.push(kyc.pincode)
      const fullAddress = addressParts.join(', ')

      setFormData(prev => ({
        ...prev,
        customerId: String(customer.id),
        cardNo: customer.loyalty_card_no || '',
        customerName: customer.name || '',
        address: fullAddress,
        city: customer.kyc?.city || '',
        phone: customer.mobile || '',
        creditPoint: Number(customer.loyalty_points_balance) || 0,
        closingPoint: Number(customer.loyalty_points_balance) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        customerId: '',
        cardNo: '',
        customerName: '',
        address: '',
        city: '',
        phone: '',
        creditPoint: 0,
        closingPoint: 0
      }))
    }
  }

  const handlePointsChange = (field: 'addPoint' | 'redeemPoint', value: string) => {
    const numValue = parseFloat(value) || 0
    setFormData(prev => {
      const newAdd = field === 'addPoint' ? numValue : prev.addPoint
      const newRedeem = field === 'redeemPoint' ? numValue : prev.redeemPoint
      const newClosing = prev.creditPoint + newAdd - newRedeem
      return {
        ...prev,
        [field]: numValue,
        closingPoint: newClosing
      }
    })
  }
  const handleSubmit = async () => {
    if (!formData.customerId) {
      setError('Please select a customer')
      return
    }

    if (!formData.address.trim()) {
      setError('Address is required.')
      return
    }

    if (formData.addPoint === 0 && formData.redeemPoint === 0) {
      setError('Please enter points to add or redeem')
      return
    }

    if (formData.addPoint < 0 || formData.redeemPoint < 0) {
      setError('Points cannot be negative numbers')
      return
    }

    if (formData.closingPoint < 0) {
      setError(`Negative point redemption is not possible. Customer has only ${formData.creditPoint.toFixed(2)} points available.`)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const url = editVoucherNo 
        ? `/loyalty-point-adjustments/${encodeURIComponent(editVoucherNo)}`
        : '/loyalty-point-adjustments'
      const method = editVoucherNo ? 'PUT' : 'POST'

      const res = await request<any>(url, {
        method: method,
        body: JSON.stringify({
          customer_id: formData.customerId,
          voucher_no: `${formData.voucherPrefix} ${formData.voucherNo}`,
          transaction_date: formData.voucherDate,
          address: formData.address.trim(),
          add_points: formData.addPoint,
          redeem_points: formData.redeemPoint,
          narration: formData.narration
        })
      })

      if (res.achievement) {
        setAchievement(res.achievement)
        setAchievementOpen(true)
      } else {
        setSuccess(editVoucherNo ? 'Loyalty points adjusted updated successfully' : 'Loyalty points adjusted successfully')
      }

      if (editVoucherNo) {
        if (onClose && !res.achievement) {
          setTimeout(onClose, 2000)
        }
      } else {
        // Automatically update next voucher number and clear form for next entry atomically
        const nextVoucher = await loadNextVoucherNo(formData.voucherPrefix)
        setFormData(prev => ({
          ...prev,
          voucherPrefix: nextVoucher?.prefix || prev.voucherPrefix || 'LC',
          voucherNo: nextVoucher ? String(nextVoucher.next_no) : prev.voucherNo,
          customerId: '',
          cardNo: '',
          customerName: '',
          address: '',
          city: '',
          phone: '',
          creditPoint: 0,
          addPoint: 0,
          redeemPoint: 0,
          closingPoint: 0,
          narration: ''
        }))
        
        // If there's an onClose handler (like in a dialog), we might want to wait a bit
        if (onClose && !res.achievement) {
          setTimeout(onClose, 2000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save adjustment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 6, bgcolor: '#fdfbf7', minHeight: '100vh' }}>
      <Card variant='outlined' sx={{ border: 'none', bgcolor: 'transparent' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={8}>
            {error && <Alert severity='error'>{error}</Alert>}
            {success && <Alert severity='success'>{success}</Alert>}
            {/* Vertical Column Layout for Main Fields */}
            <Grid container spacing={10}>
              {/* Left Column */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={8}>
                  <Stack direction='row' alignItems='center' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100 }}>Voucher No.</Typography>
                    <Stack direction='row' spacing={2}>
                    <TextField
                      select
                      size='small'
                      value={formData.voucherPrefix}
                      onChange={e => handlePrefixChange(e.target.value)}
                      SelectProps={{ native: true }}
                      sx={{ width: 120, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                    >
                      {voucherPrefixes.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </TextField>
                    <TextField
                      size='small'
                      value={formData.voucherNo}
                      onChange={e => setFormData(prev => ({ ...prev, voucherNo: e.target.value }))}
                      sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                    />
                  </Stack>
                  </Stack>

                  <Stack direction='row' alignItems='center' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100 }}>Card No</Typography>
                    <Autocomplete
                      fullWidth
                      size='small'
                      options={customers}
                      disabled={!!editVoucherNo}
                      getOptionLabel={option => {
                        if (!option) return ''
                        if (typeof option === 'string') return option
                        return `${option.loyalty_card_no || ''} - ${option.name || ''}`
                      }}
                      onInputChange={(_, value) => searchCustomers(value)}
                      onChange={(_, value) => handleCustomerSelect(value)}
                      value={customers.find(c => String(c.id) === formData.customerId) || (formData.customerId ? { id: formData.customerId, name: formData.customerName, loyalty_card_no: formData.cardNo } as any : null) || null}
                      loading={searchLoading}
                      renderInput={params => (
                        <TextField 
                          {...params} 
                          placeholder='Search...'
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                        />
                      )}
                    />
                  </Stack>

                  <Stack direction='row' alignItems='center' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100 }}>Party Name</Typography>
                    <Autocomplete
                      fullWidth
                      size='small'
                      options={customers}
                      disabled={!!editVoucherNo}
                      getOptionLabel={option => {
                        if (!option) return ''
                        if (typeof option === 'string') return option
                        return option.name || ''
                      }}
                      onInputChange={(_, value) => searchCustomers(value)}
                      onChange={(_, value) => handleCustomerSelect(value)}
                      value={customers.find(c => String(c.id) === formData.customerId) || (formData.customerId ? { id: formData.customerId, name: formData.customerName, loyalty_card_no: formData.cardNo } as any : null) || null}
                      loading={searchLoading}
                      sx={{ maxWidth: 450 }}
                      renderInput={params => (
                        <TextField 
                          {...params} 
                          placeholder='Search Name...'
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                        />
                      )}
                    />
                  </Stack>
                </Stack>
              </Grid>

              {/* Right Column */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={8}>
                  <Stack direction='row' alignItems='center' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100 }}>Voucher Date</Typography>
                    <TextField
                      type='date'
                      fullWidth
                      size='small'
                      value={formData.voucherDate}
                      onChange={e => setFormData(prev => ({ ...prev, voucherDate: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                    />
                  </Stack>

                  <Stack direction='row' alignItems='center' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100 }}>Mobile No</Typography>
                    <Autocomplete
                      fullWidth
                      size='small'
                      options={customers}
                      disabled={!!editVoucherNo}
                      getOptionLabel={option => {
                        if (!option) return ''
                        if (typeof option === 'string') return option
                        return option.mobile || ''
                      }}
                      onInputChange={(_, value) => searchCustomers(value)}
                      onChange={(_, value) => handleCustomerSelect(value)}
                      value={customers.find(c => String(c.id) === formData.customerId) || (formData.customerId ? { id: formData.customerId, name: formData.customerName, mobile: formData.phone } as any : null) || null}
                      loading={searchLoading}
                      sx={{ maxWidth: 250 }}
                      renderInput={params => (
                        <TextField 
                          {...params} 
                          placeholder='Search Mobile...'
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                        />
                      )}
                    />
                  </Stack>

                  <Stack direction='row' alignItems='flex-start' spacing={6}>
                    <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100, mt: 2 }}>
                      Address <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      size='small'
                      multiline
                      rows={2}
                      value={formData.address}
                      onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder='Customer Address'
                      required
                      sx={{ maxWidth: 225, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
                    />
                  </Stack>
                </Stack>
              </Grid>
            </Grid>

            {/* Point Summary Row - Compact & Single Line */}
            <Box sx={{ py: 4 }}>
              <Grid container spacing={3}>
                {[
                  { label: 'CURRENT BALANCE', value: formData.creditPoint, icon: 'ri-wallet-3-line', color: '#64748b' },
                  { label: 'POINTS TO ADD', value: formData.addPoint, icon: 'ri-add-circle-line', color: '#22c55e', isEditable: true, field: 'addPoint' },
                  { label: 'POINTS TO REDEEM', value: formData.redeemPoint, icon: 'ri-indeterminate-circle-line', color: '#ef4444', isEditable: true, field: 'redeemPoint' },
                  { label: 'FINAL BALANCE', value: formData.closingPoint, icon: 'ri-checkbox-circle-line', color: '#3b82f6' }
                ].map((stat, idx) => (
                  <Grid size={{ xs: 3 }} key={idx}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: '#e2e8f0',
                        bgcolor: 'white',
                        minHeight: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: stat.color,
                          boxShadow: `0 4px 12px ${stat.color}15`,
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Box display='flex' alignItems='center' gap={1.5} mb={1}>
                        <Box sx={{ color: stat.color, display: 'flex' }}>
                          <i className={stat.icon} style={{ fontSize: '16px' }} />
                        </Box>
                        <Typography variant='caption' sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.6rem', letterSpacing: '0.5px' }}>
                          {stat.label}
                        </Typography>
                      </Box>
                      {stat.isEditable ? (
                        <TextField
                          size='small'
                          type='number'
                          value={stat.value || ''}
                          onChange={e => handlePointsChange(stat.field as any, e.target.value)}
                          variant='standard'
                          InputProps={{ 
                            disableUnderline: false,
                            sx: { fontWeight: 700, fontSize: '1.1rem', height: 28 }
                          }}
                          fullWidth
                        />
                      ) : (
                        <Typography variant='h6' sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e293b' }}>
                          {stat.value.toFixed(2)}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Narration */}
            <Stack direction='row' alignItems='flex-start' spacing={6}>
              <Typography sx={{ fontWeight: 500, color: '#555', minWidth: 100, mt: 2 }}>Narration</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.narration}
                onChange={e => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                placeholder='Enter narration here...'
                sx={{ maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'white' } }}
              />
            </Stack>

            {/* Footer Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 4, pt: 4 }}>
              <Button 
                variant='outlined' 
                color='secondary'
                onClick={onClose}
                sx={{ px: 8, borderRadius: 2 }}
              >
                Cancel
              </Button>
              <Button 
                variant='contained' 
                onClick={handleSubmit}
                disabled={loading}
                sx={{ px: 10, borderRadius: 2, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
              >
                {loading ? 'Saving...' : 'Save Entry'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
      {/* Achievement Celebration Dialog */}
      <Dialog 
        open={achievementOpen} 
        onClose={() => {
          setAchievementOpen(false)
          if (onClose) onClose()
        }}
        maxWidth='xs'
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #fff 0%, #fff9f0 100%)'
          }
        }}
      >
        <Box sx={{ p: 8, textAlign: 'center' }}>
          <Box sx={{ mb: 6 }}>
            <i className='ri-medal-line' style={{ fontSize: '4rem', color: '#ffb400' }} />
          </Box>
          <Typography variant='h5' sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
            Congratulations!
          </Typography>
          <Typography variant='body1' sx={{ mb: 6, color: 'text.secondary', fontWeight: 500 }}>
            {achievement?.upgraded 
              ? `Your customer has been upgraded to ${achievement.new_level_name}!`
              : 'A new milestone has been achieved!'}
          </Typography>

          <Card variant='outlined' sx={{ mb: 8, bgcolor: 'rgba(255, 180, 0, 0.05)', borderColor: 'rgba(255, 180, 0, 0.2)', borderRadius: 3 }}>
            <CardContent sx={{ py: '16px !important' }}>
              <Typography variant='overline' sx={{ fontWeight: 700, color: 'text.secondary' }}>Reward Earned</Typography>
              <Typography variant='h6' sx={{ fontWeight: 800, color: '#b48a00' }}>
                {achievement?.gift}
              </Typography>
            </CardContent>
          </Card>

          <Button 
            fullWidth 
            variant='contained' 
            onClick={() => {
              setAchievementOpen(false)
              if (onClose) onClose()
            }}
            sx={{ py: 3, borderRadius: 2, fontWeight: 700 }}
          >
            Awesome!
          </Button>
        </Box>
      </Dialog>
    </Box>
  )
}

export default LoyaltyPointAddRedeemPage

