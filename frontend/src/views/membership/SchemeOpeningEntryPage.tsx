'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import Autocomplete from '@mui/material/Autocomplete'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { styled } from '@mui/material/styles'

// Styled components for the dropzone
const Dropzone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(8),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover
  }
}))

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const SchemeOpeningEntryPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  // Main list states
  const [listData, setListData] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  // Modal / Import screen trigger
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Excel Upload / Workspace states
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const [previewHeader, setPreviewHeader] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationResults, setValidationResults] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const [isValidated, setIsValidated] = useState(false)
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([])
  const [editPreviewDialogOpen, setEditPreviewDialogOpen] = useState(false)
  const [editPreviewData, setEditPreviewData] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  // Master lists for manual lookups
  const [branches, setBranches] = useState<any[]>([])
  const [salesmen, setSalesmen] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    if (!accessToken) return
    const loadMasters = async () => {
      try {
        const [branchesRes, usersRes, customersRes] = await Promise.all([
          fetch(`${resolveBackendApiUrl()}/branches?per_page=500`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
          fetch(`${resolveBackendApiUrl()}/users?per_page=500`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json()),
          fetch(`${resolveBackendApiUrl()}/customers?per_page=500`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json())
        ])

        if (branchesRes?.data) setBranches(branchesRes.data)
        if (usersRes?.data) {
          const filtered = usersRes.data.filter((u: any) => {
            const roleNames = Array.isArray(u.roles)
              ? u.roles.map((r: any) => (typeof r === 'string' ? r : r?.name || ''))
              : []
            return u.status !== 'blocked' && roleNames.some((r: any) => ['super-admin', 'admin', 'staff'].includes(String(r)))
          })
          setSalesmen(filtered)
        }
        if (customersRes?.data) setCustomers(customersRes.data)
      } catch (err) {
        console.error('Failed to load manual masters', err)
      }
    }
    loadMasters()
  }, [accessToken])

  // Manual entry states & actions
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [manualData, setManualData] = useState<any>({
    opening_date: '',
    account_name: '',
    city: '',
    mobile_no: '',
    salesman: '',
    scheme_type: 'Amount',
    total_amount: '',
    installment_amount: '',
    number_of_months: '',
    total_weight: '',
    ticket_no: '',
    deposit_or_redeem: 'Deposit',
    branch_name: '',
    narration: '',
    lot_no: '',
    scheme_name: ''
  })

  const handleEditRowClick = (row: any) => {
    let formattedDate = ''
    if (row.opening_date) {
      const d = new Date(row.opening_date)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      formattedDate = `${day}-${month}-${year}`
    }
    setSelectedRow({
      ...row,
      opening_date: formattedDate || row.opening_date || ''
    })
    setEditDialogOpen(true)
  }

  const handleViewRowClick = (row: any) => {
    setSelectedRow(row)
    setViewDialogOpen(true)
  }

  const handleSaveEditRow = async () => {
    if (!selectedRow || !accessToken) return
    setLoadingList(true)
    setEditDialogOpen(false)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/records/${selectedRow.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(selectedRow)
      })
      const result = await response.json()
      if (response.ok) {
        setSuccess('Scheme Opening record updated successfully.')
        fetchOpenings()
      } else {
        setError(result.message || 'Failed to update record.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoadingList(false)
      setSelectedRow(null)
    }
  }

  const handleSaveAddManual = async () => {
    if (!accessToken) return
    setLoadingList(true)
    setAddDialogOpen(false)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(manualData)
      })
      const result = await response.json()
      if (response.ok) {
        setSuccess('Scheme Opening entry inserted manually!')
        setManualData({
          opening_date: '',
          account_name: '',
          city: '',
          mobile_no: '',
          salesman: '',
          scheme_type: 'Amount',
          total_amount: '',
          installment_amount: '',
          number_of_months: '',
          total_weight: '',
          ticket_no: '',
          deposit_or_redeem: 'Deposit',
          branch_name: '',
          narration: '',
          lot_no: '',
          scheme_name: ''
        })
        fetchOpenings()
      } else {
        setError(result.message || 'Failed to insert entry.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoadingList(false)
    }
  }

  const handleProcessSingle = async (id: number) => {
    if (!accessToken) return
    setLoadingList(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ record_ids: [id] })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Processing failed')
      
      setSuccess('Scheme Opening processed and enrolled successfully!')
      fetchOpenings()
    } catch (err: any) {
      setError(err.message || 'Processing failed.')
    } finally {
      setLoadingList(false)
    }
  }

  // Fetch Scheme Openings List
  const fetchOpenings = useCallback(async () => {
    if (!accessToken) return
    setLoadingList(true)
    try {
      const url = new URL(`${resolveBackendApiUrl()}/scheme-openings`)
      url.searchParams.append('page', currentPage.toString())
      if (searchQuery) url.searchParams.append('search', searchQuery)
      if (statusFilter) url.searchParams.append('status', statusFilter)

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      const json = await response.json()
      setListData(json.data || [])
      setTotalRecords(json.total || 0)
    } catch (err) {
      console.error('Failed to load scheme openings', err)
    } finally {
      setLoadingList(false)
    }
  }, [accessToken, currentPage, searchQuery, statusFilter])

  useEffect(() => {
    fetchOpenings()
  }, [fetchOpenings])

  const handleDeleteOpening = async (id: number) => {
    setDeleteTargetId(id)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !accessToken) return
    setLoadingList(true)
    setDeleteDialogOpen(false)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/records/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (response.ok) {
        setSuccess('Scheme Opening entry deleted successfully.')
        await fetchOpenings()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete scheme opening.')
      }
    } catch (err) {
      console.error('Delete error', err)
    } finally {
      setLoadingList(false)
      setDeleteTargetId(null)
    }
  }

  // File Upload Logic
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
      setImportResult(null)
      setIsValidated(false)
      setValidationResults(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) {
          const lines = text.split(/\r?\n/)
          const data = lines
            .filter(line => line.trim() !== '')
            .map(line => {
              const cells: string[] = []
              let current = ''
              let inQuotes = false
              for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') inQuotes = !inQuotes
                else if (char === ',' && !inQuotes) {
                  cells.push(current.trim())
                  current = ''
                } else current += char
              }
              cells.push(current.trim())
              return cells.map(c => c.replace(/^"|"$/g, ''))
            })
          
          if (data.length > 0) {
            setPreviewHeader(data[0])
            setPreviewRows(data.slice(1))
            setSelectedPreviewRows(data.slice(1).map((_, i) => i))
          }
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleValidate = async () => {
    if (!file || !accessToken) return
    setValidating(true)
    setError(null)
    setSuccess(null)
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Validation failed')
      
      setValidationResults(result)
      setIsValidated(true)
      
      if (result.is_all_valid) {
        setSuccess('Validation successful! All rows are verified and valid.')
      } else {
        setError(`Validation completed with errors. Click any edit pencil to correct details.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setValidating(false)
    }
  }

  const handleEditPreviewRow = (index: number) => {
    setEditingIndex(index)
    const padded = [...previewRows[index]]
    while (padded.length < 15) padded.push('')
    setEditPreviewData(padded)
    setEditPreviewDialogOpen(true)
  }

  const handleSavePreviewEdit = () => {
    if (editingIndex === null) return
    const newRows = [...previewRows]
    newRows[editingIndex] = editPreviewData
    setPreviewRows(newRows)
    setEditPreviewDialogOpen(false)
    handleValidateSingleRow(editingIndex)
  }

  const handleValidateSingleRow = async (rowIndex: number) => {
    if (!accessToken || rowIndex < 0 || rowIndex >= previewRows.length) return
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/validate-rows`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          rows: [{ data: previewRows[rowIndex], index: rowIndex + 1 }] 
        })
      })
      const result = await response.json()
      if (result.success && result.rows.length > 0) {
        const rowResult = result.rows[0]
        setValidationResults((prev: any) => {
          const currentRows = prev?.rows || []
          const newRows = [...currentRows]
          const existingIdx = newRows.findIndex((r: any) => r.index === rowResult.index)
          if (existingIdx !== -1) newRows[existingIdx] = rowResult
          else newRows.push(rowResult)
          
          const errorCount = newRows.filter((r: any) => !r.is_valid).length
          return { ...prev, rows: newRows, error_count: errorCount, is_all_valid: errorCount === 0 }
        })
      }
    } catch (err) {
      console.error('Row validation failed', err)
    }
  }

  const handleImport = async () => {
    if (selectedPreviewRows.length === 0) {
      setError('Please select at least one row to import.')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const rowsToImport = selectedPreviewRows.map(idx => ({
        data: previewRows[idx],
        index: idx + 1
      }))

      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/import-rows`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ rows: rowsToImport })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Import failed')

      setImportResult(result)
      if (result.processed_rows > 0) {
        // Automatically process enrollments
        await handleProcess(result.batch_id)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setImporting(false)
    }
  }

  const handleProcess = async (batchId: string) => {
    setProcessing(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ batch_id: batchId })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Processing failed')

      setSuccess(`Staging & processing completed. ${result.message}`)
      
      // Close the workspace & reload parent list
      setImportDialogOpen(false)
      setFile(null)
      setPreviewRows([])
      setValidationResults(null)
      fetchOpenings()
    } catch (err: any) {
      setError(`Staging Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }
  const handleClearWorkspace = () => {
    setFile(null)
    setPreviewRows([])
    setPreviewHeader([])
    setSelectedPreviewRows([])
    setValidationResults(null)
    setError(null)
    setSuccess(null)
  }

  const downloadSample = () => {
    const headers = [
      '"Opening Date"', '"Account Name"', '"City"', '"MobileNo"', '"Salesman"',
      '"SchemeType"', '"Total Amount"', '"Total Weight"', '"Ticket No"', '"Deposit Or Redeem"',
      '"Branch Name"', '"Narration"', '"Scheme Name"', '"Installment Amount"', '"Number of Months"'
    ]
    const sampleData = [
      '"12-05-2026"', '"Aditya Verma"', '"Mumbai"', '"9876543210"', '"Admin"',
      '"Amount"', '"15000"', '"2.500"', '"T-505"', '"Deposit"', '"Zavery"',
      '"Starting scheme opening balance"', '"Swarna Laxmi Yojana-Fixed"', '"5000"', '"3"'
    ]
    
    const csvContent = '\uFEFF' + [headers, sampleData].map(e => e.join(',')).join('\r\n')
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
    const link = document.createElement('a')
    link.href = encodedUri
    link.download = 'scheme_opening_template.csv'
    link.setAttribute('download', 'scheme_opening_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Box sx={{ p: 4, bgcolor: 'var(--mui-palette-background-default)', minHeight: '100vh' }}>
      
      {/* Action Bar (Standardized Top Toolbar) */}
      <Card sx={{ mb: 6, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction='row' spacing={2} sx={{ p: 2, bgcolor: 'var(--mui-palette-action-hover)' }} alignItems="center">
          <Button 
            size='medium' 
            variant='contained'
            color='primary'
            startIcon={<i className='ri-file-excel-2-line' />} 
            onClick={() => setImportDialogOpen(true)}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Import
          </Button>
          <Button 
            size='medium' 
            variant='contained'
            color='secondary'
            startIcon={<i className='ri-add-line' />} 
            onClick={() => setAddDialogOpen(true)}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Add Entry
          </Button>
          <Button 
            size='medium' 
            variant='outlined'
            startIcon={<i className='ri-refresh-line' />} 
            onClick={fetchOpenings}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Refresh
          </Button>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <TextField
            size='small'
            placeholder='Search openings...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ width: 280, '& .MuiInputBase-root': { height: 38, fontSize: '0.875rem', bgcolor: 'background.paper' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-search-line' />
                </InputAdornment>
              )
            }}
          />
        </Stack>
      </Card>

      {/* Main Title Banner */}
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          Scheme Opening Entry
        </Typography>
      </Stack>

      {success && <Alert severity="success" sx={{ mb: 4 }} onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Default Content: Master Listing Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--mui-palette-action-hover)', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>SI. No</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Account Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Mobile No</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Scheme Type</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Scheme Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Inst. Amt</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>Months</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Weight (g)</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={12} style={{ padding: '40px', textAlign: 'center' }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading openings list...</Typography>
                  </td>
                </tr>
              ) : listData.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    No scheme openings entries found. Click the <strong>Import</strong> button to load spreadsheet data.
                  </td>
                </tr>
              ) : (
                listData.map((row: any, index: number) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{(currentPage - 1) * 15 + index + 1}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{row.opening_date ? new Date(row.opening_date).toLocaleDateString('en-GB') : '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: 500, color: '#1e3a8a' }}>{row.account_name}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{row.mobile_no}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                      <Chip 
                        label={row.scheme_type || 'N/A'} 
                        size="small" 
                        variant="outlined"
                        color={row.scheme_type === 'Amount' ? 'primary' : row.scheme_type === 'Weight' ? 'secondary' : 'default'}
                        sx={{ borderRadius: '4px', fontWeight: 600, height: 22 }}
                      />
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{row.scheme_name || '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(row.installment_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', textAlign: 'center' }}>{row.number_of_months || '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem', textAlign: 'right' }}>{parseFloat(row.total_weight).toFixed(3)}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <Chip 
                        label={row.status} 
                        size="small" 
                        color={row.status === 'Processed' ? 'success' : row.status === 'Failed' ? 'error' : 'warning'}
                        sx={{ borderRadius: '4px', fontWeight: 600, height: 22 }}
                      />
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {row.status !== 'Processed' && (
                          <Tooltip title="Enroll / Process Opening" arrow>
                            <IconButton size="small" color="success" onClick={() => handleProcessSingle(row.id)}>
                              <i className="ri-play-fill" style={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View Entry Detail" arrow>
                          <IconButton size="small" color="info" onClick={() => handleViewRowClick(row)}>
                            <i className="ri-eye-line" style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Entry" arrow>
                          <IconButton size="small" color="primary" onClick={() => handleEditRowClick(row)}>
                            <i className="ri-edit-line" style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Entry" arrow>
                          <IconButton size="small" color="error" onClick={() => handleDeleteOpening(row.id)}>
                            <i className="ri-delete-bin-line" style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
        
        {/* Pagination Bar */}
        {totalRecords > 15 && (
          <Box display="flex" justifyContent="flex-end" sx={{ p: 4 }}>
            <Pagination 
              count={Math.ceil(totalRecords / 15)} 
              page={currentPage} 
              onChange={(_, value) => setCurrentPage(value)} 
              color="primary" 
              size="small"
            />
          </Box>
        )}
      </Card>

      {/* Wide Dialog Modal: Import Excel / CSV Workspace */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => !importing && !processing && setImportDialogOpen(false)} 
        maxWidth="xl" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Excel Sheet Import Workspace (Scheme Openings)</span>
          <IconButton onClick={() => setImportDialogOpen(false)} disabled={importing || processing} size="small">
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 6 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 4, '& .MuiAlert-message': { width: '100%' } }} 
              onClose={() => setError(null)}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {error}
              </Typography>
              {validationResults && validationResults.rows && validationResults.rows.some((r: any) => !r.is_valid) && (
                <Box sx={{ mt: 3, maxHeight: '200px', overflowY: 'auto', bgcolor: 'rgba(211, 47, 47, 0.04)', p: 3, borderRadius: '6px', border: '1px dashed rgba(211, 47, 47, 0.2)' }}>
                  {validationResults.rows.filter((r: any) => !r.is_valid).map((r: any) => (
                    <Box key={r.index} sx={{ mb: 1.5, fontSize: '0.825rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--mui-palette-error-main)' }}>Row {r.index}:</span>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {r.errors.map((e: any, idx: number) => (
                          <li key={idx} style={{ color: 'var(--mui-palette-text-primary)' }}>{e.message}</li>
                        ))}
                      </ul>
                    </Box>
                  ))}
                </Box>
              )}
            </Alert>
          )}
          {success && <Alert severity="success" sx={{ mb: 4 }}>{success}</Alert>}

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <Typography variant='body2' color='text.secondary'>
              Upload your spreadsheet containing columns mapping to standard customer details, starting paid amount, and target scheme parameters.
            </Typography>
            <Button 
              variant='outlined' 
              size='small' 
              startIcon={<i className='ri-download-line' />}
              onClick={downloadSample}
            >
              Download Sample Spreadsheet
            </Button>
          </Stack>

          <Dropzone onClick={() => !importing && !processing && document.getElementById('sheet-file-picker')?.click()}>
            <input
              id='sheet-file-picker'
              type='file'
              hidden
              accept='.csv, .xlsx, .xls'
              onChange={handleFileChange}
              disabled={importing || processing}
            />
            <i className='ri-file-excel-line' style={{ fontSize: '48px', color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='h6' sx={{ mt: 3 }}>
              {file ? file.name : 'Click or Drag & Drop Excel sheet here'}
            </Typography>
            <Typography variant='caption' color='text.secondary' display="block" sx={{ mt: 1 }}>
              Required format (15 columns): Opening Date, Account Name, City, MobileNo, Salesman, SchemeType (Amount or Weight), Total Amount, Total Weight, Ticket No, Deposit Or Redeem, Branch Name, Narration, Scheme Name, Installment Amount, Number of Months
            </Typography>
          </Dropzone>

          {/* Staging / Verify table */}
          {file && previewRows.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                  Parsed Records Staging ({previewRows.length} rows)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button 
                    variant="contained" 
                    color="info" 
                    onClick={handleValidate}
                    disabled={validating || processing}
                    startIcon={validating && <CircularProgress size={16} color="inherit" />}
                  >
                    Verify & Validate Cells
                  </Button>
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={handleImport}
                    disabled={importing || processing || (validationResults && !validationResults.is_all_valid)}
                    startIcon={importing && <CircularProgress size={16} color="inherit" />}
                  >
                    Post & Enroll Openings
                  </Button>
                </Stack>
              </Stack>
              
              <Box sx={{ 
                overflowX: 'auto', 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: '8px', 
                maxHeight: 400,
                position: 'relative',
                '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }
              }}>
                <table>
                  <thead style={{ backgroundColor: 'var(--mui-palette-action-hover)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '10px', borderBottom: '1px solid var(--mui-palette-divider)', textAlign: 'left', width: 50 }}>
                        <Checkbox 
                          size="small"
                          indeterminate={selectedPreviewRows.length > 0 && selectedPreviewRows.length < previewRows.length}
                          checked={previewRows.length > 0 && selectedPreviewRows.length === previewRows.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPreviewRows(previewRows.map((_, i) => i))
                            } else {
                              setSelectedPreviewRows([])
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: '10px', borderBottom: '1px solid var(--mui-palette-divider)', textAlign: 'left', width: 40 }}>#</th>
                      {previewHeader.map((h, i) => (
                        <th key={i} style={{ padding: '10px', borderBottom: '1px solid var(--mui-palette-divider)', textAlign: 'left', minWidth: 120 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                     {previewRows.map((row, rowIndex) => {
                       const validationRow = validationResults?.rows?.find((r: any) => r.index === rowIndex + 1)
                       const rowErrors = validationRow?.errors || []
                       const isSelected = selectedPreviewRows.includes(rowIndex)
                       
                       return (
                         <tr 
                           key={rowIndex} 
                           onClick={() => {
                              if (isSelected) setSelectedPreviewRows(selectedPreviewRows.filter(i => i !== rowIndex))
                              else setSelectedPreviewRows([...selectedPreviewRows, rowIndex])
                           }}
                           style={{ 
                             backgroundColor: isSelected ? 'rgba(var(--mui-palette-primary-mainChannel), 0.08)' : (rowErrors.length > 0 ? 'rgba(255, 0, 0, 0.05)' : 'transparent'),
                             cursor: 'pointer'
                           }}
                         >
                           <td style={{ padding: '0 10px', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                              <Checkbox 
                                size="small" 
                                checked={isSelected} 
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                              />
                           </td>
                           <td style={{ padding: '10px', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                             <Stack direction="row" spacing={1} alignItems="center">
                               <span>{rowIndex + 1}</span>
                               <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditPreviewRow(rowIndex); }}>
                                 <i className="ri-edit-line" style={{ fontSize: '0.9rem' }} />
                               </IconButton>
                             </Stack>
                           </td>
                           {Array.from({ length: 15 }).map((_, cellIndex) => {
                             const cellValue = row[cellIndex] || ''
                             const cellError = rowErrors.find((e: any) => e.column === cellIndex)
                             return (
                               <Tooltip key={cellIndex} title={cellError?.message || ''} arrow>
                                 <td style={{ 
                                   padding: '10px', 
                                   borderBottom: '1px solid var(--mui-palette-divider)',
                                   color: cellError ? 'var(--mui-palette-error-main)' : 'inherit',
                                   backgroundColor: cellError ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
                                   fontWeight: cellError ? 600 : 400
                                 }}>
                                   {cellValue}
                                 </td>
                               </Tooltip>
                             )
                           })}
                         </tr>
                       )
                     })}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button 
            onClick={handleClearWorkspace} 
            color="error" 
            variant="outlined" 
            disabled={!file}
            sx={{ mr: 'auto', textTransform: 'none' }}
            startIcon={<i className="ri-delete-bin-line" />}
          >
            Clear Workspace
          </Button>
          <Button onClick={() => setImportDialogOpen(false)} variant="outlined" sx={{ textTransform: 'none' }}>Close Workspace</Button>
        </DialogActions>
      </Dialog>

      {/* Row Edit Modal */}
      <Dialog open={editPreviewDialogOpen} onClose={() => setEditPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Modify Row Parameters</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 6 }}>
          <Grid container spacing={4}>
            {[
              { label: 'Opening Date (DD-MM-YYYY)', index: 0 },
              { label: 'Account Name', index: 1 },
              { label: 'City', index: 2 },
              { label: 'MobileNo', index: 3 },
              { label: 'Salesman', index: 4 },
              { label: 'SchemeType (Amount or Weight)', index: 5 },
              { label: 'Total Amount', index: 6 },
              { label: 'Total Weight', index: 7 },
              { label: 'Ticket No', index: 8 },
              { label: 'Deposit Or Redeem', index: 9 },
              { label: 'Branch Name', index: 10 },
              { label: 'Narration', index: 11 },
              { label: 'Scheme Name', index: 12 },
              { label: 'Installment Amount', index: 13 },
              { label: 'Number of Months', index: 14 }
            ].map((col) => (
              <Grid size={{ xs: 12, sm: 4 }} key={col.index}>
                <TextField
                  fullWidth
                  size="small"
                  label={col.label}
                  value={editPreviewData[col.index] || ''}
                  onChange={(e) => {
                    const updated = [...editPreviewData]
                    updated[col.index] = e.target.value
                    setEditPreviewData(updated)
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setEditPreviewDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSavePreviewEdit} variant="contained" color="primary">Apply & Verify</Button>
        </DialogActions>
      </Dialog>

      {/* View Entry Detail Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Scheme Opening Entry Details</span>
          <Chip label={selectedRow?.status || 'Pending'} color={selectedRow?.status === 'Processed' ? 'success' : 'warning'} size="small" />
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 6 }}>
          {selectedRow && (
            <Grid container spacing={4}>
              {/* General & Customer Details */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Customer & General Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Account Name"
                  value={selectedRow.account_name || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Mobile No"
                  value={selectedRow.mobile_no || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="City"
                  value={selectedRow.city || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Opening Date (DD-MM-YYYY)"
                  value={selectedRow.opening_date ? new Date(selectedRow.opening_date).toLocaleDateString('en-GB') : ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Salesman"
                  value={selectedRow.salesman || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Branch Name"
                  value={selectedRow.branch_name || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* Scheme & Transaction Configuration */}
              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Scheme & Transaction Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Scheme Name"
                  value={selectedRow.scheme_name || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small" disabled>
                  <InputLabel>Scheme Type</InputLabel>
                  <Select
                    label="Scheme Type"
                    value={selectedRow.scheme_type || 'Amount'}
                    readOnly
                  >
                    <MenuItem value="Amount">Amount</MenuItem>
                    <MenuItem value="Weight">Weight</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small" disabled>
                  <InputLabel>Deposit Or Redeem</InputLabel>
                  <Select
                    label="Deposit Or Redeem"
                    value={selectedRow.deposit_or_redeem || 'Deposit'}
                    readOnly
                  >
                    <MenuItem value="Deposit">Deposit</MenuItem>
                    <MenuItem value="Redeem">Redeem</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Total Amount"
                  value={selectedRow.total_amount || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Installment Amount"
                  value={selectedRow.installment_amount || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Number of Months"
                  value={selectedRow.number_of_months || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Total Weight (g)"
                  value={selectedRow.total_weight || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Ticket No"
                  value={selectedRow.ticket_no || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              {/* Additional References */}
              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Additional References
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Lot No"
                  value={selectedRow.lot_no || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth size="small" label="Narration"
                  value={selectedRow.narration || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          {selectedRow && selectedRow.status !== 'Processed' && (
            <Button 
              onClick={() => { setViewDialogOpen(false); handleEditRowClick(selectedRow); }} 
              variant="contained" 
              color="primary"
              startIcon={<i className="ri-edit-line" />}
              sx={{ mr: 'auto', textTransform: 'none' }}
            >
              Edit Details
            </Button>
          )}
          <Button onClick={() => setViewDialogOpen(false)} variant="outlined" sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Modify Scheme Opening Details</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 6 }}>
          {selectedRow && (
            <Grid container spacing={4}>
              {/* General & Customer Details */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Customer & General Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  size="small"
                  options={customers}
                  getOptionLabel={(option: any) => option.name ? `${option.name} (${option.mobile})` : option.mobile || ''}
                  value={customers.find((c: any) => c.name === selectedRow.account_name) || null}
                  onChange={(event, newValue: any) => {
                    setSelectedRow({
                      ...selectedRow,
                      account_name: newValue ? newValue.name : '',
                      mobile_no: newValue ? newValue.mobile : ''
                    })
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Account Name" required />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Mobile No"
                  value={selectedRow.mobile_no || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, mobile_no: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="City"
                  value={selectedRow.city || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, city: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Opening Date (DD-MM-YYYY)"
                  value={selectedRow.opening_date || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, opening_date: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Salesman</InputLabel>
                  <Select
                    label="Salesman"
                    value={selectedRow.salesman || ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, salesman: e.target.value })}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {salesmen.map((s: any) => (
                      <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Branch Name</InputLabel>
                  <Select
                    label="Branch Name"
                    value={selectedRow.branch_name || ''}
                    onChange={(e) => setSelectedRow({ ...selectedRow, branch_name: e.target.value })}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {branches.map((b: any) => (
                      <MenuItem key={b.id} value={b.name}>{b.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Scheme & Transaction Configuration */}
              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Scheme & Transaction Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Scheme Name"
                  value={selectedRow.scheme_name || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, scheme_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Scheme Type</InputLabel>
                  <Select
                    label="Scheme Type"
                    value={selectedRow.scheme_type || 'Amount'}
                    onChange={(e) => setSelectedRow({ ...selectedRow, scheme_type: e.target.value })}
                  >
                    <MenuItem value="Amount">Amount</MenuItem>
                    <MenuItem value="Weight">Weight</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Deposit Or Redeem</InputLabel>
                  <Select
                    label="Deposit Or Redeem"
                    value={selectedRow.deposit_or_redeem || 'Deposit'}
                    onChange={(e) => setSelectedRow({ ...selectedRow, deposit_or_redeem: e.target.value })}
                  >
                    <MenuItem value="Deposit">Deposit</MenuItem>
                    <MenuItem value="Redeem">Redeem</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Total Amount" type="number"
                  value={selectedRow.total_amount || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, total_amount: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Installment Amount" type="number"
                  value={selectedRow.installment_amount || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, installment_amount: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Number of Months" type="number"
                  value={selectedRow.number_of_months || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, number_of_months: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Total Weight (g)" type="number"
                  value={selectedRow.total_weight || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, total_weight: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Ticket No"
                  value={selectedRow.ticket_no || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, ticket_no: e.target.value })}
                />
              </Grid>

              {/* Additional References */}
              <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Additional References
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth size="small" label="Lot No"
                  value={selectedRow.lot_no || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, lot_no: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth size="small" label="Narration"
                  value={selectedRow.narration || ''}
                  onChange={(e) => setSelectedRow({ ...selectedRow, narration: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveEditRow} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Add Manual Entry Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Create Scheme Opening Entry Manually</DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 6 }}>
          <Grid container spacing={4}>
            {/* General & Customer Details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Customer & General Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                size="small"
                options={customers}
                getOptionLabel={(option: any) => option.name ? `${option.name} (${option.mobile})` : option.mobile || ''}
                value={customers.find((c: any) => c.name === manualData.account_name) || null}
                onChange={(event, newValue: any) => {
                  setManualData({
                    ...manualData,
                    account_name: newValue ? newValue.name : '',
                    mobile_no: newValue ? newValue.mobile : '',
                    city: newValue?.kyc?.city || manualData.city
                  })
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Account Name (Customer Master)" required />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Mobile No" required
                value={manualData.mobile_no}
                onChange={(e) => setManualData({ ...manualData, mobile_no: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="City"
                value={manualData.city}
                onChange={(e) => setManualData({ ...manualData, city: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Opening Date (DD-MM-YYYY)" placeholder="12-05-2026"
                value={manualData.opening_date}
                onChange={(e) => setManualData({ ...manualData, opening_date: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Salesman (Staff List)</InputLabel>
                <Select
                  label="Salesman (Staff List)"
                  value={manualData.salesman}
                  onChange={(e) => setManualData({ ...manualData, salesman: e.target.value })}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {salesmen.map((s: any) => (
                    <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Branch Name (Branch Master)</InputLabel>
                <Select
                  label="Branch Name (Branch Master)"
                  value={manualData.branch_name}
                  onChange={(e) => setManualData({ ...manualData, branch_name: e.target.value })}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {branches.map((b: any) => (
                    <MenuItem key={b.id} value={b.name}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Scheme & Transaction Configuration */}
            <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Scheme & Transaction Configuration
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Scheme Name" required
                value={manualData.scheme_name}
                onChange={(e) => setManualData({ ...manualData, scheme_name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Scheme Type</InputLabel>
                <Select
                  label="Scheme Type"
                  value={manualData.scheme_type}
                  onChange={(e) => setManualData({ ...manualData, scheme_type: e.target.value })}
                >
                  <MenuItem value="Amount">Amount</MenuItem>
                  <MenuItem value="Weight">Weight</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Deposit Or Redeem</InputLabel>
                <Select
                  label="Deposit Or Redeem"
                  value={manualData.deposit_or_redeem}
                  onChange={(e) => setManualData({ ...manualData, deposit_or_redeem: e.target.value })}
                >
                  <MenuItem value="Deposit">Deposit</MenuItem>
                  <MenuItem value="Redeem">Redeem</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Total Amount" type="number"
                value={manualData.total_amount}
                onChange={(e) => setManualData({ ...manualData, total_amount: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Installment Amount" type="number"
                value={manualData.installment_amount}
                onChange={(e) => setManualData({ ...manualData, installment_amount: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Number of Months" type="number"
                value={manualData.number_of_months}
                onChange={(e) => setManualData({ ...manualData, number_of_months: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Total Weight (g)" type="number"
                value={manualData.total_weight}
                onChange={(e) => setManualData({ ...manualData, total_weight: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Ticket No"
                value={manualData.ticket_no}
                onChange={(e) => setManualData({ ...manualData, ticket_no: e.target.value })}
              />
            </Grid>

            {/* Additional References */}
            <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Additional References
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth size="small" label="Lot No"
                value={manualData.lot_no}
                onChange={(e) => setManualData({ ...manualData, lot_no: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth size="small" label="Narration"
                value={manualData.narration}
                onChange={(e) => setManualData({ ...manualData, narration: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setAddDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaveAddManual} variant="contained" color="primary">Save & Stage Entry</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to permanently delete this scheme opening entry?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SchemeOpeningEntryPage

