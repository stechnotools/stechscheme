'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { usePageLoading } from '../../contexts/pageLoadingContext'

type SchemeResponse = {
  data: { id: number }
  scheme_id?: number
}

type SchemeLookupResponse = {
  data: Array<{
    id: number
    code?: string | null
    name?: string | null
  }>
}

type SchemeListItem = {
  id: number
  code?: string | null
  name?: string | null
  scheme_type?: string
  installment_value?: string | number
  total_installments?: number
  no_of_installment_type?: string
  item_group?: string
  installment_duration?: string
  grace_days?: number | null
  allow_overdue?: boolean
  late_fee_type?: string
  late_fee_value?: string | number
  late_fee_effect_account?: string
  min_installment_value?: string | number
  max_installments?: number | null
  maturity_months_after_last_installment?: number
  allow_bonus?: boolean
  benefit_type?: string
  benefit_mode?: string
  bonus_no_of_installments?: number | null
  bonus_effect_account?: string
  apply_rate?: string
  allow_change_rate_closing?: boolean
  wt_booked_with_gst?: boolean
  is_closed?: boolean
  remarks?: string
  description?: string
  maturity_benefits?: Array<{ month: string; type: string; value: string }>
}

type MaturityBenefitFormState = {
  month: string
  type: string
  value: string
}

type SchemeFormState = {
  name: string
  code: string
  description: string
  total_installments: string
  free_installments: string
  scheme_type: string
  start_date: string
  termination_date: string
  maturity_months_after_last_inst: string
  remarks: string
  installment_value: string
  min_installment_value: string
  grace_days: string
  closing_penalty: string
  allow_overdue: boolean
  installment_value_type: 'Fix' | 'Variable'
  bonus_mode: 'Regular' | 'Maturity Benefit'
  bonus_basis: 'Weight' | 'Amount'
  item_group: string
  late_fee_effect_account: string
  late_fee_type: 'fixed' | 'percentage'
  late_fee_value: string
  wt_booked_with_gst: boolean
  gold_rate_policy: 'enrollment_rate' | 'closing_rate'
  allow_bonus: boolean
  apply_rate: string
  installment_duration: string
  bonus_installment_count: string
  bonus_effect_account: string
  allow_change_rate_closing_entry: boolean
  is_closed: boolean
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  
return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const today = new Date()
const formatDateInput = (date: Date) => date.toISOString().slice(0, 10)
const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())

const initialFormState: SchemeFormState = {
  name: '',
  code: '',
  description: '',
  total_installments: '11',
  free_installments: '0',
  scheme_type: 'Amount',
  start_date: formatDateInput(today),
  termination_date: formatDateInput(nextMonthDate),
  maturity_months_after_last_inst: '0',
  remarks: '',
  installment_value: '1000',
  min_installment_value: '0',
  grace_days: '0',
  closing_penalty: '0',
  allow_overdue: true,
  installment_value_type: 'Fix',
  bonus_mode: 'Maturity Benefit',
  bonus_basis: 'Amount',
  item_group: '18DKT GOLD',
  late_fee_effect_account: 'Late Fee Income A/C',
  late_fee_type: 'percentage',
  late_fee_value: '0',
  wt_booked_with_gst: false,
  gold_rate_policy: 'closing_rate',
  allow_bonus: true,
  apply_rate: 'As Of First Entry',
  installment_duration: 'Monthly',
  bonus_installment_count: '0',
  bonus_effect_account: 'Bonus Expense A/C',
  allow_change_rate_closing_entry: false,
  is_closed: false
}

const initialMaturityBenefit: MaturityBenefitFormState = {
  month: '11',
  type: 'percentage',
  value: '0'
}

const fieldSx = {
  '& .MuiInputBase-root': (theme: any) => ({
    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.78) : theme.palette.background.paper
  }),
  '& .MuiInputLabel-root': (theme: any) => ({ color: theme.palette.text.secondary }),
  '& .MuiFormHelperText-root': (theme: any) => ({ color: theme.palette.text.secondary })
}

const normalizeCode = (value: string) => value.toUpperCase().replace(/\s+/g, '-')

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const CreateSchemePage = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [form, setForm] = useState<SchemeFormState>(initialFormState)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { stopLoading } = usePageLoading()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [maturityBenefits, setMaturityBenefits] = useState<MaturityBenefitFormState[]>([initialMaturityBenefit])

  // Auto-generate code from name
  const codeManuallyEdited = useRef(false)
  const hasChanges = useRef(false)

  // Copy from existing scheme
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [schemeOptions, setSchemeOptions] = useState<SchemeListItem[]>([])
  const [copyLoading, setCopyLoading] = useState(false)

  // Advanced accounting section
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Live total
  const liveTotal = Number(form.installment_value || 0) * Number(form.total_installments || 0)

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges.current) e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)

    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // Auto-generate code from scheme name
  useEffect(() => {
    if (!codeManuallyEdited.current && form.name.trim()) {
      setForm(prev => ({ ...prev, code: normalizeCode(prev.name) }))
    }
  }, [form.name])

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
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

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> } | null

      if (!response.ok) {
        const msg = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null

        throw new Error(msg || payload?.message || 'Request failed')
      }

      
return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      
return
    }

    if (status === 'authenticated') {
      setLoading(false)
      stopLoading()
    }
  }, [status, accessToken, stopLoading])

  const resetForm = useCallback(() => {
    setForm({ ...initialFormState })
    setError(null)
    setSuccess(null)
    setFieldErrors({})
    codeManuallyEdited.current = false
    hasChanges.current = false
  }, [])

  const updateForm = <K extends keyof SchemeFormState>(key: K, value: SchemeFormState[K]) => {
    hasChanges.current = true
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => {
      if (!prev[key]) return prev
      const next = { ...prev }

      delete next[key]

      return next
    })
  }

  const updateMaturityBenefit = (index: number, key: keyof MaturityBenefitFormState, value: string) => {
    hasChanges.current = true
    setMaturityBenefits(prev => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
    setFieldErrors(prev => {
      const errorKey = `maturityBenefits.${index}.${key}`

      if (!prev[errorKey]) return prev

      const next = { ...prev }

      delete next[errorKey]

      return next
    })
  }

  const addMaturityBenefit = () => {
    setMaturityBenefits(prev => [...prev, { ...initialMaturityBenefit, month: String(form.total_installments || prev.length + 1) }])
  }

  const removeMaturityBenefit = (index: number) => {
    setMaturityBenefits(prev => prev.filter((_, i) => i !== index))
    setFieldErrors(prev => {
      const next = { ...prev }

      Object.keys(next).forEach(key => {
        if (key.startsWith(`maturityBenefits.${index}.`)) {
          delete next[key]
        }
      })

      return next
    })
  }

  const openCopyDialog = async () => {
    setCopyLoading(true)
    setCopyDialogOpen(true)

    try {
      const res = await request<{ data: SchemeListItem[] }>('/schemes?per_page=100&sort_by=created_at&sort_direction=desc')

      setSchemeOptions(res.data)
    } catch {
      setSchemeOptions([])
    } finally {
      setCopyLoading(false)
    }
  }

  const handleCopyScheme = (scheme: SchemeListItem) => {
    codeManuallyEdited.current = false
    hasChanges.current = true
    setForm({
      name: scheme.name || '',
      code: scheme.code || '',
      description: scheme.description || '',
      total_installments: String(scheme.total_installments || '11'),
      free_installments: String(scheme.free_installments || '0'),
      scheme_type: scheme.scheme_type || 'Amount',
      start_date: formatDateInput(today),
      termination_date: formatDateInput(nextMonthDate),
      maturity_months_after_last_inst: String(scheme.maturity_months_after_last_installment || '0'),
      remarks: scheme.remarks || '',
      installment_value: String(scheme.installment_value || '1000'),
      min_installment_value: String(scheme.min_installment_value || '0'),
      grace_days: String(scheme.grace_days || '0'),
      closing_penalty: String(scheme.closing_penalty || '0'),
      allow_overdue: Boolean(scheme.allow_overdue),
      installment_value_type: (scheme.no_of_installment_type as 'Fix' | 'Variable') || 'Fix',
      bonus_mode: (scheme.benefit_type as 'Regular' | 'Maturity Benefit') || 'Maturity Benefit',
      bonus_basis: (scheme.benefit_mode as 'Weight' | 'Amount') || 'Amount',
      item_group: scheme.item_group || '18DKT GOLD',
      late_fee_effect_account: scheme.late_fee_effect_account || 'Late Fee Income A/C',
      late_fee_type: (scheme.late_fee_type as 'fixed' | 'percentage') || 'percentage',
      late_fee_value: String(scheme.late_fee_value || '0'),
      wt_booked_with_gst: Boolean(scheme.wt_booked_with_gst),
      gold_rate_policy: (scheme.gold_rate_policy as 'enrollment_rate' | 'closing_rate') || 'closing_rate',
      allow_bonus: Boolean(scheme.allow_bonus),
      apply_rate: scheme.apply_rate || 'As Of First Entry',
      installment_duration: scheme.installment_duration || 'Monthly',
      bonus_installment_count: String(scheme.bonus_no_of_installments || '0'),
      bonus_effect_account: scheme.bonus_effect_account || 'Bonus Expense A/C',
      allow_change_rate_closing_entry: Boolean(scheme.allow_change_rate_closing),
      is_closed: Boolean(scheme.is_closed)
    })

    if (scheme.maturity_benefits && scheme.maturity_benefits.length > 0) {
      setMaturityBenefits(scheme.maturity_benefits.map((b: any) => ({ month: String(b.month), type: b.type, value: String(b.value) })))
    }

    setCopyDialogOpen(false)
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!form.name.trim()) nextErrors.name = 'Scheme name is required.'
    if (!form.code.trim()) nextErrors.code = 'Scheme code is required.'
    if (!form.scheme_type.trim()) nextErrors.scheme_type = 'Scheme type is required.'
    if (!form.item_group.trim()) nextErrors.item_group = 'Item group is required.'
    if (!form.installment_duration.trim()) nextErrors.installment_duration = 'Installment duration is required.'

    if (!form.total_installments.trim() || Number(form.total_installments) <= 0) {
      nextErrors.total_installments = 'Total installments must be greater than 0.'
    }

    if (form.installment_value_type === 'Fix') {
      if (!form.installment_value.trim() || Number(form.installment_value) <= 0) {
        nextErrors.installment_value = 'Installment value must be greater than 0.'
      }
    } else {
      if (!form.min_installment_value.trim() || Number(form.min_installment_value) < 0) {
        nextErrors.installment_value = 'Minimum installment value is required.'
      }
    }

    if (form.allow_bonus && form.bonus_mode === 'Regular') {
      if (!form.bonus_installment_count.trim()) nextErrors.bonus_installment_count = 'Required for regular bonus.'
      if (!form.bonus_effect_account.trim()) nextErrors.bonus_effect_account = 'Required when bonus is enabled.'
    }

    if (form.allow_bonus && form.bonus_mode === 'Maturity Benefit') {
      const active = maturityBenefits.filter(item => item.month || item.value)

      if (!active.length) nextErrors['maturityBenefits'] = 'Add at least one maturity benefit row.'

      active.forEach((benefit, index) => {
        if (!benefit.month || Number(benefit.month) <= 0) nextErrors[`maturityBenefits.${index}.month`] = 'Required.'
        if (!benefit.value || Number(benefit.value) < 0) nextErrors[`maturityBenefits.${index}.value`] = 'Required.'
      })
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const nextErrors = validateForm()

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Please correct the highlighted fields and try again.')
      
return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    setFieldErrors({})

    try {
      const normalizedCode = normalizeCode(form.code.trim())

      const schemeResponse = await request<SchemeResponse>('/schemes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          code: normalizedCode,
          description: form.description.trim() || null,
          installment_value: Number(form.installment_value || 0),
          min_installment_value: Number(form.min_installment_value || 0),
          total_installments: Number(form.total_installments),
          free_installments: Number(form.free_installments || 0),
          scheme_type: form.scheme_type.trim(),
          item_group: form.item_group.trim() || null,
          start_date: null,
          termination_date: null,
          is_closed: !form.is_closed,
          no_of_installment_type: form.installment_value_type,
          min_no_of_installments: form.installment_value_type === 'Variable' ? 1 : Number(form.total_installments),
          installment_duration: form.installment_duration.trim() || null,
          grace_days: form.grace_days.trim() ? Number(form.grace_days) : 0,
          closing_penalty: Number(form.closing_penalty || 0),
          allow_overdue: form.allow_overdue,
          late_fee_type: form.late_fee_type,
          late_fee_value: Number(form.late_fee_value || 0),
          late_fee_effect_account: form.late_fee_effect_account.trim() || null,
          wt_booked_with_gst: form.wt_booked_with_gst,
          gold_rate_policy: form.gold_rate_policy,
          maturity_months_after_last_installment: form.maturity_months_after_last_inst.trim() ? Number(form.maturity_months_after_last_inst) : 0,
          apply_rate: form.apply_rate.trim() || null,
          allow_change_rate_closing: form.allow_change_rate_closing_entry,
          advance_closure_account: form.name.trim() || null,
          allow_bonus: form.allow_bonus,
          benefit_type: form.bonus_mode,
          benefit_mode: form.bonus_basis,
          bonus_no_of_installments: form.bonus_installment_count.trim() ? Number(form.bonus_installment_count) : null,
          bonus_effect_account: form.bonus_effect_account.trim() || null,
          effect_to_account: form.name.trim() || null,
          interest_receivable_account: 'Interest Receivable A/C',
          advertisement_publicity_account: form.bonus_effect_account.trim() || null,
          remarks: form.remarks.trim() || null
        })
      })

      let createdSchemeId = Number(schemeResponse.data?.id || schemeResponse.scheme_id || 0)

      if (!createdSchemeId) {
        const lookupResponse = await request<SchemeLookupResponse>(`/schemes?per_page=20&search=${encodeURIComponent(normalizedCode)}`)
        const created = lookupResponse.data.find(item => item.code === normalizedCode) || lookupResponse.data.find(item => item.name === form.name.trim())

        createdSchemeId = Number(created?.id || 0)
      }

      if (!createdSchemeId) throw new Error('Scheme was created, but the new scheme id was not returned by the server.')

      if (form.allow_bonus && form.bonus_mode === 'Maturity Benefit') {
        const activeBenefits = maturityBenefits.filter(item => item.month && item.type && item.value)

        await Promise.all(
          activeBenefits.map(item =>
            request('/scheme-maturity-benefits', {
              method: 'POST',
              body: JSON.stringify({ scheme_id: createdSchemeId, month: Number(item.month), type: 'percentage', value: Number(item.value) })
            })
          )
        )
      }

      hasChanges.current = false
      setSuccess('Scheme created successfully. Redirecting...')
      router.push('/schemes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scheme.')
    } finally {
      setSaving(false)
    }
  }

  const sectionHeaderSx = (theme: any) => ({
    px: 3, py: 1.5,
    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : theme.palette.grey[100],
    borderBottom: '1px solid', borderColor: 'divider'
  })

  const sectionBoxSx = { border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' as const }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems='flex-start'>
          <div>
            <Typography variant='h4' sx={{ mb: 1 }}>Scheme Master</Typography>
            <Typography color='text.secondary'>Create a new jewellery savings scheme with installment rules and bonus configuration.</Typography>
          </div>
          <Stack direction='row' spacing={2}>
            <Button variant='outlined' color='secondary' startIcon={<i className='ri-file-copy-line' />} onClick={() => void openCopyDialog()}>
              Copy from Existing
            </Button>
            <Button component={Link} href='/schemes' variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />}>
              Back to All Schemes
            </Button>
          </Stack>
        </Stack>
      </Grid>

      {error ? <Grid size={{ xs: 12 }}><Alert severity='error'>{error}</Alert></Grid> : null}
      {success ? <Grid size={{ xs: 12 }}><Alert severity='success'>{success}</Alert></Grid> : null}

      <Grid size={{ xs: 12, xl: 9 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider', bgcolor: theme => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.72) : theme.palette.grey[50] }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={4}>

              {/* Scheme Section */}
              <Box sx={sectionBoxSx}>
                <Box sx={sectionHeaderSx}><Typography variant='subtitle1' fontWeight={700}>Scheme</Typography></Box>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2.5}>
                        <TextField fullWidth label='Scheme Name' value={form.name} onChange={e => updateForm('name', e.target.value)} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} sx={fieldSx} />
                        <TextField fullWidth label='Scheme Code' value={form.code} onChange={e => { codeManuallyEdited.current = true; updateForm('code', normalizeCode(e.target.value)) }} error={Boolean(fieldErrors.code)} helperText={fieldErrors.code} sx={fieldSx} placeholder='Auto-generated from name' />
                        <TextField select fullWidth label='Scheme Type' value={form.scheme_type} onChange={e => updateForm('scheme_type', e.target.value)} error={Boolean(fieldErrors.scheme_type)} helperText={fieldErrors.scheme_type || (form.scheme_type === 'Amount' ? 'Customer pays INR per installment (e.g. ₹1000/month).' : 'Customer pays based on gold weight per installment (e.g. 1 gm/month).')} sx={fieldSx}>
                          <MenuItem value='Amount'>Amount</MenuItem>
                          <MenuItem value='Weight'>Weight</MenuItem>
                        </TextField>
                        <TextField select fullWidth label='Item Group' value={form.item_group} onChange={e => updateForm('item_group', e.target.value)} error={Boolean(fieldErrors.item_group)} helperText={fieldErrors.item_group} sx={fieldSx}>
                          <MenuItem value='18DKT GOLD'>18DKT GOLD</MenuItem>
                          <MenuItem value='22KT GOLD'>22KT GOLD</MenuItem>
                          <MenuItem value='SILVER'>SILVER</MenuItem>
                        </TextField>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2.5}>
                        <TextField fullWidth multiline minRows={2} label='Description' value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder='Short description shown to customers during enrollment' sx={fieldSx} />
                        <TextField fullWidth multiline label='Remarks' value={form.remarks} onChange={e => updateForm('remarks', e.target.value)} sx={fieldSx} slotProps={{ input: { sx: { alignItems: 'flex-start', '& textarea': { height: '80px !important', overflow: 'auto', resize: 'none' } } } }} />
                        <FormControlLabel control={<Checkbox checked={form.is_closed} onChange={e => updateForm('is_closed', e.target.checked)} />} label='Active' />
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              {/* Installment Section */}
              <Box sx={sectionBoxSx}>
                <Box sx={sectionHeaderSx}><Typography variant='subtitle1' fontWeight={700}>Installment</Typography></Box>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2.5}>
                        <FormControl>
                          <FormLabel>Installment Type</FormLabel>
                          <RadioGroup row value={form.installment_value_type} onChange={e => updateForm('installment_value_type', e.target.value as SchemeFormState['installment_value_type'])}>
                            <FormControlLabel value='Fix' control={<Radio />} label='Fix' />
                            <FormControlLabel value='Variable' control={<Radio />} label='Variable' />
                          </RadioGroup>
                          <Typography variant='caption' color='text.secondary'>
                            {form.installment_value_type === 'Fix' ? 'Fixed: Same value for every customer (e.g. ₹1000 x 11 months).' : 'Variable: Customer chooses value at enrollment.'}
                          </Typography>
                        </FormControl>
                        <TextField fullWidth type='number' label='No Of Installment' value={form.total_installments} onChange={e => updateForm('total_installments', e.target.value)} error={Boolean(fieldErrors.total_installments)} helperText={fieldErrors.total_installments} sx={fieldSx} />
                        <TextField fullWidth type='number' label='Free Installments' value={form.free_installments} onChange={e => updateForm('free_installments', e.target.value)} sx={fieldSx} helperText='Number of free installments company gives (e.g. 1)' />
                        <TextField fullWidth type='number' label={form.installment_value_type === 'Fix' ? 'Installment Value (₹)' : 'Minimum Installment Value (₹)'} value={form.installment_value_type === 'Fix' ? form.installment_value : form.min_installment_value} onChange={e => updateForm(form.installment_value_type === 'Fix' ? 'installment_value' : 'min_installment_value', e.target.value)} error={Boolean(fieldErrors.installment_value)} helperText={fieldErrors.installment_value} sx={fieldSx} />
                        <TextField select fullWidth label='Installment Duration' value={form.installment_duration} onChange={e => updateForm('installment_duration', e.target.value)} error={Boolean(fieldErrors.installment_duration)} helperText={fieldErrors.installment_duration} sx={fieldSx}>
                          <MenuItem value='Monthly'>Monthly</MenuItem>
                          <MenuItem value='Weekly'>Weekly</MenuItem>
                        </TextField>
                        <TextField fullWidth type='number' label='Grace Days' value={form.grace_days} onChange={e => updateForm('grace_days', e.target.value)} sx={fieldSx} />
                        <TextField fullWidth type='number' label='Closing Penalty (%)' value={form.closing_penalty} onChange={e => updateForm('closing_penalty', e.target.value)} sx={fieldSx} helperText='Penalty deducted if customer closes before completing all installments' />
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2.5}>
                        <FormControl>
                          <FormLabel>Allow Overdue Inst</FormLabel>
                          <RadioGroup row value={form.allow_overdue ? 'Yes' : 'No'} onChange={e => updateForm('allow_overdue', e.target.value === 'Yes')}>
                            <FormControlLabel value='Yes' control={<Radio />} label='Yes' />
                            <FormControlLabel value='No' control={<Radio />} label='No' />
                          </RadioGroup>
                        </FormControl>
                        <TextField select fullWidth label='Late Fee Type' value={form.late_fee_type} onChange={e => updateForm('late_fee_type', e.target.value as SchemeFormState['late_fee_type'])} disabled={!form.allow_overdue} sx={fieldSx}>
                          <MenuItem value='percentage'>Percentage (%)</MenuItem>
                          <MenuItem value='fixed'>Fixed Amount (₹)</MenuItem>
                        </TextField>
                        <TextField fullWidth type='number' label={form.late_fee_type === 'percentage' ? 'Late Fee (%)' : 'Late Fee (₹)'} value={form.late_fee_value} onChange={e => updateForm('late_fee_value', e.target.value)} disabled={!form.allow_overdue} sx={fieldSx} />
                        <TextField fullWidth type='number' label='Maturity Months After Last Inst' value={form.maturity_months_after_last_inst} onChange={e => updateForm('maturity_months_after_last_inst', e.target.value)} sx={fieldSx} />
                        <FormControlLabel control={<Checkbox checked={form.allow_change_rate_closing_entry} onChange={e => updateForm('allow_change_rate_closing_entry', e.target.checked)} />} label='Allow To Change Rate In Closing Entry' />
                        <FormControlLabel control={<Checkbox checked={form.wt_booked_with_gst} onChange={e => updateForm('wt_booked_with_gst', e.target.checked)} />} label='Wt. Booked With GST' />
                        <TextField select fullWidth label='Gold Rate Policy' value={form.gold_rate_policy} onChange={e => updateForm('gold_rate_policy', e.target.value as SchemeFormState['gold_rate_policy'])} sx={fieldSx}>
                          <MenuItem value='closing_rate'>Closing Rate</MenuItem>
                          <MenuItem value='enrollment_rate'>Enrollment Rate</MenuItem>
                        </TextField>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              {/* Bonus & Maturity Section */}
              <Box sx={sectionBoxSx}>
                <Box sx={sectionHeaderSx}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                    <FormControlLabel control={<Checkbox checked={form.allow_bonus} onChange={e => updateForm('allow_bonus', e.target.checked)} />} label='Allow For Bonus' />
                    <RadioGroup row value={form.bonus_mode} onChange={e => updateForm('bonus_mode', e.target.value as SchemeFormState['bonus_mode'])}>
                      <FormControlLabel value='Regular' control={<Radio />} label='Regular' />
                      <FormControlLabel value='Maturity Benefit' control={<Radio />} label='Maturity Benefit' />
                    </RadioGroup>
                  </Stack>
                </Box>
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2.5}>
                        <RadioGroup row value={form.bonus_basis} onChange={e => updateForm('bonus_basis', e.target.value as SchemeFormState['bonus_basis'])}>
                          <FormControlLabel value='Weight' control={<Radio />} label='Weight' />
                          <FormControlLabel value='Amount' control={<Radio />} label='Amount' />
                        </RadioGroup>
                        <TextField select fullWidth label='Apply Rate' value={form.apply_rate} onChange={e => updateForm('apply_rate', e.target.value)} sx={fieldSx}>
                          <MenuItem value='As Of First Entry'>As Of First Entry</MenuItem>
                          <MenuItem value='As Of Last Entry'>As Of Last Entry</MenuItem>
                          <MenuItem value='As Of Closing'>As Of Closing</MenuItem>
                        </TextField>
                        <TextField fullWidth type='number' label='No.Of Installment' value={form.bonus_installment_count} onChange={e => updateForm('bonus_installment_count', e.target.value)} disabled={!form.allow_bonus || form.bonus_mode !== 'Regular'} error={Boolean(fieldErrors.bonus_installment_count)} helperText={fieldErrors.bonus_installment_count} sx={fieldSx} />
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ height: '100%', minHeight: 220, border: '1px dashed', borderColor: 'divider', borderRadius: 1, bgcolor: theme => theme.palette.mode === 'dark' ? alpha(theme.palette.background.default, 0.5) : theme.palette.grey[50] }}>
                        <Stack spacing={2} sx={{ p: 3 }}>
                          <Stack direction='row' justifyContent='space-between' alignItems='center'>
                            <Typography variant='subtitle2'>Maturity Benefit</Typography>
                            <Button variant='outlined' color='secondary' onClick={addMaturityBenefit} disabled={!form.allow_bonus || form.bonus_mode !== 'Maturity Benefit'}>Add Benefit</Button>
                          </Stack>
                          {fieldErrors.maturityBenefits ? <Alert severity='error'>{fieldErrors.maturityBenefits}</Alert> : null}
                          <Stack spacing={2}>
                            {maturityBenefits.map((benefit, index) => (
                              <Grid container spacing={2} key={`${index}-${benefit.month}`}>
                                <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth type='number' label='Month' value={benefit.month} onChange={e => updateMaturityBenefit(index, 'month', e.target.value)} disabled={!form.allow_bonus || form.bonus_mode !== 'Maturity Benefit'} error={Boolean(fieldErrors[`maturityBenefits.${index}.month`])} helperText={fieldErrors[`maturityBenefits.${index}.month`]} sx={fieldSx} /></Grid>
                                <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth type='number' label='Percentage (%)' value={benefit.value} onChange={e => updateMaturityBenefit(index, 'value', e.target.value)} disabled={!form.allow_bonus || form.bonus_mode !== 'Maturity Benefit'} error={Boolean(fieldErrors[`maturityBenefits.${index}.value`])} helperText={fieldErrors[`maturityBenefits.${index}.value`]} sx={fieldSx} /></Grid>
                                <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconButton color='error' onClick={() => removeMaturityBenefit(index)} disabled={maturityBenefits.length === 1 || !form.allow_bonus || form.bonus_mode !== 'Maturity Benefit'}><i className='ri-delete-bin-line' /></IconButton></Grid>
                              </Grid>
                            ))}
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>Create a month-wise maturity schedule when the scheme uses maturity benefits.</Typography>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              {/* Advanced Accounting Section (collapsed) */}
              <Box sx={sectionBoxSx}>
                <Box sx={(theme) => ({ ...sectionHeaderSx(theme), cursor: 'pointer', userSelect: 'none' })} onClick={() => setShowAdvanced(!showAdvanced)}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='subtitle1' fontWeight={700}>Advanced Accounting</Typography>
                    <i className={showAdvanced ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} style={{ ml: 'auto' }} />
                  </Stack>
                </Box>
                <Collapse in={showAdvanced}>
                  <Box sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      <TextField select fullWidth label='Late Fee Effect A/C' value={form.late_fee_effect_account} onChange={e => updateForm('late_fee_effect_account', e.target.value)} sx={fieldSx}>
                        <MenuItem value='Late Fee Income A/C'>Late Fee Income A/C</MenuItem>
                        <MenuItem value='None'>None</MenuItem>
                      </TextField>
                      <TextField select fullWidth label='Bonus Effect A/C' value={form.bonus_effect_account} onChange={e => updateForm('bonus_effect_account', e.target.value)} disabled={!form.allow_bonus} sx={fieldSx}>
                        <MenuItem value='Advertisement & Publicity A/C'>Advertisement & Publicity A/C</MenuItem>
                        <MenuItem value='Bonus Expense A/C'>Bonus Expense A/C</MenuItem>
                      </TextField>
                      <Typography variant='caption' color='text.secondary'>Internal accounting accounts used in ledger entries. Defaults are auto-set on save.</Typography>
                    </Stack>
                  </Box>
                </Collapse>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
                <Button variant='outlined' color='secondary' onClick={resetForm} disabled={saving}>Reset</Button>
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Scheme'}</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Live Summary */}
      <Grid size={{ xs: 12, xl: 3 }}>
        <Card sx={{ height: '100%', bgcolor: theme => theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.72) : theme.palette.background.paper }}>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h6'>Live Summary</Typography>
                <Typography variant='body2' color='text.secondary'>Quick read of the scheme configuration before saving.</Typography>
              </div>
              <Divider />
              <div>
                <Typography variant='body2' color='text.secondary'>Scheme</Typography>
                <Typography fontWeight={600}>{form.name || 'Untitled scheme'}</Typography>
                <Typography variant='body2' color='text.secondary'>{form.code || 'No code yet'}</Typography>
                {form.description ? <Typography variant='caption' color='text.secondary'>{form.description}</Typography> : null}
              </div>
              <div>
                <Typography variant='body2' color='text.secondary'>Plan</Typography>
                <Typography fontWeight={600}>
                  {form.scheme_type === 'Amount' ? 'INR ' : ''}{form.installment_value || '0'}{form.scheme_type === 'Weight' ? ' gm' : ''} x {form.total_installments || '0'} inst.
                  {Number(form.free_installments || 0) > 0 ? ` (+ ${form.free_installments} free)` : ''}
                </Typography>
                <Typography variant='body2' color='text.secondary' fontWeight={500}>
                  Total: {currencyFormatter.format(liveTotal)}{Number(form.free_installments || 0) > 0 ? ` + ${currencyFormatter.format(Number(form.installment_value || 0) * Number(form.free_installments || 0))} free` : ''}
                </Typography>
                <Typography variant='caption' color='text.secondary'>{form.installment_value_type} {form.scheme_type === 'Amount' ? 'amount' : 'weight'}</Typography>
              </div>
              <div>
                <Typography variant='body2' color='text.secondary'>Penalties & Rate</Typography>
                <Typography fontWeight={600}>{form.allow_overdue ? (form.late_fee_type === 'percentage' ? `${form.late_fee_value || '0'}%` : `₹${form.late_fee_value || '0'}`) : 'N/A'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {form.allow_overdue ? 'Overdue allowed' : 'Overdue blocked'}
                  {Number(form.closing_penalty || 0) > 0 ? ` · Closing penalty ${form.closing_penalty}%` : ''}
                </Typography>
                <Typography variant='body2' color='text.secondary'>Rate: {form.gold_rate_policy === 'closing_rate' ? 'Closing rate' : 'Enrollment rate'}</Typography>
              </div>
              <div>
                <Typography variant='body2' color='text.secondary'>Bonus</Typography>
                <Typography fontWeight={600}>{form.allow_bonus ? form.bonus_mode : 'Bonus disabled'}</Typography>
                <Typography variant='body2' color='text.secondary'>{form.is_closed ? 'Active' : 'Inactive'}</Typography>
              </div>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Copy from Existing Dialog */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Copy from Existing Scheme</DialogTitle>
        <DialogContent>
          {copyLoading ? (
            <Typography color='text.secondary' sx={{ py: 4 }}>Loading schemes...</Typography>
          ) : schemeOptions.length === 0 ? (
            <Typography color='text.secondary' sx={{ py: 4 }}>No existing schemes found.</Typography>
          ) : (
            <TextField select fullWidth label='Select a scheme to copy' defaultValue=''>
              <MenuItem value=''>-- Select --</MenuItem>
              {schemeOptions.map(s => (
                <MenuItem key={s.id} value={String(s.id)} onClick={() => handleCopyScheme(s)}>
                  {s.name} — {s.code} ({s.scheme_type}, {s.total_installments} inst.)
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CreateSchemePage
