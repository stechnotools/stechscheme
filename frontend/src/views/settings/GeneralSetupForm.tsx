'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Box,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const GeneralSetupForm = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [activeTab, setActiveTab] = useState(0)

  const [form, setForm] = useState<Record<string, any>>({
    // Tab 1 fields
    gst_rate_1: '3',
    gst_rate_2: '0',
    gst_invoice_text: '1.5% CGST + 1.5% SGST',
    gst_rounding: 'Regular (round)',
    igst_required: 'No',
    igst_rate: '',
    igst_invoice_text: '',
    hsn_gold: '710813',
    hsn_silver: '710610',
    hsn_platinum: '71101900',
    pan_limit_standard: '199999',
    pan_limit_digital: '100',
    abandoned_cart_wait_hrs: '1:30',
    
    // Tab 2 fields: Digital Gold Setup
    bill_round_off: 'No',
    buy_digital_gold: 'Stop',
    sell_digital_gold: 'Start',
    sell_after_hours: '1',
    amount_rounding: 'Regular (round)',
    sell_auth_required: 'Yes',
    sell_cancel_cheque_required: 'Yes',
    redeem_gold_option: 'Variable',
    validation_tool: '-- Select --',
    buying_option: 'Buy in Rupees and Grams(Both)',
    display_redeem_amount: 'Yes',
    show_agent_code: 'No',
    // Tab 3 fields: Terms & Conditions Setup
    buy_terms_link: '',
    sell_terms_link: '',
    lease_terms_link: '',
    redeem_terms_link: ''
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${backendApiUrl}${path}`, {
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

  const loadData = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<any>(`/settings/general-settings`)
      if (response.data?.value) {
        setForm(prev => ({ ...prev, ...response.data.value }))
      }
    } catch (err) {
      console.error('Failed to load settings', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, loadData])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await request(`/settings/general-settings`, {
        method: 'PUT',
        body: JSON.stringify({ value: form })
      })

      setSuccess('Settings saved successfully.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={10}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant='h4' sx={{ mb: 1, fontWeight: 600 }}>General setup</Typography>
          <Typography color='text.secondary'>Manage core application preferences used across branches and operations.</Typography>
        </Box>
        <Button 
          variant='contained' 
          size='large' 
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <i className="ri-save-line" />}
          onClick={handleSave} 
          disabled={saving}
          sx={{ px: 8, borderRadius: '8px', boxShadow: '0 4px 14px 0 rgba(115, 103, 240, 0.39)' }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label="settings tabs">
            <Tab label="GST & KYC Setup" sx={{ fontWeight: 600 }} />
            <Tab label="Digital Gold Setup" sx={{ fontWeight: 600 }} />
            <Tab label="Terms & Conditions" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>
      </Grid>

      <Grid item xs={12}>
        {error && <Alert severity='error' sx={{ mb: 4, borderRadius: '8px' }}>{error}</Alert>}
        {success && <Alert severity='success' sx={{ mb: 4, borderRadius: '8px' }}>{success}</Alert>}
      </Grid>

      {/* Tab 1: GST & KYC */}
      {activeTab === 0 && (
        <>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
              <CardContent sx={{ p: 6 }}>
                <Box display="flex" alignItems="center" sx={{ mb: 6 }}>
                  <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: 'rgba(115, 103, 240, 0.1)', color: '#7367F0', mr: 3, display: 'flex' }}>
                    <i className="ri-percent-line" style={{ fontSize: '1.5rem' }} />
                  </Box>
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>Digi Gold GST Setup</Typography>
                </Box>
                <Grid container spacing={5}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="GST % 1" value={form.gst_rate_1 ?? ''} onChange={e => setForm({ ...form, gst_rate_1: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="GST % 2" value={form.gst_rate_2 ?? ''} onChange={e => setForm({ ...form, gst_rate_2: e.target.value })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="GST Display Text For Invoice" value={form.gst_invoice_text ?? ''} onChange={e => setForm({ ...form, gst_invoice_text: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth label="GST Rounding By" value={form.gst_rounding ?? ''} onChange={e => setForm({ ...form, gst_rounding: e.target.value })}>
                      <MenuItem value='Regular (round)'>Regular (round)</MenuItem>
                      <MenuItem value='Up'>Up</MenuItem>
                      <MenuItem value='Down'>Down</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset" fullWidth sx={{ pt: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}>Required IGST For Inter State</Typography>
                      <RadioGroup row value={form.igst_required ?? 'No'} onChange={e => setForm({ ...form, igst_required: e.target.value })}>
                        <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                        <FormControlLabel value='No' control={<Radio />} label='No' />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="IGST Percentage" value={form.igst_rate ?? ''} onChange={e => setForm({ ...form, igst_rate: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="IGST Display Text" value={form.igst_invoice_text ?? ''} onChange={e => setForm({ ...form, igst_invoice_text: e.target.value })} /></Grid>
                  <Grid item xs={12}><Divider sx={{ my: 2 }}><Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>HSN Codes</Typography></Divider></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Gold HSN" value={form.hsn_gold ?? ''} onChange={e => setForm({ ...form, hsn_gold: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Silver HSN" value={form.hsn_silver ?? ''} onChange={e => setForm({ ...form, hsn_silver: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="Platinum HSN" value={form.hsn_platinum ?? ''} onChange={e => setForm({ ...form, hsn_platinum: e.target.value })} /></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Grid container spacing={6}>
              <Grid item xs={12}>
                <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
                  <CardContent sx={{ p: 6 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 6 }}>
                      <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: 'rgba(255, 159, 67, 0.1)', color: '#FF9F43', mr: 3, display: 'flex' }}><i className="ri-shield-user-line" style={{ fontSize: '1.5rem' }} /></Box>
                      <Typography variant='h6' sx={{ fontWeight: 600 }}>KYC Setup</Typography>
                    </Box>
                    <Grid container spacing={5}>
                      <Grid item xs={12}><TextField fullWidth label="Max Transaction Limit (Standard)" helperText="Without PAN card requirement" value={form.pan_limit_standard ?? ''} onChange={e => setForm({ ...form, pan_limit_standard: e.target.value })} /></Grid>
                      <Grid item xs={12}><TextField fullWidth label="Max Transaction Limit (Digital Gold)" helperText="Without PAN card requirement" value={form.pan_limit_digital ?? ''} onChange={e => setForm({ ...form, pan_limit_digital: e.target.value })} /></Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
                  <CardContent sx={{ p: 6 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 6 }}>
                      <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: 'rgba(0, 207, 232, 0.1)', color: '#00CFE8', mr: 3, display: 'flex' }}><i className="ri-shopping-cart-2-line" style={{ fontSize: '1.5rem' }} /></Box>
                      <Typography variant='h6' sx={{ fontWeight: 600 }}>Abandoned Cart</Typography>
                    </Box>
                    <Grid container spacing={5}>
                      <Grid item xs={12}>
                        <TextField select fullWidth label="Send reminder after" value={form.abandoned_cart_wait_hrs ?? ''} onChange={e => setForm({ ...form, abandoned_cart_wait_hrs: e.target.value })}>
                          <MenuItem value='0:30'>30 Minutes</MenuItem>
                          <MenuItem value='1:00'>1 Hour</MenuItem>
                          <MenuItem value='1:30'>1 Hour 30 Minutes</MenuItem>
                          <MenuItem value='2:00'>2 Hours</MenuItem>
                          <MenuItem value='3:00'>3 Hours</MenuItem>
                        </TextField>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </>
      )}

      {/* Tab 2: Digital Gold Setup */}
      {activeTab === 1 && (
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
            <CardContent sx={{ p: 6 }}>
              <Box display="flex" alignItems="center" sx={{ mb: 6 }}>
                <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: 'rgba(115, 103, 240, 0.1)', color: '#7367F0', mr: 3, display: 'flex' }}>
                  <i className="ri-coin-line" style={{ fontSize: '1.5rem' }} />
                </Box>
                <Typography variant='h6' sx={{ fontWeight: 600 }}>Digital Gold Setup</Typography>
              </Box>
              
              <Grid container spacing={6}>
                {/* Row 1 */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Bill Round Off Value</Typography>
                    <RadioGroup row value={form.bill_round_off ?? 'No'} onChange={e => setForm({ ...form, bill_round_off: e.target.value })}>
                      <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                      <FormControlLabel value='No' control={<Radio />} label='No' />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Buy Digital Gold</Typography>
                    <RadioGroup row value={form.buy_digital_gold ?? 'Stop'} onChange={e => setForm({ ...form, buy_digital_gold: e.target.value })}>
                      <FormControlLabel value='Start' control={<Radio />} label='Start' />
                      <FormControlLabel value='Stop' control={<Radio />} label='Stop' />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Row 2 */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Sell Digital Gold</Typography>
                    <RadioGroup row value={form.sell_digital_gold ?? 'Start'} onChange={e => setForm({ ...form, sell_digital_gold: e.target.value })}>
                      <FormControlLabel value='Start' control={<Radio />} label='Start' />
                      <FormControlLabel value='Stop' control={<Radio />} label='Stop' />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Allowed to Sell Digital Gold After</Typography>
                    <Box display="flex" alignItems="center">
                      <TextField size="small" sx={{ width: 80, mr: 2 }} value={form.sell_after_hours ?? ''} onChange={e => setForm({...form, sell_after_hours: e.target.value})} />
                      <Typography variant="body1">Hours of Buy Digital Gold.</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Row 3 */}
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Digital Gold Amount Rounding By</Typography>
                    <TextField select size="small" sx={{ width: 250 }} value={form.amount_rounding ?? ''} onChange={e => setForm({...form, amount_rounding: e.target.value})}>
                      <MenuItem value='Regular (round)'>Regular (round)</MenuItem>
                      <MenuItem value='Up'>Up</MenuItem>
                      <MenuItem value='Down'>Down</MenuItem>
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Customer Authentication Required for Sell Digital Gold</Typography>
                    <RadioGroup row value={form.sell_auth_required ?? 'Yes'} onChange={e => setForm({ ...form, sell_auth_required: e.target.value })}>
                      <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                      <FormControlLabel value='No' control={<Radio />} label='No' />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Row 4 */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Digital Gold Sell Cancel Cheque Required</Typography>
                    <RadioGroup row value={form.sell_cancel_cheque_required ?? 'Yes'} onChange={e => setForm({ ...form, sell_cancel_cheque_required: e.target.value })}>
                      <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                      <FormControlLabel value='No' control={<Radio />} label='No' />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Redeem Gold Option</Typography>
                    <TextField select size="small" sx={{ width: 250 }} value={form.redeem_gold_option ?? ''} onChange={e => setForm({...form, redeem_gold_option: e.target.value})}>
                      <MenuItem value='Variable'>Variable</MenuItem>
                      <MenuItem value='Fixed'>Fixed</MenuItem>
                    </TextField>
                  </Box>
                </Grid>

                {/* Row 5 */}
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Cheque and Bank Passbook Validation Tool</Typography>
                    <TextField select size="small" sx={{ width: 250 }} value={form.validation_tool ?? ''} onChange={e => setForm({...form, validation_tool: e.target.value})}>
                      <MenuItem value='-- Select --'>-- Select --</MenuItem>
                      <MenuItem value='Tool A'>Tool A</MenuItem>
                      <MenuItem value='Tool B'>Tool B</MenuItem>
                    </TextField>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Digital Gold Buying Option</Typography>
                    <TextField select size="small" sx={{ width: 250 }} value={form.buying_option ?? ''} onChange={e => setForm({...form, buying_option: e.target.value})}>
                      <MenuItem value='Buy in Rupees and Grams(Both)'>Buy in Rupees and Grams(Both)</MenuItem>
                      <MenuItem value='Buy in Rupees'>Buy in Rupees Only</MenuItem>
                      <MenuItem value='Buy in Grams'>Buy in Grams Only</MenuItem>
                    </TextField>
                  </Box>
                </Grid>

                {/* Row 6 */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Display Amount while Redeem Gold</Typography>
                    <RadioGroup row value={form.display_redeem_amount ?? 'Yes'} onChange={e => setForm({ ...form, display_redeem_amount: e.target.value })}>
                      <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                      <FormControlLabel value='No' control={<Radio />} label='No' />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Show Digital Gold Agent Code</Typography>
                    <RadioGroup row value={form.show_agent_code ?? 'No'} onChange={e => setForm({ ...form, show_agent_code: e.target.value })}>
                      <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                      <FormControlLabel value='No' control={<Radio />} label='No' />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Row 7 */}
                <Grid item xs={12} md={6}>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Buy Digital Agent Code Label</Typography>
                    <TextField size="small" sx={{ width: 250 }} placeholder="Enter buy digital agent code label" value={form.agent_code_label ?? ''} onChange={e => setForm({...form, agent_code_label: e.target.value})} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Tab 3: Terms & Conditions Setup */}
      {activeTab === 2 && (
        <Grid item xs={12}>
          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
            <CardContent sx={{ p: 6 }}>
              <Box display="flex" alignItems="center" sx={{ mb: 6 }}>
                <Box sx={{ p: 2, borderRadius: '8px', backgroundColor: 'rgba(54, 162, 235, 0.1)', color: '#36A2EB', mr: 3, display: 'flex' }}>
                  <i className="ri-file-list-3-line" style={{ fontSize: '1.5rem' }} />
                </Box>
                <Typography variant='h6' sx={{ fontWeight: 600 }}>Terms & Conditions Setup</Typography>
              </Box>
              
              <Grid container spacing={6}>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600, maxWidth: '250px' }}>Digital Gold Buy Terms & Conditions Link</Typography>
                    <TextField fullWidth sx={{ maxWidth: '400px' }} placeholder="https://drive.google.com/file/d/..." value={form.buy_terms_link ?? ''} onChange={e => setForm({...form, buy_terms_link: e.target.value})} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600, maxWidth: '250px' }}>Digital Gold Sell Terms & Conditions Link</Typography>
                    <TextField fullWidth sx={{ maxWidth: '400px' }} placeholder="https://drive.google.com/file/d/..." value={form.sell_terms_link ?? ''} onChange={e => setForm({...form, sell_terms_link: e.target.value})} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600, maxWidth: '250px' }}>Digital Gold Lease Terms & Conditions Link</Typography>
                    <TextField fullWidth sx={{ maxWidth: '400px' }} placeholder="https://drive.google.com/file/d/..." value={form.lease_terms_link ?? ''} onChange={e => setForm({...form, lease_terms_link: e.target.value})} />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                    <Typography variant="body1" sx={{ fontWeight: 600, maxWidth: '250px' }}>Digital Gold Redeem Terms & Conditions Link</Typography>
                    <TextField fullWidth sx={{ maxWidth: '400px' }} placeholder="https://drive.google.com/file/d/..." value={form.redeem_terms_link ?? ''} onChange={e => setForm({...form, redeem_terms_link: e.target.value})} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default GeneralSetupForm
