'use client'

import { useState } from 'react'
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
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import TextField from '@mui/material/TextField'
import { styled } from '@mui/material/styles'
import { resolveBackendApiUrl } from '../customers/customerData'

// Styled components for the dropzone
const Dropzone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(10),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover
  }
}))

const SaleDataImportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const [tabValue, setTabValue] = useState(0)
  const [batches, setBatches] = useState<any[]>([])
  const [batchDetails, setBatchDetails] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingBatch, setLoadingBatch] = useState(false)
  
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{type: 'batch' | 'record' | 'bulk', id?: string | number} | null>(null)

  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [recordLogs, setRecordLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [previewHeader, setPreviewHeader] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationResults, setValidationResults] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const [validatingSingle, setValidatingSingle] = useState(false)
  const [isValidated, setIsValidated] = useState(false)
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([])
  const [editPreviewDialogOpen, setEditPreviewDialogOpen] = useState(false)
  const [editPreviewData, setEditPreviewData] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleOpenLogs = async (id: number) => {
    if (!accessToken) return
    setLogDialogOpen(true)
    setLoadingLogs(true)
    setRecordLogs([])
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/records/${id}/logs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      const result = await response.json()
      if (result.success) {
        setRecordLogs(result.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch logs', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleDeleteRequest = (type: 'batch' | 'record' | 'bulk', id?: string | number) => {
    setDeleteTarget({ type, id })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !accessToken) return
    setProcessing(true)
    setDeleteDialogOpen(false)
    try {
      let url = ''
      let options: RequestInit = {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      }

      if (deleteTarget.type === 'batch') {
        url = `${resolveBackendApiUrl()}/loyalty-sale-import/batches/${deleteTarget.id}`
      } else if (deleteTarget.type === 'bulk') {
        url = `${resolveBackendApiUrl()}/loyalty-sale-import/records/bulk-delete`
        options = {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: selectedRows })
        }
      } else {
        url = `${resolveBackendApiUrl()}/loyalty-sale-import/records/${deleteTarget.id}`
      }
      
      const response = await fetch(url, options)
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.message || 'Deletion failed')
      
      setSuccess(result.message)
      
      if (deleteTarget.type === 'bulk') {
        setSelectedRows([])
        if (result.fully_deleted) {
           setSelectedBatch(null)
           setBatchDetails([])
        } else {
           await fetchBatchDetails(selectedBatch as string)
        }
      } else if (deleteTarget.type === 'batch') {
        if (result.fully_deleted) {
           setSelectedBatch(null)
           setBatchDetails([])
        } else {
           await fetchBatchDetails(deleteTarget.id as string)
        }
      } else {
        if (result.fully_deleted) {
           setSelectedBatch(null)
           setBatchDetails([])
        } else {
           await fetchBatchDetails(selectedBatch as string)
        }
      }
      
      // Always refresh the history list to reflect any changes in batch counts or removals
      await fetchHistory()

    } catch (err: any) {
      setError(`Delete Error: ${err.message}`)
    } finally {
      setProcessing(false)
      setDeleteTarget(null)
    }
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(batchDetails.map(row => row.id))
    } else {
      setSelectedRows([])
    }
  }

  const handleSelectRow = (event: React.ChangeEvent<HTMLInputElement>, id: number) => {
    if (event.target.checked) {
      setSelectedRows([...selectedRows, id])
    } else {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    }
  }

  const handleOpenEdit = () => {
    if (selectedRows.length !== 1) return
    const row = batchDetails.find(r => r.id === selectedRows[0])
    if (row) {
      setEditData({ ...row })
      setEditDialogOpen(true)
    }
  }

  const handleEditSave = async () => {
    if (!editData || !accessToken) return
    setProcessing(true)
    setError(null)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/records/${editData.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(editData)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Update failed')
      setSuccess(result.message)
      setEditDialogOpen(false)
      setSelectedRows([])
      await fetchBatchDetails(selectedBatch as string)
    } catch (err: any) {
      setError(`Edit Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
      setImportResult(null)
      setIsValidated(false)
      setValidationResults(null)
      
      // Parse file for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) {
          const lines = text.split(/\r?\n/)
          const data = lines
            .filter(line => line.trim() !== '')
            .map(line => {
              // Basic CSV split - handles comma inside quotes partially
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
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/validate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Validation failed')
      
      setValidationResults(result)
      setIsValidated(true)
      
      if (result.is_all_valid) {
        setSuccess('Validation successful! All rows are valid. You can now save the data.')
      } else {
        setError(`Validation failed: Found ${result.error_count} rows with errors. Please review the highlighted cells below.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setValidating(false)
    }
  }

  const handleValidateSelectedRows = async () => {
    if (!accessToken || selectedPreviewRows.length === 0) return
    setValidatingSingle(true)
    
    try {
      const rowsToValidate = selectedPreviewRows.map(idx => ({
        data: previewRows[idx],
        index: idx + 1
      }))

      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/validate-rows`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rows: rowsToValidate })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Validation failed')
      
      // Update validation results for these specific rows
      setValidationResults((prev: any) => {
        const currentRows = prev?.rows || []
        const newRows = [...currentRows]
        
        result.rows.forEach((rowResult: any) => {
          const existingIdx = newRows.findIndex((r: any) => r.index === rowResult.index)
          if (existingIdx !== -1) {
            newRows[existingIdx] = rowResult
          } else {
            newRows.push(rowResult)
          }
        })
        
        const errorCount = newRows.filter((r: any) => !r.is_valid).length
        return {
          ...prev,
          rows: newRows,
          error_count: errorCount,
          is_all_valid: errorCount === 0
        }
      })
      
      setSuccess(`${selectedPreviewRows.length} rows validated successfully.`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setValidatingSingle(false)
    }
  }

  const handleEditPreviewRow = (index: number) => {
    setEditingIndex(index)
    setEditPreviewData([...previewRows[index]])
    setEditPreviewDialogOpen(true)
  }

  const handleSavePreviewEdit = () => {
    if (editingIndex === null) return
    
    const newRows = [...previewRows]
    newRows[editingIndex] = editPreviewData
    setPreviewRows(newRows)
    setEditPreviewDialogOpen(false)
    
    // Validate just this edited row
    handleValidateSingleRow(editingIndex)
  }

  const handleValidateSingleRow = async (rowIndex: number) => {
    if (!accessToken || rowIndex < 0 || rowIndex >= previewRows.length) return
    
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/validate-rows`, {
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

    if (!accessToken) {
      setError('You must be logged in to import data.')
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

      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/import-rows`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ rows: rowsToImport })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Import failed')
      }

      setImportResult(result)
      
      if (result.failed_rows > 0) {
        let errorMsg = `Import partially completed. ${result.processed_rows} rows staged, but ${result.failed_rows} rows failed.`
        if (result.errors && result.errors.length > 0) {
          errorMsg += ` Errors: ${result.errors.slice(0, 5).join('; ')}${result.errors.length > 5 ? '...' : ''}`
        }
        setError(errorMsg)
      } else {
        setSuccess(`Step 1: All ${result.processed_rows} selected rows staged successfully.`)
      }
      
      if (result.processed_rows > 0) {
        // Automatically trigger processing for the staged rows
        handleProcess(result.batch_id)
      }
      
      // Clear preview state
      setFile(null)
      setPreviewRows([])
      setSelectedPreviewRows([])
      setIsValidated(false)
      setValidationResults(null)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setImporting(false)
    }
  }

  const handleProcess = async (batchId: string, recordIds: number[] = []) => {
    setProcessing(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/process`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ batch_id: batchId, record_ids: recordIds })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Processing failed')
      }

      setSuccess(prev => `${prev} \nStep 2: ${result.message}`)
      if (selectedBatch === batchId) fetchBatchDetails(batchId)
      setSelectedRows([])
    } catch (err: any) {
      setError(prev => `${prev} Processing Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const downloadSample = () => {
    const headers = ['Vou. Date', 'Vou. No.', 'Mobile No.', 'Party Name', 'Metal Name', 'Carat', 'Net Wt.', 'Total Amt.', 'GST Taxable Amt.', 'Salesman', 'Branch', 'Loyalty Card No.', 'Introducer']
    const sampleData = ['03-05-2026', 'INV/2026/001', '9876543210', 'John Doe', 'Gold', '22K', '10.500', '75000', '72815', 'Admin Sales', 'Main Branch', '1000000001', '1000000005']
    
    const csvContent = [headers, sampleData].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'sale_import_sample.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchHistory = async () => {
    if (!accessToken) return
    setLoadingHistory(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)

      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/batches?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      const result = await response.json()
      if (result.success) setBatches(result.data)
    } catch (err) {
      console.error('Failed to fetch history', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchBatchDetails = async (batchId: string) => {
    if (!accessToken) return
    setLoadingBatch(true)
    setSelectedBatch(batchId)
    setSelectedRows([])
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-sale-import/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      const result = await response.json()
      if (result.success) setBatchDetails(result.data)
    } catch (err) {
      console.error('Failed to fetch batch details', err)
    } finally {
      setLoadingBatch(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    if (newValue === 1) fetchHistory()
  }

  const handleDownloadBatch = () => {
    if (!batchDetails.length) return

    const headers = [
      'Vou. Date', 'Vou. No.', 'Mobile No.', 'Party Name', 'Metal Name', 'Carat', 
      'Net Wt.', 'Total Amt.', 'GST Taxable Amt.', 'Salesman', 'Branch', 
      'Loyalty Card No.', 'Introducer', 'Status', 'Error'
    ]
    
    const rows = batchDetails.map(row => [
      row.vou_date ? row.vou_date.substring(0, 10) : '',
      `"${row.vou_no || ''}"`,
      row.mobile_no || '',
      `"${row.party_name || ''}"`,
      row.metal_name || '',
      row.carat || '',
      row.net_wt || 0,
      row.total_amt || 0,
      row.gst_taxable_amt || 0,
      `"${row.salesman_name || ''}"`,
      `"${row.branch_name || ''}"`,
      row.loyalty_card_no || '',
      row.introducer || '',
      row.status || '',
      `"${(row.error_message || '').replace(/"/g, '""')}"`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `import_batch_${selectedBatch}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          Sale Data Import
        </Typography>
      </Stack>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ mb: 6, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label='Upload' />
        <Tab label='Import History' />
      </Tabs>

      {tabValue === 0 ? (
        <>
          {error && (
            <Alert severity='error' sx={{ mb: 4 }} onClose={() => setError(null)}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{error}</Typography>
              {validationResults && !validationResults.is_all_valid && (
                <Box sx={{ mt: 2, maxHeight: 200, overflowY: 'auto' }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationResults.rows.filter((r: any) => !r.is_valid).map((row: any) => (
                      <li key={row.index}>
                        <strong>Row {row.index}:</strong> {row.errors.map((e: any) => e.message).join(', ')}
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Alert>
          )}
          {success && <Alert severity='success' sx={{ mb: 4 }} onClose={() => setSuccess(null)}>{success}</Alert>}

          {importResult && (
            <Card sx={{ mb: 6, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Stack direction='row' spacing={6} alignItems='center' justifyContent='space-around'>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='primary.main'>{importResult.total_rows}</Typography>
                    <Typography variant='caption' color='text.secondary'>Total Rows</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='success.main'>{importResult.processed_rows}</Typography>
                    <Typography variant='caption' color='text.secondary'>Valid Rows</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant='h6' color='error.main'>{importResult.failed_rows}</Typography>
                    <Typography variant='caption' color='text.secondary'>Failed Rows</Typography>
                  </Box>
                  <Button 
                    variant='contained' 
                    color='success'
                    disabled={processing || importResult.processed_rows === 0}
                    onClick={() => handleProcess(importResult.batch_id)}
                    startIcon={processing && <CircularProgress size={16} color='inherit' />}
                  >
                    Post to Ledger
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <Typography variant='subtitle1' sx={{ mb: 2, fontWeight: 600 }}>
                    Upload Sale Data File
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
                    Please upload a CSV or Excel file containing sale transaction data. The file must follow the specific column format and rules outlined below.
                  </Typography>
                  
                  <Dropzone onClick={() => !importing && !processing && document.getElementById('file-upload')?.click()}>
                    <input
                      id='file-upload'
                      type='file'
                      hidden
                      accept='.csv, .xlsx, .xls'
                      onChange={handleFileChange}
                      disabled={importing || processing}
                    />
                    <i className='ri-upload-cloud-2-line' style={{ fontSize: '48px', color: 'var(--mui-palette-primary-main)' }} />
                    <Typography variant='h6' sx={{ mt: 4 }}>
                      {file ? file.name : 'Click or Drag & Drop to upload file'}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Required Columns: Vou. Date, Vou. No, Mobile No, Party Name, Metal Name, Carat, Net Wt., Total Amt, GST Taxable Amt, Salesman, Branch Name, Loyalty Card No. (12 columns). Optional: Introducer (13th column).
                    </Typography>
                  </Dropzone>

                  {file && previewRows.length > 0 && (
                    <Box sx={{ mt: 6 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                          File Preview ({previewRows.length} rows)
                        </Typography>
                        {selectedPreviewRows.length > 0 && (
                          <Box sx={{ px: 3, py: 1, bgcolor: 'primary.main', color: 'white', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {selectedPreviewRows.length} Row{selectedPreviewRows.length > 1 ? 's' : ''} Selected
                          </Box>
                        )}
                      </Stack>
                      <Box sx={{ 
                        overflowX: 'auto', 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: '8px', 
                        maxHeight: 500,
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
                             {previewRows.slice(0, 50).map((row, rowIndex) => {
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
                                        onChange={() => {}} // Controlled by row click
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                   </td>
                                   <td style={{ padding: '10px', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                     <Stack direction="row" spacing={1} alignItems="center">
                                       {rowIndex + 1}
                                       <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleEditPreviewRow(rowIndex); }}>
                                         <i className="ri-edit-line" style={{ fontSize: '0.9rem' }} />
                                       </IconButton>
                                     </Stack>
                                   </td>
                                   {row.map((cell: string, cellIndex: number) => {
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
                                           {cell}
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
                      {previewRows.length > 50 && (
                        <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
                          Showing first 50 rows only...
                        </Typography>
                      )}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 4 }} />
                  <Stack direction='row' spacing={4} justifyContent='space-between' alignItems='center'>
                    <Stack direction='row' spacing={2} alignItems="center">
                      <Button
                        variant='text'
                        color='primary'
                        startIcon={<i className='ri-download-line' />}
                        onClick={downloadSample}
                      >
                        Sample Sheet
                      </Button>
                      {selectedPreviewRows.length === 1 && (
                        <Button
                          variant='outlined'
                          size="small"
                          color='primary'
                          startIcon={<i className='ri-edit-line' />}
                          onClick={() => handleEditPreviewRow(selectedPreviewRows[0])}
                        >
                          Edit Selected Row
                        </Button>
                      )}
                      {validationResults?.rows?.some((r: any) => r.is_valid) && (
                        <Button
                          variant='text'
                          size="small"
                          color='success'
                          startIcon={<i className='ri-checkbox-multiple-line' />}
                          onClick={() => {
                            const validIndices = validationResults.rows
                              .filter((r: any) => r.is_valid)
                              .map((r: any) => r.index - 1)
                            setSelectedPreviewRows(validIndices)
                          }}
                        >
                          Select All Valid
                        </Button>
                      )}
                    </Stack>
                    <Stack direction='row' spacing={4}>
                      <Button 
                        variant='outlined' 
                        color='secondary'
                        onClick={() => { setFile(null); setImportResult(null); setPreviewRows([]); setIsValidated(false); }}
                        disabled={importing || processing || validating || !file}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant='contained'
                        color='warning'
                        startIcon={validatingSingle || validating ? <CircularProgress size={20} color='inherit' /> : <i className='ri-checkbox-circle-line' />}
                        disabled={importing || processing || validating || validatingSingle || !file || selectedPreviewRows.length === 0}
                        onClick={handleValidateSelectedRows}
                      >
                        {validatingSingle || validating ? 'Validating...' : `Validate ${selectedPreviewRows.length === previewRows.length ? 'All' : 'Selected'} Rows`}
                      </Button>
                      <Button
                        variant='contained'
                        startIcon={importing || processing ? <CircularProgress size={20} color='inherit' /> : <i className='ri-save-line' />}
                        disabled={importing || processing || !file || selectedPreviewRows.length === 0}
                        onClick={handleImport}
                      >
                        {importing ? 'Saving...' : `Save & Import ${selectedPreviewRows.length} Row${selectedPreviewRows.length !== 1 ? 's' : ''}`}
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mt: 6, borderRadius: '12px' }}>
            <CardContent>
              <Typography variant='subtitle2' sx={{ mb: 4, fontWeight: 700, textTransform: 'uppercase' }}>
                Column Rules & Format
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--mui-palette-text-secondary)', lineHeight: '1.8' }}>
                    <li><strong>1. Vou. Date:</strong> Format <code>DD-MM-YYYY</code> or <code>DD/MM/YYYY</code> (Mandatory)</li>
                    <li><strong>2. Vou. No:</strong> Unique Invoice Number (No duplicates)</li>
                    <li><strong>3. Mobile No:</strong> 10-digit number (Mandatory, Primary Key)</li>
                    <li><strong>4. Party Name:</strong> Customer Name (Auto-creates customer if mobile not found)</li>
                    <li><strong>5. Metal Name:</strong> Must match exactly with Metal Master (e.g., Gold, Silver, Platinum)</li>
                    <li><strong>6. Carat:</strong> Format: <code>22K, 18K, 24K, 925, sil</code> (Must match Carat/Purity Master)</li>
                  </ul>
                </Grid>
                <Grid item xs={12} md={6}>
                  <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--mui-palette-text-secondary)', lineHeight: '1.8' }}>
                    <li><strong>7. Net Wt.:</strong> Numeric, up to 3 decimal places (Required for weight-based loyalty)</li>
                    <li><strong>8. Total Amt:</strong> Numeric (Required for value-based loyalty)</li>
                    <li><strong>9. GST Taxable Amt:</strong> Numeric (Used for accurate value calculation)</li>
                    <li><strong>10. Salesman:</strong> Must match Staff/User Master</li>
                    <li><strong>11. Branch Name:</strong> Optional. Used to map sale to a branch.</li>
                    <li><strong>12. Loyalty Card No.:</strong> Optional. If provided, maps directly to customer.</li>
                    <li><strong>13. Introducer:</strong> Optional. Enter the Loyalty Card No. of the person who introduced this customer.</li>
                  </ul>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      ) : (
        <Grid container spacing={6}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '12px' }}>
              <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 3 }}>Recent Import Batches</Typography>
                <Stack spacing={3}>
                  <Stack direction='row' spacing={2}>
                    <TextField size="small" type="date" label="From Date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} fullWidth />
                    <TextField size="small" type="date" label="To Date" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} fullWidth />
                  </Stack>
                  <Button variant="contained" size="small" onClick={fetchHistory} fullWidth>Filter History</Button>
                </Stack>
              </Box>
              {loadingHistory ? (
                <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
              ) : (
                <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
                  {batches.map((batch) => (
                    <Box 
                      key={batch.import_batch_id} 
                      onClick={() => fetchBatchDetails(batch.import_batch_id)}
                      sx={{ 
                        p: 4, 
                        cursor: 'pointer', 
                        borderBottom: '1px solid', 
                        borderColor: 'divider',
                        bgcolor: selectedBatch === batch.import_batch_id ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Typography variant='body2' sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Date: {new Date(batch.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant='caption' color='text.primary' sx={{ display: 'block', fontWeight: 500, my: 1 }}>
                        Batch No: {batch.import_batch_id.substring(0, 13)}...
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        Total Lines: {batch.total}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            {selectedBatch ? (
              <Card sx={{ borderRadius: '12px' }}>
                <Box sx={{ p: 4, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                    Batch Details: {selectedBatch.substring(0, 8)}...
                  </Typography>
                  <Stack direction='row' spacing={2}>
                    <Button 
                      size='small' 
                      variant='tonal' 
                      color='secondary' 
                      startIcon={<i className='ri-download-line' />}
                      onClick={handleDownloadBatch}
                    >
                      Download CSV
                    </Button>
                    {selectedRows.length > 0 && (
                      <Stack direction='row' spacing={2}>
                        {selectedRows.length === 1 && (
                          <Button size='small' variant='outlined' color='primary' onClick={handleOpenEdit}>
                            Edit Selected
                          </Button>
                        )}
                         <Button size='small' variant='outlined' color='success' onClick={() => handleProcess(selectedBatch, selectedRows)}>
                           Post Selected ({selectedRows.length})
                         </Button>
                         <Button size='small' variant='outlined' color='error' onClick={() => handleDeleteRequest('bulk')}>
                           Delete Selected ({selectedRows.length})
                         </Button>
                      </Stack>
                    )}
                    <Button size='small' variant='outlined' color='error' onClick={() => handleDeleteRequest('batch', selectedBatch)}>
                      Delete Batch
                    </Button>
                    <Button size='small' variant='contained' color='success' onClick={() => handleProcess(selectedBatch)}>
                      Post All to Ledger
                    </Button>
                  </Stack>
                </Box>
                <CardContent sx={{ p: 0 }}>
                  {loadingBatch ? (
                    <Box sx={{ p: 10, textAlign: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead style={{ backgroundColor: 'var(--mui-palette-grey-50)' }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                              <Checkbox 
                                size="small" 
                                checked={batchDetails.length > 0 && selectedRows.length === batchDetails.length}
                                indeterminate={selectedRows.length > 0 && selectedRows.length < batchDetails.length}
                                onChange={handleSelectAll} 
                              />
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Vou. Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Vou. No</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Mobile No</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Party Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Metal Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Carat</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Net Wt.</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Total Amt</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>GST Taxable Amt</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Salesman</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Branch Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Loyalty Card No.</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Status</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)' }}>Log</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchDetails.map((row) => (
                            <tr key={row.id} style={{ backgroundColor: selectedRows.includes(row.id) ? 'var(--mui-palette-action-selected)' : 'transparent' }}>
                              <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                <Checkbox 
                                  size="small" 
                                  checked={selectedRows.includes(row.id)} 
                                  onChange={(e) => handleSelectRow(e, row.id)} 
                                />
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.vou_date ? new Date(row.vou_date).toLocaleDateString() : ''}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.vou_no}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.mobile_no}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.party_name}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.metal_name}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.carat}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.net_wt}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.total_amt}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.gst_taxable_amt}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.salesman_name}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.branch_name}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>{row.loyalty_card_no}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                <Box sx={{ 
                                  px: 2, py: 0.5, borderRadius: '4px', fontSize: '0.65rem', display: 'inline-block',
                                  bgcolor: row.status === 'Processed' ? 'success.light' : row.status === 'Failed' ? 'error.light' : 'warning.light',
                                  color: row.status === 'Processed' ? 'success.dark' : row.status === 'Failed' ? 'error.dark' : 'warning.dark'
                                }}>
                                  {row.status}
                                </Box>
                                {row.error_message && (
                                  <Typography variant='caption' color='error' sx={{ display: 'block', mt: 1, maxWidth: 200 }}>
                                    {row.error_message}
                                  </Typography>
                                )}
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--mui-palette-divider)' }}>
                                <Button size='small' variant='outlined' color='info' onClick={() => handleOpenLogs(row.id)}>
                                  Log
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ p: 20, textAlign: 'center', border: '2px dashed', borderColor: 'divider', borderRadius: '12px' }}>
                <Typography color='text.secondary'>Select a batch from the left to view details</Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {deleteTarget?.type === 'batch' ? 'batch' : deleteTarget?.type === 'bulk' ? 'selection of records' : 'record'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color='error' variant='contained' disabled={processing}>
            {processing ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Import Record</DialogTitle>
        <DialogContent>
          {editData && (
            <Grid container spacing={4} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Vou. Date" type="date" InputLabelProps={{ shrink: true }} value={editData.vou_date ? editData.vou_date.substring(0, 10) : ''} onChange={(e) => setEditData({...editData, vou_date: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Vou. No" value={editData.vou_no || ''} onChange={(e) => setEditData({...editData, vou_no: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Mobile No" value={editData.mobile_no || ''} onChange={(e) => setEditData({...editData, mobile_no: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Party Name" value={editData.party_name || ''} onChange={(e) => setEditData({...editData, party_name: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Metal Name" value={editData.metal_name || ''} onChange={(e) => setEditData({...editData, metal_name: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Carat" value={editData.carat || ''} onChange={(e) => setEditData({...editData, carat: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Net Wt." type="number" value={editData.net_wt || ''} onChange={(e) => setEditData({...editData, net_wt: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Total Amt" type="number" value={editData.total_amt || ''} onChange={(e) => setEditData({...editData, total_amt: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="GST Taxable Amt" type="number" value={editData.gst_taxable_amt || ''} onChange={(e) => setEditData({...editData, gst_taxable_amt: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Salesman" value={editData.salesman_name || ''} onChange={(e) => setEditData({...editData, salesman_name: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Branch Name" value={editData.branch_name || ''} onChange={(e) => setEditData({...editData, branch_name: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Loyalty Card No." value={editData.loyalty_card_no || ''} onChange={(e) => setEditData({...editData, loyalty_card_no: e.target.value})} /></Grid>
              <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Introducer" value={editData.introducer || ''} onChange={(e) => setEditData({...editData, introducer: e.target.value})} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} color='primary' variant='contained' disabled={processing}>
            {processing ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record History Log</DialogTitle>
        <DialogContent dividers>
          {loadingLogs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : recordLogs.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {recordLogs.map((log, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ 
                        px: 1.5, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 'bold',
                        bgcolor: log.action.includes('Delete') ? 'error.light' : log.action.includes('Update') ? 'info.light' : 'success.light',
                        color: log.action.includes('Delete') ? 'error.dark' : log.action.includes('Update') ? 'info.dark' : 'success.dark'
                      }}>
                        {log.action}
                      </Box>
                    </Box>
                    <Typography variant="body2">{log.description}</Typography>
                    
                    {log.metadata && log.action === 'Update Record' && log.metadata.new_data && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, fontSize: '0.75rem' }}>
                        <Typography variant="caption" fontWeight="bold">Updated Fields:</Typography>
                        <ul style={{ margin: 0, paddingLeft: '20px', marginTop: '4px' }}>
                          {Object.entries(log.metadata.new_data).map(([key, value]) => (
                            <li key={key}><strong>{key}</strong>: {String(value)}</li>
                          ))}
                        </ul>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ p: 4 }}>No history found for this record.</Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Preview Row Dialog */}
      <Dialog open={editPreviewDialogOpen} onClose={() => setEditPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Import Row {editingIndex !== null ? editingIndex + 1 : ''}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={4} sx={{ mt: 1 }}>
            {previewHeader.map((header, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <TextField
                  fullWidth
                  label={header}
                  value={editPreviewData[idx] || ''}
                  onChange={(e) => {
                    const newData = [...editPreviewData]
                    newData[idx] = e.target.value
                    setEditPreviewData(newData)
                  }}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPreviewDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePreviewEdit}>Save & Re-validate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SaleDataImportPage
