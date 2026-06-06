'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

import { SkeletonTable } from '@/components/SkeletonLoader'
import { resolveBackendApiUrl } from '../customers/customerData'
import type { 
  LoyaltySetup, 
  PointsSetupLine, 
  GroupWisePointsLine, 
  CategoryLevelLine 
} from './loyaltySetupData'

// Styled components
const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.grey[50],
  '& .MuiTableCell-head': {
    fontWeight: 700,
    color: theme.palette.text.primary,
    borderBottom: `2px solid ${theme.palette.divider}`,
    py: 1.5
  }
}))

const LoyaltySetupPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as any)?.accessToken

  const [view, setView] = useState<'list' | 'form'>('list')
  const [tabValue, setTabValue] = useState(0)
  const [setups, setSetups] = useState<LoyaltySetup[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [metalMasters, setMetalMasters] = useState<any[]>([])
  
  // Selection states for dynamic tables
  const [selectedPoints, setSelectedPoints] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedIntroducers, setSelectedIntroducers] = useState<string[]>([])

  const initialSetup: LoyaltySetup = {
    setup_code: '',
    setup_name: '',
    status: 'Active',
    from_date: null,
    to_date: null,
    loyalty_program: 'Default Program',
    currency: 'INR',
    rounding_method: 'Nearest',
    description: '',
    enable_loyalty_program: true,
    allow_earn_points: true,
    allow_redeem_points: true,
    allow_expiry: false,
    point_expiry_months: 12,
    point_calculation_on: 'Net Amount',
    points_setup_overall: [],
    group_wise_points_setup: [],
    category_level_setup: [],
    point_value: 1,
    min_redeem_points: 100,
    max_redeem_points_per_txn: 5000,
    allow_partial_redemption: true,
    allow_redemption_on_discounted: true,
    redemption_validation: 'OTP',
    excluded_categories: [],
    notify_on_credit: true,
    notify_on_redemption: true,
    notify_before_expiry: true,
    points_for_every_wt_global: null,
    points_to_be_earned_wt_global: null,
    allow_introducer_points: false,
    introducer_benefit_setup: [],
    notes: ''
  }

  const [formData, setFormData] = useState<LoyaltySetup>(initialSetup)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) throw new Error('Missing access token')

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
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
      return payload
    },
    [accessToken]
  )

  const loadSetups = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await request<{ data: LoyaltySetup[] }>('/loyalty-setups')
      setSetups(res.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load setups')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const loadLogs = useCallback(async () => {
    if (!accessToken) return
    setLoadingLogs(true)
    try {
      const res = await request<{ data: any[] }>('/loyalty-setups/logs')
      setLogs(res.data || [])
    } catch (err) {
      // Silently fail
    } finally {
      setLoadingLogs(false)
    }
  }, [accessToken, request])

  const loadCategories = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await request<{ data: any[] }>('/loyalty-card-categories')
      setCategories(res.data || [])
    } catch (err) {
      // Silently fail
    }
  }, [accessToken, request])

  const loadMetalMasters = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await request<{ success: boolean; data: any[] }>('/digital-metal-masters')
      if (res.success) {
        setMetalMasters(res.data || [])
      }
    } catch (err) {
      // Silently fail
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadSetups()
      void loadCategories()
      void loadMetalMasters()
    }
  }, [status, loadSetups, loadCategories, loadMetalMasters])

  // Handlers
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      // Validation for weight-based setups
      const hasWeightBasedSetup = formData.group_wise_points_setup.some(
        line => line.calculation_basis === 'Weight' || line.calculation_basis === 'Both'
      )

      if (hasWeightBasedSetup) {
        if (!formData.points_for_every_wt_global || !formData.points_to_be_earned_wt_global) {
          throw new Error('Weight-based point calculation (Points for Every & To Be Earned) must be defined in the Notes tab.')
        }
      }

      const method = formData.id ? 'PUT' : 'POST'
      const path = formData.id ? `/loyalty-setups/${formData.id}` : '/loyalty-setups'
      await request(path, {
        method,
        body: JSON.stringify(formData)
      })
      setSuccess(`Setup ${formData.id ? 'updated' : 'created'} successfully`)
      setView('list')
      void loadSetups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this setup?')) return
    try {
      await request(`/loyalty-setups/${id}`, { method: 'DELETE' })
      setSuccess('Setup deleted successfully')
      void loadSetups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleEdit = (setup: LoyaltySetup) => {
    setFormData({ 
      ...setup,
      from_date: setup.from_date ? setup.from_date.substring(0, 10) : null,
      to_date: setup.to_date ? setup.to_date.substring(0, 10) : null,
      points_setup_overall: Array.isArray(setup.points_setup_overall) ? setup.points_setup_overall : [],
      group_wise_points_setup: Array.isArray(setup.group_wise_points_setup) ? setup.group_wise_points_setup : [],
      category_level_setup: Array.isArray(setup.category_level_setup) ? setup.category_level_setup : [],
      excluded_categories: Array.isArray(setup.excluded_categories) ? setup.excluded_categories : [],
      points_for_every_wt_global: setup.points_for_every_wt_global !== null ? Number(setup.points_for_every_wt_global) : null,
      points_to_be_earned_wt_global: setup.points_to_be_earned_wt_global ?? null,
      introducer_benefit_setup: Array.isArray(setup.introducer_benefit_setup) ? setup.introducer_benefit_setup : [],
      allow_introducer_points: setup.allow_introducer_points ?? false
    })
    setView('form')
    setTabValue(0)
  }

  const handleNew = () => {
    setFormData(initialSetup)
    setView('form')
    setTabValue(0)
  }

  // Dynamic Table Handlers
  const addPointsLine = () => {
    const newLine: PointsSetupLine = {
      id: Math.random().toString(36).substr(2, 9),
      from_amount: 0,
      to_amount: 0,
      points_for_every: 100,
      points_to_be_earned: 1,
      min_points_to_earn: 0,
      max_points_to_earn: 0,
      status: 'Active'
    }
    setFormData(prev => ({
      ...prev,
      points_setup_overall: [...prev.points_setup_overall, newLine]
    }))
  }

  const addGroupLine = () => {
    const newLine: GroupWisePointsLine = {
      id: Math.random().toString(36).substr(2, 9),
      group_code: '',
      group_name: '',
      calculation_basis: 'Amount',
      from_amount: 0,
      to_amount: 0,
      points_for_every_amt: 0,
      points_to_be_earned_amt: 0,
      from_weight: 0,
      to_weight: 0,
      points_for_every_wt: 0,
      points_to_be_earned_wt: 0,
      status: 'Active'
    }
    setFormData(prev => ({
      ...prev,
      group_wise_points_setup: [...prev.group_wise_points_setup, newLine]
    }))
  }

  const addLevelLine = () => {
    const newLine: CategoryLevelLine = {
      id: Math.random().toString(36).substr(2, 9),
      level_code: '',
      level_name: '',
      from_points: 0,
      to_points: 0,
      reward_gift: '',
      gift_description: '',
      status: 'Active'
    }
    setFormData(prev => ({
      ...prev,
      category_level_setup: [...prev.category_level_setup, newLine]
    }))
  }
  
  const addIntroducerLine = () => {
    const newLine: any = {
      id: Math.random().toString(36).substr(2, 9),
      from_points: 0,
      to_points: 0,
      card_category: '',
      benefit_type: 'Value',
      benefit_points: 0,
      reward_gift: false,
      gift_name: '',
      benefit_description: '',
      status: 'Active'
    }
    setFormData(prev => ({
      ...prev,
      introducer_benefit_setup: [...prev.introducer_benefit_setup, newLine]
    }))
  }

  const removeLevelLines = () => {
    setFormData(prev => ({
      ...prev,
      category_level_setup: prev.category_level_setup.filter(line => !selectedLevels.includes(line.id))
    }))
    setSelectedLevels([])
  }

  const removePointsLines = () => {
    setFormData(prev => ({
      ...prev,
      points_setup_overall: prev.points_setup_overall.filter(line => !selectedPoints.includes(line.id))
    }))
    setSelectedPoints([])
  }

  const removeGroupLines = () => {
    setFormData(prev => ({
      ...prev,
      group_wise_points_setup: prev.group_wise_points_setup.filter(line => !selectedGroups.includes(line.id))
    }))
    setSelectedGroups([])
  }

  const removeIntroducerLines = () => {
    setFormData(prev => ({
      ...prev,
      introducer_benefit_setup: prev.introducer_benefit_setup.filter(line => !selectedIntroducers.includes(line.id))
    }))
    setSelectedIntroducers([])
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Action Bar (Reference Screen Style) */}
      <Card sx={{ mb: 6, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction='row' spacing={1} sx={{ p: 1.5, bgcolor: 'grey.50' }}>
          <Button 
            size='small' 
            startIcon={<i className='ri-list-check' />} 
            onClick={() => setView('list')}
            sx={{ fontWeight: 600, color: view === 'list' ? 'primary.main' : 'text.primary' }}
          >
            List
          </Button>
          <Button size='small' startIcon={<i className='ri-save-line' />} onClick={handleSave} disabled={saving || view === 'list'} sx={{ fontWeight: 600, color: view === 'form' ? 'primary.main' : 'text.disabled' }}>Save</Button>
          <Button size='small' startIcon={<i className='ri-add-line' />} onClick={handleNew} sx={{ fontWeight: 600 }}>New</Button>
          <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
          <Button size='small' startIcon={<i className='ri-checkbox-circle-line' />} sx={{ fontWeight: 600, color: 'success.main' }}>Activate</Button>
          <Button size='small' startIcon={<i className='ri-close-circle-line' />} sx={{ fontWeight: 600, color: 'warning.main' }}>Inactivate</Button>
          <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
          <Button size='small' startIcon={<i className='ri-refresh-line' />} onClick={() => void loadSetups()} sx={{ fontWeight: 600 }}>Refresh</Button>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size='small'><i className='ri-question-line' /></IconButton>
          <IconButton size='small'><i className='ri-fullscreen-line' /></IconButton>
          <IconButton size='small'><i className='ri-close-line' /></IconButton>
          <Box sx={{ flexGrow: 1 }} />
          {view === 'list' && (
            <TextField
              size='small'
              placeholder='Search...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 200, '& .MuiInputBase-root': { height: 32, fontSize: '0.875rem' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
          )}
        </Stack>
      </Card>

      {/* Breadcrumbs / Title */}
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {view === 'form' ? (formData.id ? 'Edit Loyalty Setup' : 'New Loyalty Setup') : 'Loyalty Setup Master'}
        </Typography>
        {view === 'form' && (
          <Chip label={formData.status} size='small' color={formData.status === 'Active' ? 'success' : 'error'} variant='tonal' />
        )}
      </Stack>

      {error && <Alert severity='error' sx={{ mb: 4 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 4 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {view === 'list' ? (
        <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              size='small'
              placeholder='Search setups...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
            <IconButton onClick={() => void loadSetups()} color='primary'>
              <i className='ri-refresh-line' />
            </IconButton>
          </Box>
          <TableContainer>
            <Table>
              <StyledTableHead>
                <TableRow>
                  <TableCell>Setup Code</TableCell>
                  <TableCell>Setup Name</TableCell>
                  <TableCell>Loyalty Program</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Validity</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </StyledTableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
                      <SkeletonTable rows={5} cols={6} />
                    </TableCell>
                  </TableRow>
                ) : setups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center' sx={{ py: 10 }}>
                      <Typography color='text.secondary'>No loyalty setups found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  setups.filter(s => 
                    s.setup_code.toLowerCase().includes(search.toLowerCase()) ||
                    s.setup_name.toLowerCase().includes(search.toLowerCase())
                  ).map(setup => (
                    <TableRow key={setup.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{setup.setup_code}</TableCell>
                      <TableCell>{setup.setup_name}</TableCell>
                      <TableCell>{setup.loyalty_program}</TableCell>
                      <TableCell>
                        <Chip 
                          label={setup.status} 
                          size='small' 
                          color={setup.status === 'Active' ? 'success' : 'error'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell>
                        {setup.from_date ? new Date(setup.from_date as string).toLocaleDateString() : '-'} to {setup.to_date ? new Date(setup.to_date as string).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title='Edit'>
                          <IconButton onClick={() => handleEdit(setup)} color='primary' size='small'>
                            <i className='ri-edit-line' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete'>
                          <IconButton onClick={() => handleDelete(setup.id!)} color='error' size='small'>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Box sx={{ pb: 10 }}>
          <Card sx={{ mb: 6, borderRadius: '12px' }}>
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label='Setup Code'
                    value={formData.setup_code || ''}
                    onChange={e => setFormData({ ...formData, setup_code: e.target.value })}
                    placeholder='LOYALTY-001'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField
                    fullWidth
                    label='Setup Name'
                    value={formData.setup_name || ''}
                    onChange={e => setFormData({ ...formData, setup_name: e.target.value })}
                    placeholder='Default Loyalty Program'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label='Status'
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='Active'>Active</MenuItem>
                    <MenuItem value='Inactive'>Inactive</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                  <TextField
                    type='date'
                    fullWidth
                    label='From Date'
                    value={formData.from_date || ''}
                    onChange={e => setFormData({ ...formData, from_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                  <TextField
                    type='date'
                    fullWidth
                    label='To Date'
                    value={formData.to_date || ''}
                    onChange={e => setFormData({ ...formData, to_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)}
            sx={{ 
              mb: 6,
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 120 }
            }}
          >
            <Tab label='General' />
            <Tab label='Redemption' />
            <Tab label='Others' />
            <Tab label='Notes' />
          </Tabs>

          {/* Tab Panels */}
          {tabValue === 0 && (
            <Stack spacing={4}>
              <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider', mb: 6 }}>
                <CardContent sx={{ p: '0 !important' }}>
                  <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <i className='ri-information-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
                    <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      General Information
                    </Typography>
                  </Box>
                  <Box sx={{ p: 6 }}>
                    <Grid container spacing={8}>
                      {/* Left: Basic Inputs */}
                      <Grid size={{ xs: 12, lg: 6 }}>
                        <Grid container spacing={4}>
                          <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField 
                              select 
                              fullWidth 
                              label='Loyalty Program' 
                              size='small'
                              value={formData.loyalty_program || ''}
                              onChange={e => setFormData({ ...formData, loyalty_program: e.target.value })}
                            >
                              <MenuItem value='Default Program'>Default Program</MenuItem>
                              <MenuItem value='Premium Program'>Premium Program</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField 
                              select 
                              fullWidth 
                              label='Currency'
                              size='small'
                              value={formData.currency || ''}
                              onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                              <MenuItem value='INR'>INR</MenuItem>
                              <MenuItem value='USD'>USD</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField 
                              select 
                              fullWidth 
                              label='Rounding Method'
                              size='small'
                              value={formData.rounding_method || ''}
                              onChange={e => setFormData({ ...formData, rounding_method: e.target.value })}
                            >
                              <MenuItem value='Nearest'>Nearest</MenuItem>
                              <MenuItem value='Round Up'>Round Up</MenuItem>
                              <MenuItem value='Round Down'>Round Down</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField 
                              fullWidth 
                              multiline 
                              rows={3} 
                              label='Description'
                              size='small'
                              placeholder='Enter loyalty program description...'
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* Center: Control Options */}
                      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <Stack spacing={1}>
                          <FormControlLabel 
                            control={<Checkbox size='small' checked={formData.enable_loyalty_program} onChange={e => setFormData({ ...formData, enable_loyalty_program: e.target.checked })} />} 
                            label={<Typography variant='body2' sx={{ fontWeight: 500 }}>Enable Loyalty Program</Typography>} 
                          />
                          <FormControlLabel 
                            control={<Checkbox size='small' checked={formData.allow_earn_points} onChange={e => setFormData({ ...formData, allow_earn_points: e.target.checked })} />} 
                            label={<Typography variant='body2' sx={{ fontWeight: 500 }}>Allow Earn Points</Typography>} 
                          />
                          <FormControlLabel 
                            control={<Checkbox size='small' checked={formData.allow_redeem_points} onChange={e => setFormData({ ...formData, allow_redeem_points: e.target.checked })} />} 
                            label={<Typography variant='body2' sx={{ fontWeight: 500 }}>Allow Redeem Points</Typography>} 
                          />
                          <FormControlLabel 
                            control={<Checkbox size='small' checked={formData.allow_expiry} onChange={e => setFormData({ ...formData, allow_expiry: e.target.checked })} />} 
                            label={<Typography variant='body2' sx={{ fontWeight: 500 }}>Allow Expiry</Typography>} 
                          />
                          <Box sx={{ pt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                              Point Expiry (Months)
                            </Typography>
                            <TextField 
                              size='small' 
                              type='number' 
                              disabled={!formData.allow_expiry}
                              value={formData.point_expiry_months || ''}
                              onChange={e => setFormData({ ...formData, point_expiry_months: parseInt(e.target.value) })}
                              sx={{ width: 80, '& .MuiInputBase-input': { py: 1 } }}
                            />
                          </Box>
                        </Stack>
                      </Grid>

                      {/* Right: Point Calculation */}
                      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                        <Box sx={{ 
                          p: 4, 
                          border: '1px solid', 
                          borderColor: 'divider', 
                          borderRadius: '8px',
                          bgcolor: 'background.paper',
                          height: '100%',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <Typography variant='caption' sx={{ mb: 3, display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                            Point Calculation On
                          </Typography>
                          <RadioGroup 
                            value={formData.point_calculation_on || 'Net Amount'}
                            onChange={e => setFormData({ ...formData, point_calculation_on: e.target.value })}
                          >
                            <FormControlLabel value='Net Amount' control={<Radio size='small' />} label={<Typography variant='body2'>Net Amount</Typography>} />
                            <FormControlLabel value='Gross Amount' control={<Radio size='small' />} label={<Typography variant='body2'>Gross Amount</Typography>} />
                            <FormControlLabel value='Net Weight' control={<Radio size='small' />} label={<Typography variant='body2'>Net Weight</Typography>} />
                          </RadioGroup>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>

              {/* Points Setup - Overall */}
              <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: '0 !important' }}>
                  <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Points Setup - Overall (Based on Purchase Value)
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                    <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addPointsLine} sx={{ textTransform: 'none' }}>Add Line</Button>
                    <Button 
                      startIcon={<i className='ri-delete-bin-line' />} 
                      size='small' 
                      color='error' 
                      onClick={removePointsLines}
                      disabled={selectedPoints.length === 0}
                      sx={{ textTransform: 'none' }}
                    >
                      Delete Line
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size='small'>
                      <StyledTableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40 }}>
                            <Checkbox 
                              size='small' 
                              checked={formData.points_setup_overall.length > 0 && selectedPoints.length === formData.points_setup_overall.length}
                              indeterminate={selectedPoints.length > 0 && selectedPoints.length < formData.points_setup_overall.length}
                              onChange={e => setSelectedPoints(e.target.checked ? formData.points_setup_overall.map(l => l.id) : [])}
                            />
                          </TableCell>
                          <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'From Weight (Gram)' : 'From Amount (INR)'}</TableCell>
                          <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'To Weight (Gram)' : 'To Amount (INR)'}</TableCell>
                          <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'Points For Every (Gram)' : 'Points For Every (INR)'}</TableCell>
                          <TableCell>Points To Be Earned</TableCell>
                          <TableCell>Min Points To Earn</TableCell>
                          <TableCell>Max Points To Earn</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </StyledTableHead>
                      <TableBody>
                        {formData.points_setup_overall.map((line, index) => (
                          <TableRow key={line.id} hover selected={selectedPoints.includes(line.id)}>
                            <TableCell>
                              <Checkbox 
                                size='small' 
                                checked={selectedPoints.includes(line.id)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedPoints([...selectedPoints, line.id])
                                  else setSelectedPoints(selectedPoints.filter(id => id !== line.id))
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.from_amount ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].from_amount = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.to_amount ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].to_amount = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.points_for_every ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].points_for_every = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.points_to_be_earned ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].points_to_be_earned = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.min_points_to_earn ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].min_points_to_earn = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.max_points_to_earn ?? ''} onChange={e => { const n = [...formData.points_setup_overall]; n[index].max_points_to_earn = parseFloat(e.target.value) || 0; setFormData({ ...formData, points_setup_overall: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select fullWidth size='small' variant='standard' value={line.status || 'Active'} onChange={e => { const n = [...formData.points_setup_overall]; n[index].status = e.target.value; setFormData({ ...formData, points_setup_overall: n }) }}>
                                <MenuItem value='Active'>Active</MenuItem>
                                <MenuItem value='Inactive'>Inactive</MenuItem>
                              </TextField>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Group Wise Points Setup */}
              <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: '0 !important' }}>
                  <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Group Wise Points Setup
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                    <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addGroupLine} sx={{ textTransform: 'none' }}>Add Line</Button>
                    <Button 
                      startIcon={<i className='ri-delete-bin-line' />} 
                      size='small' 
                      color='error' 
                      onClick={removeGroupLines}
                      disabled={selectedGroups.length === 0}
                      sx={{ textTransform: 'none' }}
                    >
                      Delete Line
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size='small'>
                      <StyledTableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40 }}>
                            <Checkbox 
                              size='small' 
                              checked={formData.group_wise_points_setup.length > 0 && selectedGroups.length === formData.group_wise_points_setup.length}
                              indeterminate={selectedGroups.length > 0 && selectedGroups.length < formData.group_wise_points_setup.length}
                              onChange={e => setSelectedGroups(e.target.checked ? formData.group_wise_points_setup.map(l => l.id) : [])}
                            />
                          </TableCell>
                          <TableCell>Group Code</TableCell>
                          <TableCell>Group Name</TableCell>
                          <TableCell>Basis</TableCell>
                          <TableCell>Min. Purchase / Wt</TableCell>
                          <TableCell>Max. Purchase / Wt</TableCell>
                          <TableCell>Points For Every</TableCell>
                          <TableCell>Points To Be Earned</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </StyledTableHead>
                      <TableBody>
                        {formData.group_wise_points_setup.map((line, index) => (
                          <TableRow key={line.id} hover selected={selectedGroups.includes(line.id)}>
                            <TableCell>
                              <Checkbox 
                                size='small' 
                                checked={selectedGroups.includes(line.id)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedGroups([...selectedGroups, line.id])
                                  else setSelectedGroups(selectedGroups.filter(id => id !== line.id))
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField 
                                select
                                fullWidth 
                                size='small' 
                                variant='standard' 
                                value={line.group_code || ''} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = e.target.value;
                                  n[index].group_code = val;
                                  const selectedMetal = metalMasters.find(m => String(m.erp_metal_id) === String(val));
                                  if (selectedMetal) n[index].group_name = selectedMetal.metal_name;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }}
                              >
                                {metalMasters.map(m => (
                                  <MenuItem key={m.id} value={m.erp_metal_id || ''}>{m.erp_metal_id} ({m.metal_name})</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' InputProps={{ readOnly: true }} value={line.group_name || ''} /></TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select fullWidth size='small' variant='standard' value={line.calculation_basis || 'Amount'} onChange={e => { const n = [...formData.group_wise_points_setup]; n[index].calculation_basis = e.target.value as any; setFormData({ ...formData, group_wise_points_setup: n }) }}>
                                <MenuItem value='Amount'>Amount</MenuItem>
                                <MenuItem value='Weight'>Weight</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.from_weight ?? '') : (line.from_amount ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].from_weight = val; else n[index].from_amount = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.to_weight ?? '') : (line.to_amount ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].to_weight = val; else n[index].to_amount = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.points_for_every_wt ?? '') : (line.points_for_every_amt ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].points_for_every_wt = val; else n[index].points_for_every_amt = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.points_to_be_earned_wt ?? '') : (line.points_to_be_earned_amt ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].points_to_be_earned_wt = val; else n[index].points_to_be_earned_amt = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select fullWidth size='small' variant='standard' value={line.status || 'Active'} onChange={e => { const n = [...formData.group_wise_points_setup]; n[index].status = e.target.value; setFormData({ ...formData, group_wise_points_setup: n }) }}>
                                <MenuItem value='Active'>Active</MenuItem>
                                <MenuItem value='Inactive'>Inactive</MenuItem>
                              </TextField>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Category / Level Setup */}
              <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: '0 !important' }}>
                  <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Category / Level Setup (Points Range)
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
                    <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addLevelLine} sx={{ textTransform: 'none' }}>Add Line</Button>
                    <Button 
                      startIcon={<i className='ri-delete-bin-line' />} 
                      size='small' 
                      color='error' 
                      onClick={removeLevelLines}
                      disabled={selectedLevels.length === 0}
                      sx={{ textTransform: 'none' }}
                    >
                      Delete Line
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size='small'>
                      <StyledTableHead>
                        <TableRow>
                          <TableCell sx={{ width: 40 }}>
                            <Checkbox 
                              size='small' 
                              checked={formData.category_level_setup.length > 0 && selectedLevels.length === formData.category_level_setup.length}
                              indeterminate={selectedLevels.length > 0 && selectedLevels.length < formData.category_level_setup.length}
                              onChange={e => setSelectedLevels(e.target.checked ? formData.category_level_setup.map(l => l.id) : [])}
                            />
                          </TableCell>
                          <TableCell>Level Code</TableCell>
                          <TableCell>Level Name</TableCell>
                          <TableCell>From Points</TableCell>
                          <TableCell>Target Points</TableCell>
                          <TableCell align='center'>Reward / Gift</TableCell>
                          <TableCell>Gift Description</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </StyledTableHead>
                      <TableBody>
                        {formData.category_level_setup.map((line, index) => (
                          <TableRow key={line.id} hover selected={selectedLevels.includes(line.id)}>
                            <TableCell>
                              <Checkbox 
                                size='small' 
                                checked={selectedLevels.includes(line.id)}
                                onChange={e => {
                                  if (e.target.checked) setSelectedLevels([...selectedLevels, line.id])
                                  else setSelectedLevels(selectedLevels.filter(id => id !== line.id))
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField 
                                select
                                fullWidth 
                                size='small' 
                                variant='standard' 
                                value={line.level_code || ''} 
                                onChange={e => { 
                                  const cat = categories.find(c => c.category_code === e.target.value)
                                  const n = [...formData.category_level_setup]
                                  n[index].level_code = e.target.value
                                  if (cat) n[index].level_name = cat.category_name
                                  setFormData({ ...formData, category_level_setup: n }) 
                                }}
                              >
                                {categories.map(cat => (
                                  <MenuItem key={cat.id} value={cat.category_code}>{cat.category_code}</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField 
                                fullWidth 
                                size='small' 
                                variant='standard' 
                                value={line.level_name || ''} 
                                InputProps={{ readOnly: true }}
                                onChange={e => { const n = [...formData.category_level_setup]; n[index].level_name = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.from_points || 0} onChange={e => { const n = [...formData.category_level_setup]; n[index].from_points = parseFloat(e.target.value); setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' type='number' value={line.to_points || 0} onChange={e => { const n = [...formData.category_level_setup]; n[index].to_points = parseFloat(e.target.value); setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }} align='center'><IconButton size='small' color='primary'><i className='ri-gift-line' /></IconButton></TableCell>
                            <TableCell sx={{ p: 1 }}><TextField fullWidth size='small' variant='standard' value={line.gift_description || ''} onChange={e => { const n = [...formData.category_level_setup]; n[index].gift_description = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select fullWidth size='small' variant='standard' value={line.status || 'Active'} onChange={e => { const n = [...formData.category_level_setup]; n[index].status = e.target.value; setFormData({ ...formData, category_level_setup: n }) }}>
                                <MenuItem value='Active'>Active</MenuItem>
                                <MenuItem value='Inactive'>Inactive</MenuItem>
                              </TextField>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Stack>
          )}
          {/* Points Configuration Tab */}
          {tabValue === 1 && (
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
                  <Typography variant='h6' sx={{ fontWeight: 700 }}>Points Setup - Overall (Based on Purchase Value)</Typography>
                  <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addPointsLine}>Add Line</Button>
                </Stack>
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                    <StyledTableHead>
                      <TableRow>
                        <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'From Weight (Gram)' : 'From Amount (INR)'}</TableCell>
                        <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'To Weight (Gram)' : 'To Amount (INR)'}</TableCell>
                        <TableCell>{formData.point_calculation_on === 'Net Weight' ? 'Points For Every (Gram)' : 'Points For Every (INR)'}</TableCell>
                        <TableCell>Points To Be Earned</TableCell>
                        <TableCell>Min. Points</TableCell>
                        <TableCell>Max. Points</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align='right'>Action</TableCell>
                      </TableRow>
                    </StyledTableHead>
                    <TableBody>
                      {formData.points_setup_overall.map((line, index) => (
                        <TableRow key={line.id}>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.from_amount ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].from_amount = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.to_amount ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].to_amount = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.points_for_every ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].points_for_every = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.points_to_be_earned ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].points_to_be_earned = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.min_points_to_earn ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].min_points_to_earn = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField size='small' type='number' value={line.max_points_to_earn ?? ''} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].max_points_to_earn = parseFloat(e.target.value) || 0;
                              setFormData({ ...formData, points_setup_overall: next })
                            }} />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField select size='small' value={line.status} onChange={e => {
                              const next = [...formData.points_setup_overall]; next[index].status = e.target.value;
                              setFormData({ ...formData, points_setup_overall: next })
                            }}>
                              <MenuItem value='Active'>Active</MenuItem>
                              <MenuItem value='Inactive'>Inactive</MenuItem>
                            </TextField>
                          </TableCell>
                          <TableCell align='right'>
                            <IconButton color='error' size='small' onClick={() => {
                              const next = formData.points_setup_overall.filter((_, i) => i !== index);
                              setFormData({ ...formData, points_setup_overall: next })
                            }}>
                              <i className='ri-delete-bin-line' />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Group Configuration Tab */}
          {tabValue === 2 && (
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
                  <Typography variant='h6' sx={{ fontWeight: 700 }}>Group Wise Points Setup</Typography>
                  <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addGroupLine}>Add Line</Button>
                </Stack>
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                      <StyledTableHead>
                        <TableRow>
                          <TableCell>Group Code</TableCell>
                          <TableCell>Group Name</TableCell>
                          <TableCell>Basis</TableCell>
                          <TableCell>Min. Purchase / Wt</TableCell>
                          <TableCell>Max. Purchase / Wt</TableCell>
                          <TableCell>Points For Every</TableCell>
                          <TableCell>Points To Be Earned</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right'>Action</TableCell>
                        </TableRow>
                      </StyledTableHead>
                      <TableBody>
                        {formData.group_wise_points_setup.map((line, index) => (
                          <TableRow key={line.id}>
                            <TableCell sx={{ p: 1 }}>
                              <TextField 
                                select
                                size='small' 
                                variant='standard'
                                value={line.group_code} 
                                onChange={e => {
                                  const next = [...formData.group_wise_points_setup]; 
                                  const val = e.target.value;
                                  next[index].group_code = val;
                                  const metal = metalMasters.find(m => String(m.erp_metal_id) === String(val));
                                  if (metal) next[index].group_name = metal.metal_name;
                                  setFormData({ ...formData, group_wise_points_setup: next })
                                }}
                              >
                                {metalMasters.map(m => (
                                  <MenuItem key={m.id} value={m.erp_metal_id}>{m.erp_metal_id} ({m.metal_name})</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField size='small' variant='standard' InputProps={{ readOnly: true }} value={line.group_name} />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select size='small' variant='standard' value={line.calculation_basis || 'Amount'} onChange={e => { const n = [...formData.group_wise_points_setup]; n[index].calculation_basis = e.target.value as any; setFormData({ ...formData, group_wise_points_setup: n }) }}>
                                <MenuItem value='Amount'>Amount</MenuItem>
                                <MenuItem value='Weight'>Weight</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.from_weight ?? '') : (line.from_amount ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].from_weight = val; else n[index].from_amount = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.to_weight ?? '') : (line.to_amount ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].to_weight = val; else n[index].to_amount = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.points_for_every_wt ?? '') : (line.points_for_every_amt ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].points_for_every_wt = val; else n[index].points_for_every_amt = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField fullWidth size='small' variant='standard' type='number' 
                                value={line.calculation_basis === 'Weight' ? (line.points_to_be_earned_wt ?? '') : (line.points_to_be_earned_amt ?? '')} 
                                onChange={e => { 
                                  const n = [...formData.group_wise_points_setup]; 
                                  const val = parseFloat(e.target.value) || 0;
                                  if (line.calculation_basis === 'Weight') n[index].points_to_be_earned_wt = val; else n[index].points_to_be_earned_amt = val;
                                  setFormData({ ...formData, group_wise_points_setup: n }) 
                                }} 
                              />
                            </TableCell>
                            <TableCell sx={{ p: 1 }}>
                              <TextField select size='small' variant='standard' value={line.status || 'Active'} onChange={e => { const n = [...formData.group_wise_points_setup]; n[index].status = e.target.value; setFormData({ ...formData, group_wise_points_setup: n }) }}>
                                <MenuItem value='Active'>Active</MenuItem>
                                <MenuItem value='Inactive'>Inactive</MenuItem>
                              </TextField>
                            </TableCell>
                            <TableCell align='right'>
                              <IconButton color='error' size='small' onClick={() => {
                                const next = formData.group_wise_points_setup.filter((_, i) => i !== index);
                                setFormData({ ...formData, group_wise_points_setup: next })
                              }}>
                                <i className='ri-delete-bin-line' />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Category Level Tab */}
          {tabValue === 3 && (
            <Card sx={{ borderRadius: '12px' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 4 }}>
                  <Typography variant='h6' sx={{ fontWeight: 700 }}>Category / Level Setup (Points Range)</Typography>
                  <Button startIcon={<i className='ri-add-line' />} size='small' onClick={addLevelLine}>Add Line</Button>
                </Stack>
                <TableContainer component={Paper} variant='outlined'>
                  <Table size='small'>
                    <StyledTableHead>
                      <TableRow>
                        <TableCell>Level Code</TableCell>
                        <TableCell>Level Name</TableCell>
                        <TableCell>From Points</TableCell>
                        <TableCell>Target Points</TableCell>
                        <TableCell>Reward / Gift</TableCell>
                        <TableCell>Gift Description</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align='right'>Action</TableCell>
                      </TableRow>
                    </StyledTableHead>
                    <TableBody>
                      {formData.category_level_setup.map((line, index) => (
                         <TableRow key={line.id}>
                          <TableCell sx={{ p: 1 }}><TextField size='small' value={line.level_code || ''} onChange={e => { const n = [...formData.category_level_setup]; n[index].level_code = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}><TextField size='small' value={line.level_name || ''} onChange={e => { const n = [...formData.category_level_setup]; n[index].level_name = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}><TextField size='small' type='number' value={line.from_points || 0} onChange={e => { const n = [...formData.category_level_setup]; n[index].from_points = parseFloat(e.target.value) || 0; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}><TextField size='small' type='number' value={line.to_points || 0} onChange={e => { const n = [...formData.category_level_setup]; n[index].to_points = parseFloat(e.target.value) || 0; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}><TextField size='small' value={line.reward_gift || ''} onChange={e => { const n = [...formData.category_level_setup]; n[index].reward_gift = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}><TextField size='small' value={line.gift_description || ''} onChange={e => { const n = [...formData.category_level_setup]; n[index].gift_description = e.target.value; setFormData({ ...formData, category_level_setup: n }) }} /></TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField select size='small' value={line.status || 'Active'} onChange={e => { const n = [...formData.category_level_setup]; n[index].status = e.target.value; setFormData({ ...formData, category_level_setup: n }) }}>
                              <MenuItem value='Active'>Active</MenuItem>
                              <MenuItem value='Inactive'>Inactive</MenuItem>
                            </TextField>
                          </TableCell>
                          <TableCell align='right'>
                            <IconButton color='error' size='small' onClick={() => { const n = formData.category_level_setup.filter((_, i) => i !== index); setFormData({ ...formData, category_level_setup: n }) }}><i className='ri-delete-bin-line' /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Redemption & Benefits Tab */}
          {tabValue === 1 && (
            <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main' }}>Redemption & Benefit Configuration</Typography>
                </Box>
                <Box sx={{ p: 6 }}>
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={4}>
                        <TextField 
                          fullWidth 
                          label='Point Value (in Currency)' 
                          type='number'
                          size='small'
                          value={formData.point_value}
                          onChange={e => setFormData({ ...formData, point_value: parseFloat(e.target.value) })}
                          helperText='Value of 1 point during redemption'
                        />
                        <TextField 
                          fullWidth 
                          label='Minimum Points to Redeem' 
                          type='number'
                          size='small'
                          value={formData.min_redeem_points}
                          onChange={e => setFormData({ ...formData, min_redeem_points: parseFloat(e.target.value) })}
                        />
                        <TextField 
                          fullWidth 
                          label='Maximum Points per Transaction' 
                          type='number'
                          size='small'
                          value={formData.max_redeem_points_per_txn}
                          onChange={e => setFormData({ ...formData, max_redeem_points_per_txn: parseFloat(e.target.value) })}
                        />
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Stack spacing={2}>
                        <FormControlLabel 
                          control={<Checkbox size='small' checked={formData.allow_partial_redemption} onChange={e => setFormData({ ...formData, allow_partial_redemption: e.target.checked })} />} 
                          label={<Typography variant='body2'>Allow Partial Redemption</Typography>} 
                        />
                        <FormControlLabel 
                          control={<Checkbox size='small' checked={formData.allow_redemption_on_discounted} onChange={e => setFormData({ ...formData, allow_redemption_on_discounted: e.target.checked })} />} 
                          label={<Typography variant='body2'>Allow Redemption on Discounted Items</Typography>} 
                        />
                        <Box sx={{ mt: 2 }}>
                          <TextField 
                            select 
                            fullWidth 
                            label='Redemption Validation Type'
                            size='small'
                            value={formData.redemption_validation}
                            onChange={e => setFormData({ ...formData, redemption_validation: e.target.value })}
                          >
                            <MenuItem value='None'>None</MenuItem>
                            <MenuItem value='OTP'>OTP on Mobile</MenuItem>
                            <MenuItem value='Pin'>Security Pin</MenuItem>
                          </TextField>
                        </Box>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

            {/* Others Tab */}
            {tabValue === 2 && (
              <Stack spacing={4}>
                <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main' }}>Other Configurations</Typography>
                    </Box>
                    <Box sx={{ p: 6 }}>
                      <Grid container spacing={6}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant='caption' sx={{ mb: 2, display: 'block', fontWeight: 700, color: 'text.secondary' }}>Excluded Categories</Typography>
                          <Box sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: '4px' }}>
                            <Stack spacing={1}>
                              <FormControlLabel control={<Checkbox size='small' checked={formData.excluded_categories.includes('Repairs')} onChange={e => {
                                const next = e.target.checked ? [...formData.excluded_categories, 'Repairs'] : formData.excluded_categories.filter(c => c !== 'Repairs')
                                setFormData({ ...formData, excluded_categories: next })
                              }} />} label={<Typography variant='body2'>Repairs</Typography>} />
                              <FormControlLabel control={<Checkbox size='small' checked={formData.excluded_categories.includes('Making')} onChange={e => {
                                const next = e.target.checked ? [...formData.excluded_categories, 'Making'] : formData.excluded_categories.filter(c => c !== 'Making')
                                setFormData({ ...formData, excluded_categories: next })
                              }} />} label={<Typography variant='body2'>Making Charges</Typography>} />
                              <FormControlLabel control={<Checkbox size='small' checked={formData.excluded_categories.includes('Exchange')} onChange={e => {
                                const next = e.target.checked ? [...formData.excluded_categories, 'Exchange'] : formData.excluded_categories.filter(c => c !== 'Exchange')
                                setFormData({ ...formData, excluded_categories: next })
                              }} />} label={<Typography variant='body2'>Old Gold Exchange</Typography>} />
                            </Stack>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Typography variant='caption' sx={{ mb: 2, display: 'block', fontWeight: 700, color: 'text.secondary' }}>Notification Settings</Typography>
                          <Stack spacing={1}>
                            <FormControlLabel control={<Checkbox size='small' checked={formData.notify_on_credit} onChange={e => setFormData({ ...formData, notify_on_credit: e.target.checked })} />} label={<Typography variant='body2'>Notify on Point Credit</Typography>} />
                            <FormControlLabel control={<Checkbox size='small' checked={formData.notify_on_redemption} onChange={e => setFormData({ ...formData, notify_on_redemption: e.target.checked })} />} label={<Typography variant='body2'>Notify on Point Redemption</Typography>} />
                            <FormControlLabel control={<Checkbox size='small' checked={formData.notify_before_expiry} onChange={e => setFormData({ ...formData, notify_before_expiry: e.target.checked })} />} label={<Typography variant='body2'>Notify 30 days before Expiry</Typography>} />
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}

            {/* Notes Tab */}
            {tabValue === 3 && (
              <Stack spacing={4}>
                {/* Introducer Points Setup */}
                <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <i className='ri-user-follow-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
                        <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Introducer Reward Setup
                        </Typography>
                      </Box>
                      <FormControlLabel 
                        control={<Checkbox size='small' checked={formData.allow_introducer_points} onChange={e => setFormData({ ...formData, allow_introducer_points: e.target.checked })} />} 
                        label={<Typography variant='body2' sx={{ fontWeight: 600 }}>Enable Introducer Points</Typography>} 
                      />
                    </Box>
                    <Box sx={{ p: 4 }}>
                      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                        <Button 
                          startIcon={<i className='ri-add-line' />} 
                          size='small' 
                          onClick={addIntroducerLine} 
                          disabled={!formData.allow_introducer_points}
                          sx={{ textTransform: 'none' }}
                        >
                          Add Level Benefit
                        </Button>
                        <Button 
                          startIcon={<i className='ri-delete-bin-line' />} 
                          size='small' 
                          color='error' 
                          onClick={removeIntroducerLines}
                          disabled={selectedIntroducers.length === 0 || !formData.allow_introducer_points}
                          sx={{ textTransform: 'none' }}
                        >
                          Delete Level Benefit
                        </Button>
                      </Box>
                      <TableContainer component={Paper} variant='outlined' sx={{ opacity: formData.allow_introducer_points ? 1 : 0.6 }}>
                        <Table size='small'>
                          <StyledTableHead>
                            <TableRow>
                              <TableCell sx={{ width: 40 }}>
                                <Checkbox 
                                  size='small' 
                                  disabled={!formData.allow_introducer_points}
                                  checked={formData.introducer_benefit_setup.length > 0 && selectedIntroducers.length === formData.introducer_benefit_setup.length}
                                  indeterminate={selectedIntroducers.length > 0 && selectedIntroducers.length < formData.introducer_benefit_setup.length}
                                  onChange={e => setSelectedIntroducers(e.target.checked ? formData.introducer_benefit_setup.map(l => l.id) : [])}
                                />
                              </TableCell>
                              <TableCell>From Points</TableCell>
                              <TableCell>To Points</TableCell>
                              <TableCell>Card Category</TableCell>
                              <TableCell>Benefit Type</TableCell>
                              <TableCell>Benefit (Pts/%)</TableCell>
                              <TableCell align='center'>Gift?</TableCell>
                              <TableCell>Gift Name</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </StyledTableHead>
                          <TableBody>
                            {formData.introducer_benefit_setup.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} align='center' sx={{ py: 6 }}>
                                  <Typography variant='caption' color='text.secondary'>No introducer benefit levels defined. Click "Add Level Benefit" to start.</Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              formData.introducer_benefit_setup.map((line, index) => (
                                <TableRow key={line.id} hover selected={selectedIntroducers.includes(line.id)}>
                                  <TableCell>
                                    <Checkbox 
                                      size='small' 
                                      disabled={!formData.allow_introducer_points}
                                      checked={selectedIntroducers.includes(line.id)}
                                      onChange={e => {
                                        if (e.target.checked) setSelectedIntroducers([...selectedIntroducers, line.id])
                                        else setSelectedIntroducers(selectedIntroducers.filter(id => id !== line.id))
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField fullWidth size='small' variant='standard' type='number' disabled={!formData.allow_introducer_points} value={line.from_points ?? ''} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].from_points = parseFloat(e.target.value) || 0; setFormData({ ...formData, introducer_benefit_setup: n }) }} />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField fullWidth size='small' variant='standard' type='number' disabled={!formData.allow_introducer_points} value={line.to_points ?? ''} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].to_points = parseFloat(e.target.value) || 0; setFormData({ ...formData, introducer_benefit_setup: n }) }} />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField select fullWidth size='small' variant='standard' disabled={!formData.allow_introducer_points} value={line.card_category || ''} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].card_category = e.target.value; setFormData({ ...formData, introducer_benefit_setup: n }) }}>
                                      {categories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.category_code}>{cat.category_code}</MenuItem>
                                      ))}
                                    </TextField>
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField select fullWidth size='small' variant='standard' disabled={!formData.allow_introducer_points} value={line.benefit_type || 'Value'} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].benefit_type = e.target.value as any; setFormData({ ...formData, introducer_benefit_setup: n }) }}>
                                      <MenuItem value='Value'>Value (Points)</MenuItem>
                                      <MenuItem value='Percentage'>Percentage (%)</MenuItem>
                                    </TextField>
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField 
                                      fullWidth 
                                      size='small' 
                                      variant='standard' 
                                      type='number' 
                                      disabled={!formData.allow_introducer_points} 
                                      value={line.benefit_points ?? ''} 
                                      onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].benefit_points = parseFloat(e.target.value) || 0; setFormData({ ...formData, introducer_benefit_setup: n }) }} 
                                      InputProps={{
                                        endAdornment: line.benefit_type === 'Percentage' ? <InputAdornment position='end'>%</InputAdornment> : null
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }} align='center'>
                                    <Checkbox 
                                      size='small' 
                                      disabled={!formData.allow_introducer_points} 
                                      checked={line.reward_gift || false} 
                                      onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].reward_gift = e.target.checked; setFormData({ ...formData, introducer_benefit_setup: n }) }} 
                                    />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField fullWidth size='small' variant='standard' disabled={!formData.allow_introducer_points || !line.reward_gift} placeholder={line.reward_gift ? 'Enter gift name' : 'N/A'} value={line.gift_name || ''} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].gift_name = e.target.value; setFormData({ ...formData, introducer_benefit_setup: n }) }} />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField fullWidth size='small' variant='standard' disabled={!formData.allow_introducer_points} value={line.benefit_description || ''} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].benefit_description = e.target.value; setFormData({ ...formData, introducer_benefit_setup: n }) }} />
                                  </TableCell>
                                  <TableCell sx={{ p: 1 }}>
                                    <TextField select fullWidth size='small' variant='standard' disabled={!formData.allow_introducer_points} value={line.status || 'Active'} onChange={e => { const n = [...formData.introducer_benefit_setup]; n[index].status = e.target.value; setFormData({ ...formData, introducer_benefit_setup: n }) }}>
                                      <MenuItem value='Active'>Active</MenuItem>
                                      <MenuItem value='Inactive'>Inactive</MenuItem>
                                    </TextField>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <i className='ri-scales-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
                      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Weight-Based Point Settings (Mandatory for Net Weight Setups)
                      </Typography>
                    </Box>
                    <Box sx={{ p: 6 }}>
                      <Grid container spacing={6}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField 
                            fullWidth 
                            label='Points For Every (Weight Gram)' 
                            type='number'
                            size='small'
                            required
                            inputProps={{ step: '0.001' }}
                            value={formData.points_for_every_wt_global ?? ''}
                            onChange={e => setFormData({ ...formData, points_for_every_wt_global: parseFloat(e.target.value) || null })}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField 
                            fullWidth 
                            label='Points To Be Earned (Weight)' 
                            type='number'
                            size='small'
                            required
                            value={formData.points_to_be_earned_wt_global ?? ''}
                            onChange={e => setFormData({ ...formData, points_to_be_earned_wt_global: parseFloat(e.target.value) || null })}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: '0 !important' }}>
                    <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <i className='ri-sticky-note-line' style={{ color: 'var(--mui-palette-primary-main)' }} />
                      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        General Notes
                      </Typography>
                    </Box>
                    <Box sx={{ p: 4 }}>
                      <TextField 
                        fullWidth 
                        multiline 
                        rows={6} 
                        variant='outlined'
                        size='small'
                        placeholder='Enter terms and conditions or internal notes...'
                        value={formData.notes || ''}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            )}
        </Box>
      )}

      {/* Log Dialog (Shared) */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Activity Logs</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loadingLogs ? (
            <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.user?.name}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size='small' color={log.action === 'Create' ? 'success' : 'info'} variant='tonal' />
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setLogOpen(false)} variant='outlined'>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LoyaltySetupPage

