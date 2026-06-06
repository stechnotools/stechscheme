'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  Tooltip,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip
} from '@mui/material'
import Link from 'next/link'
import { LoyaltyCardCategory, resolveBackendApiUrl } from './loyaltyCardCategoryData'

const CardPreview = ({ color, name, code, prefix }: { color?: string | null; name?: string | null; code?: string | null; prefix?: string | null }) => {
  const getGradient = () => {
    switch (color?.toLowerCase()) {
      case 'gold': return 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)'
      case 'platinum': return 'linear-gradient(135deg, #E5E4E2 0%, #71706E 100%)'
      case 'signature': return 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)'
      case 'elite': return 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)' // Royal Purple/Blue
      default: return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)' // Silver
    }
  }

  const getTextColor = () => color?.toLowerCase() === 'signature' ? '#FFD700' : '#fff'

  return (
    <Box sx={{
      width: '90mm',
      height: '50mm',
      borderRadius: 2,
      background: getGradient(),
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      color: getTextColor(),
      transition: 'all 0.3s ease',
      mx: 'auto' // Center the card in the sidebar
    }}>
      <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
      <Box sx={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
      
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ zIndex: 1 }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}>
          LOYALTY CARD
        </Typography>
        <i className="ri-rfid-fill" style={{ fontSize: '1.25rem', opacity: 0.8 }} />
      </Stack>

      <Box sx={{ mt: 'auto', zIndex: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0, fontSize: '0.65rem' }}>CATEGORY</Typography>
        <Typography sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>{name || 'CATEGORY NAME'}</Typography>
        
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', fontSize: '0.65rem' }}>CODE</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{code || '---'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', fontSize: '0.65rem' }}>PREFIX</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{prefix || '---'}</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

const LoyaltyCategoryPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [categories, setCategories] = useState<LoyaltyCardCategory[]>([])
  const [view, setView] = useState<'list' | 'form'>('list')
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof LoyaltyCardCategory | 'sl_no'; direction: 'asc' | 'desc' } | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [formData, setFormData] = useState<LoyaltyCardCategory>({
    category_code: '',
    category_name: '',
    description: '',
    category_type: 'Standard',
    card_color: 'Silver',
    card_design: 'SILVER_CARD',
    card_prefix: 'SLV',
    card_number_length: 10,
    earning_based_on: 'Amount',
    points_for_every: 100,
    points_to_be_earned: 1,
    min_points_to_redeem: 100,
    point_expiry_months: 12,
    status: 'Active',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
    allow_downgrade: true,
    allow_upgrade: true
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

  const loadCategories = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<{ data: LoyaltyCardCategory[] }>('/loyalty-card-categories')
      setCategories(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const loadLogs = useCallback(async () => {
    if (!accessToken) return
    setLoadingLogs(true)
    try {
      const response = await request<{ data: any[] }>('/loyalty-card-categories/logs')
      setLogs(response.data || [])
    } catch (err) {
      // Silently fail for logs
    } finally {
      setLoadingLogs(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadCategories()
    }
  }, [status, loadCategories])

  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories]

    // Filtering
    if (search) {
      const query = search.toLowerCase()
      result = result.filter(cat => 
        cat.category_code.toLowerCase().includes(query) ||
        cat.category_name.toLowerCase().includes(query) ||
        cat.category_type.toLowerCase().includes(query) ||
        cat.earning_based_on.toLowerCase().includes(query) ||
        cat.status.toLowerCase().includes(query)
      )
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = sortConfig.key === 'sl_no' ? categories.indexOf(a) + 1 : a[sortConfig.key as keyof LoyaltyCardCategory]
        let bValue: any = sortConfig.key === 'sl_no' ? categories.indexOf(b) + 1 : b[sortConfig.key as keyof LoyaltyCardCategory]

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [categories, search, sortConfig])

  const handleSort = (key: keyof LoyaltyCardCategory | 'sl_no') => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleInputChange = (field: keyof LoyaltyCardCategory, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const isEdit = formData.id
      const method = isEdit ? 'PUT' : 'POST'
      const path = isEdit ? `/loyalty-card-categories/${formData.id}` : '/loyalty-card-categories'

      await request(path, {
        method,
        body: JSON.stringify(formData)
      })

      setSuccess(`Category ${isEdit ? 'updated' : 'created'} successfully.`)
      await loadCategories()
      setView('list')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (formData.id) {
      setSaving(true)
      try {
        await request(`/loyalty-card-categories/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, status: newStatus })
        })
        setFormData(prev => ({ ...prev, status: newStatus }))
        setSuccess(`Category ${newStatus.toLowerCase()}d successfully.`)
        await loadCategories()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status.')
      } finally {
        setSaving(false)
      }
    } else {
      handleInputChange('status', newStatus)
    }
  }

  const handleNew = () => {
    setFormData({
      category_code: '',
      category_name: '',
      description: '',
      category_type: 'Standard',
      card_color: 'Silver',
      card_design: 'SILVER_CARD',
      card_prefix: '',
      card_number_length: 10,
      earning_based_on: 'Amount',
      points_for_every: 100,
      points_to_be_earned: 1,
      min_points_to_redeem: 100,
      point_expiry_months: 12,
      status: 'Active',
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: '',
      allow_downgrade: true,
      allow_upgrade: true
    })
    setView('form')
  }

  const handleEdit = (category: LoyaltyCardCategory) => {
    setFormData(category)
    setView('form')
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this category?')) return

    setSaving(true)
    try {
      await request(`/loyalty-card-categories/${id}`, {
        method: 'DELETE'
      })
      setSuccess('Category deleted successfully.')
      await loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && categories.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={10}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'white', minHeight: '100vh' }}>
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
            <Button 
              size='small' 
              startIcon={<i className='ri-save-line' />} 
              onClick={handleSave} 
              disabled={saving || view === 'list'}
              sx={{ fontWeight: 600, color: view === 'form' ? 'primary.main' : 'text.disabled' }}
            >
              Save
            </Button>
            <Button 
              size='small' 
              startIcon={<i className='ri-add-line' />} 
              onClick={handleNew}
              sx={{ fontWeight: 600 }}
            >
              New
            </Button>
            <Button 
              size='small' 
              startIcon={<i className='ri-delete-bin-line' />} 
              onClick={() => formData.id && handleDelete(formData.id)}
              disabled={!formData.id || view === 'list'}
              color='error'
              sx={{ fontWeight: 600 }}
            >
              Delete
            </Button>
            <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
            <Button size='small' startIcon={<i className='ri-checkbox-circle-line' />} onClick={() => handleStatusUpdate('Active')} sx={{ fontWeight: 600, color: 'success.main' }}>Activate</Button>
            <Button size='small' startIcon={<i className='ri-close-circle-line' />} onClick={() => handleStatusUpdate('Inactive')} sx={{ fontWeight: 600, color: 'warning.main' }}>Inactivate</Button>
            <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
            <Button size='small' startIcon={<i className='ri-history-line' />} onClick={() => { void loadLogs(); setLogOpen(true) }} sx={{ fontWeight: 600 }}>Logs</Button>
            <Button size='small' startIcon={<i className='ri-refresh-line' />} onClick={() => void loadCategories()} sx={{ fontWeight: 600 }}>Refresh</Button>
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
            {view === 'form' ? (formData.id ? `${formData.category_code} : ${formData.category_name}` : 'New Category') : 'Loyalty Card Category Master'}
          </Typography>
          {view === 'form' && (
            <Chip label={formData.status} size='small' color={formData.status === 'Active' ? 'success' : 'error'} variant='tonal' />
          )}
        </Stack>
        {view === 'list' ? (
          <Card variant="outlined" sx={{ borderRadius: 1 }}>
             <Box sx={{ px: 3, py: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Category List</Typography>
                <TextField 
                  size="small" 
                  placeholder="Search categories..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  sx={{ width: 250 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                />
             </Box>
             <CardContent sx={{ p: 0 }}>
               <Box sx={{ overflowX: 'auto' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                       <th onClick={() => handleSort('sl_no')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Sl. No. {sortConfig?.key === 'sl_no' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('category_code')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Category Code {sortConfig?.key === 'category_code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('category_name')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Category Name {sortConfig?.key === 'category_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('category_type')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Category Type {sortConfig?.key === 'category_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('valid_from')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Valid From {sortConfig?.key === 'valid_from' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('valid_to')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Valid To {sortConfig?.key === 'valid_to' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th onClick={() => handleSort('status')} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                         Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                       </th>
                       <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Action</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredAndSortedCategories.length === 0 ? (
                       <tr>
                         <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No records found</td>
                       </tr>
                     ) : (
                       filteredAndSortedCategories.map((cat, index) => (
                         <tr key={cat.id} onDoubleClick={() => handleEdit(cat)} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{categories.indexOf(cat) + 1}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: '#2563eb' }}>{cat.category_code}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{cat.category_name}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{cat.category_type}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{cat.valid_from ? cat.valid_from.split('T')[0] : ''}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{cat.valid_to ? cat.valid_to.split('T')[0] : ''}</td>
                           <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                             <Box sx={{ 
                               display: 'inline-block', 
                               px: 2, 
                               py: 0.5, 
                               borderRadius: '4px', 
                               fontSize: '0.75rem', 
                               fontWeight: 600,
                               bgcolor: cat.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                               color: cat.status === 'Active' ? '#16a34a' : '#475569'
                             }}>
                               {cat.status}
                             </Box>
                           </td>
                           <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                             <Stack direction="row" spacing={1} justifyContent="flex-end">
                               <IconButton size="small" color="primary" onClick={() => handleEdit(cat)}>
                                 <i className="ri-pencil-line" />
                               </IconButton>
                               <IconButton size="small" color="error" onClick={() => handleDelete(cat.id)}>
                                 <i className="ri-delete-bin-line" />
                               </IconButton>
                             </Stack>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </Box>
             </CardContent>
          </Card>
        ) : (
          <>
            {/* Breadcrumb style text */}
            <Typography variant="caption" sx={{ color: 'primary.main', textTransform: 'uppercase', fontWeight: 600, mb: 1, display: 'block' }}>
              LOYALTY CARD CATEGORY MASTER
            </Typography>
            
            {/* Record Title */}
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 9 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'visible' }}>
                  <CardContent sx={{ p: 6 }}>
                    <Grid container spacing={8}>
                      {/* Section 1: Identity */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={4}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1.5, color: 'primary.main' }}>
                              <i className="ri-fingerprint-line" style={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={700}>Identity</Typography>
                          </Stack>
                          <TextField 
                            fullWidth 
                            size="small" 
                            label="Category Code" 
                            placeholder="e.g. SLV"
                            value={formData.category_code} 
                            onChange={e => handleInputChange('category_code', e.target.value)} 
                            required
                          />
                          <TextField 
                            fullWidth 
                            size="small" 
                            label="Category Name" 
                            placeholder="e.g. Silver"
                            value={formData.category_name} 
                            onChange={e => handleInputChange('category_name', e.target.value)}
                            required
                          />
                          <TextField 
                            fullWidth 
                            size="small" 
                            label="Description" 
                            multiline 
                            rows={3} 
                            placeholder="Short description of the category..."
                            value={formData.description || ''} 
                            onChange={e => handleInputChange('description', e.target.value)} 
                          />
                        </Stack>
                      </Grid>

                      {/* Section 2: Card Appearance */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={4}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 1.5, color: 'warning.main' }}>
                              <i className="ri-palette-line" style={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={700}>Appearance</Typography>
                          </Stack>
                          <TextField 
                            select 
                            fullWidth 
                            size="small" 
                            label="Card Color" 
                            value={formData.card_color || 'Silver'} 
                            onChange={e => handleInputChange('card_color', e.target.value)}
                          >
                            <MenuItem value="Silver">Silver</MenuItem>
                            <MenuItem value="Gold">Gold</MenuItem>
                            <MenuItem value="Platinum">Platinum</MenuItem>
                            <MenuItem value="Signature">Signature</MenuItem>
                             <MenuItem value="Elite">Elite</MenuItem>
                          </TextField>
                          <TextField 
                            select 
                            fullWidth 
                            size="small" 
                            label="Card Design" 
                            value={formData.card_design || 'SILVER_CARD'} 
                            onChange={e => handleInputChange('card_design', e.target.value)}
                          >
                            <MenuItem value="SILVER_CARD">SILVER_CARD</MenuItem>
                            <MenuItem value="GOLD_CARD">GOLD_CARD</MenuItem>
                            <MenuItem value="PLATINUM_CARD">PLATINUM_CARD</MenuItem>
                            <MenuItem value="Signature_Card">Signature_Card</MenuItem>
                             <MenuItem value="Elite_Card">Elite_Card</MenuItem>
                          </TextField>
                          <TextField 
                            fullWidth 
                            size="small" 
                            label="Card Prefix" 
                            placeholder="e.g. 101"
                            value={formData.card_prefix || ''} 
                            onChange={e => handleInputChange('card_prefix', e.target.value)} 
                          />
                          <TextField 
                            fullWidth 
                            size="small" 
                            type="number" 
                            label="Card Number Length" 
                            value={formData.card_number_length} 
                            onChange={e => handleInputChange('card_number_length', parseInt(e.target.value))} 
                          />
                        </Stack>
                      </Grid>

                      {/* Section 3: Lifecycle */}
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={4}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                            <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 1.5, color: 'success.main' }}>
                              <i className="ri-refresh-line" style={{ fontSize: '1.25rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={700}>Lifecycle</Typography>
                          </Stack>
                          <TextField 
                            fullWidth 
                            size="small" 
                            type="date" 
                            label="Valid From" 
                            InputLabelProps={{ shrink: true }}
                            value={formData.valid_from ? formData.valid_from.split('T')[0] : ''} 
                            onChange={e => handleInputChange('valid_from', e.target.value)} 
                          />
                          <TextField 
                            fullWidth 
                            size="small" 
                            type="date" 
                            label="Valid To" 
                            InputLabelProps={{ shrink: true }}
                            value={formData.valid_to ? formData.valid_to.split('T')[0] : ''} 
                            onChange={e => handleInputChange('valid_to', e.target.value)} 
                          />
                          
                          <Divider sx={{ my: 1 }} />
                          
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={500}>Allow Downgrade</Typography>
                            <FormControlLabel
                              control={<Switch size="small" checked={formData.allow_downgrade} onChange={e => handleInputChange('allow_downgrade', e.target.checked)} />}
                              label={formData.allow_downgrade ? "Yes" : "No"}
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem', fontWeight: 600, color: formData.allow_downgrade ? 'success.main' : 'text.secondary' } }}
                            />
                          </Box>

                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={500}>Allow Upgrade</Typography>
                            <FormControlLabel
                              control={<Switch size="small" checked={formData.allow_upgrade} onChange={e => handleInputChange('allow_upgrade', e.target.checked)} />}
                              label={formData.allow_upgrade ? "Yes" : "No"}
                              sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem', fontWeight: 600, color: formData.allow_upgrade ? 'success.main' : 'text.secondary' } }}
                            />
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Preview Column */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Stack spacing={6}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Live Card Preview
                    </Typography>
                    <CardPreview 
                      color={formData.card_color} 
                      name={formData.category_name} 
                      code={formData.category_code} 
                      prefix={formData.card_prefix} 
                    />
                  </Box>

                  <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'grey.50' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Quick Stats</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">This category will be used to classify customers and define their card aesthetics.</Typography>
                      <Divider sx={{ my: 3 }} />
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">Prefix</Typography>
                          <Typography variant="caption" fontWeight={700}>{formData.card_prefix || '-'}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption">Length</Typography>
                          <Typography variant="caption" fontWeight={700}>{formData.card_number_length} Digits</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </>
        )}
      </Box>

      {/* Activity Log Dialog */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <i className='ri-history-line' />
            <Typography variant='h6'>Category Master Activity Logs</Typography>
          </Stack>
          <IconButton onClick={() => setLogOpen(false)} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size='small' stickyHeader>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: 'grey.50', fontWeight: 700 } }}>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={4} align='center' sx={{ py: 6 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align='center' sx={{ py: 6 }}>
                      <Typography color='text.secondary'>No activity logs found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{log.user?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action} 
                          size='small' 
                          color={log.action === 'Create' ? 'success' : log.action === 'Update' ? 'info' : 'error'}
                          variant='outlined'
                          sx={{ fontWeight: 600, borderRadius: '4px' }}
                        />
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setLogOpen(false)} variant='contained' size='small'>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LoyaltyCategoryPage

