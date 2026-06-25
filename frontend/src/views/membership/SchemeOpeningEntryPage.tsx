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
import LinearProgress from '@mui/material/LinearProgress'
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
  const [pageSize, setPageSize] = useState(15)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [bulkEnrollProgress, setBulkEnrollProgress] = useState<{ current: number; total: number } | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  // Modal / Import screen trigger
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Excel Upload / Workspace states
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null)
  const [queueing, setQueueing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const [previewHeader, setPreviewHeader] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [validationResults, setValidationResults] = useState<any>(null)
  const [validating, setValidating] = useState(false)
  const [isValidated, setIsValidated] = useState(false)
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([])
  const [selectedRows, setSelectedRows] = useState<number[]>([])
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

  const handleBulkEnroll = async () => {
    if (selectedRows.length === 0 || !accessToken) return
    setError(null)
    setSuccess(null)

    const total = selectedRows.length
    setBulkEnrollProgress({ current: 0, total })

    let processedCount = 0
    let failedCount = 0

    // One AJAX request per row (not one bulk call) so the progress bar reflects
    // real completed/total counts instead of an indeterminate spinner.
    for (let i = 0; i < selectedRows.length; i++) {
      try {
        const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ record_ids: [selectedRows[i]] })
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Bulk processing failed')

        processedCount += result.processed ?? 0
        failedCount += result.failed ?? 0
      } catch (rowErr) {
        failedCount += 1
      } finally {
        setBulkEnrollProgress({ current: i + 1, total })
      }
    }

    setSuccess(`Bulk Enrollment completed. processed: ${processedCount}, failed: ${failedCount}`)
    setSelectedRows([])
    setBulkEnrollProgress(null)
    fetchOpenings()
  }

  const handleBulkEnrollBackground = async () => {
    if (selectedRows.length === 0 || !accessToken) return
    setError(null)
    setSuccess(null)
    setQueueing(true)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process-background`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ record_ids: selectedRows })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Queueing failed')

      setSuccess(`${result.message} You can navigate away — check the Status column for progress.`)
      setSelectedRows([])
      fetchOpenings()
    } catch (err: any) {
      setError(err.message || 'Queueing failed.')
    } finally {
      setQueueing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0 || !accessToken) return
    if (!window.confirm(`Are you sure you want to delete the ${selectedRows.length} selected staged records?`)) return
    setLoadingList(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/records/bulk-delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ ids: selectedRows })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Bulk delete failed')
      
      setSuccess('Selected staged records deleted successfully.')
      setSelectedRows([])
      fetchOpenings()
    } catch (err: any) {
      setError(err.message || 'Bulk delete failed.')
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
      url.searchParams.append('per_page', pageSize.toString())
      if (searchQuery) url.searchParams.append('search', searchQuery)
      if (statusFilter) url.searchParams.append('status', statusFilter)

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      const json = await response.json()
      setListData(json.data || [])
      setTotalRecords(json.total || 0)
      setSelectedRows([])
    } catch (err) {
      console.error('Failed to load scheme openings', err)
    } finally {
      setLoadingList(false)
    }
  }, [accessToken, currentPage, pageSize, searchQuery, statusFilter])

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
    if (previewRows.length === 0 || !accessToken) return
    setValidating(true)
    setError(null)
    setSuccess(null)

    try {
      // Send already-parsed rows in batches of 50 to avoid server timeout.
      // No file re-upload needed — data is already in previewRows.
      const CHUNK_SIZE = 50
      const allResults: any[] = []

      for (let i = 0; i < previewRows.length; i += CHUNK_SIZE) {
        const chunk = previewRows.slice(i, i + CHUNK_SIZE)
        const rows = chunk.map((row: string[], j: number) => ({ data: row, index: i + j + 1 }))

        const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/validate-rows`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ rows })
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Validation failed')
        allResults.push(...(result.rows || []))
      }

      const errorCount = allResults.filter((r: any) => !r.is_valid).length
      const validationResult = {
        success: true,
        is_all_valid: errorCount === 0,
        error_count: errorCount,
        total_rows: allResults.length,
        rows: allResults
      }

      setValidationResults(validationResult)
      setIsValidated(true)

      if (errorCount === 0) {
        setSuccess('Validation successful! All rows are verified and valid.')
      } else {
        setError(`Validation completed with errors in ${errorCount} row(s). Click the edit pencil (✏) on any row to correct details.`)
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
    while (padded.length < 10) padded.push('')
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

  const handleImport = async (mode: 'now' | 'background' = 'now') => {
    if (selectedPreviewRows.length === 0) {
      setError('Please select at least one row to import.')
      return
    }

    // Auto-skip invalid rows: only import selected rows that passed validation
    const validRowIndices = selectedPreviewRows.filter(idx => {
      if (!isValidated || !validationResults) return true // not validated yet — include all
      const r = validationResults.rows?.find((vr: any) => vr.index === idx + 1)
      return !r || r.is_valid
    })

    const skippedCount = selectedPreviewRows.length - validRowIndices.length

    if (validRowIndices.length === 0) {
      setError('All selected rows have validation errors. Please fix them before importing.')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const rowsToImport = validRowIndices.map(idx => ({
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
      if (skippedCount > 0) {
        setSuccess(`${skippedCount} invalid row${skippedCount > 1 ? 's were' : ' was'} skipped. Enrolling ${validRowIndices.length} valid row${validRowIndices.length > 1 ? 's' : ''}...`)
      }

      if (result.processed_rows > 0) {
        if (mode === 'background') {
          await handleProcessBackground(result.batch_id)
        } else {
          await handleProcess(result.batch_id)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setImporting(false)
    }
  }

  const handleProcess = async (batchId: string) => {
    setProcessing(true)
    setProcessProgress(null)

    try {
      // Check completion status for this batch first: if Post & Enroll was
      // interrupted earlier, rows already marked Processed/Failed must be
      // skipped rather than redone — only fetch & process what's still Pending.
      const [allResponse, pendingResponse] = await Promise.all([
        fetch(`${resolveBackendApiUrl()}/scheme-openings?import_batch_id=${batchId}&per_page=1000`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${resolveBackendApiUrl()}/scheme-openings?import_batch_id=${batchId}&status=Pending&per_page=1000`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        })
      ])

      const allResult = await allResponse.json()
      const listResult = await pendingResponse.json()
      if (!allResponse.ok) throw new Error(allResult.message || 'Failed to load staged records.')
      if (!pendingResponse.ok) throw new Error(listResult.message || 'Failed to load staged records.')

      const batchTotal = allResult.total ?? (allResult.data || []).length
      const recordIds: number[] = (listResult.data || []).map((row: any) => row.id)
      const total = recordIds.length
      const alreadyDone = batchTotal - total

      if (alreadyDone > 0) {
        setSuccess(`Resuming batch: ${alreadyDone} of ${batchTotal} row${batchTotal > 1 ? 's' : ''} already complete. Continuing with the remaining ${total}...`)
      }

      if (total === 0) {
        setSuccess(`This batch is already fully processed (${batchTotal} of ${batchTotal} rows complete). Nothing left to do.`)
        setImportDialogOpen(false)
        setFile(null)
        setPreviewRows([])
        setValidationResults(null)
        fetchOpenings()
        return
      }

      setProcessProgress({ current: 0, total })

      let processedCount = 0
      let failedCount = 0

      for (let i = 0; i < recordIds.length; i++) {
        try {
          const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({ record_ids: [recordIds[i]] })
          })

          const result = await response.json()
          if (!response.ok) throw new Error(result.message || 'Processing failed')

          processedCount += result.processed ?? 0
          failedCount += result.failed ?? 0
        } catch (rowErr) {
          failedCount += 1
        } finally {
          setProcessProgress({ current: i + 1, total })
        }
      }

      setSuccess(`Staging & processing completed. Processed: ${processedCount}, Failed: ${failedCount}.`)

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
      setProcessProgress(null)
    }
  }

  const handleProcessBackground = async (batchId: string) => {
    setQueueing(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/scheme-openings/process-background`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ batch_id: batchId })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Queueing failed')

      setSuccess(`${result.message} You can navigate away — check this list's Status column for progress, or filter by Pending/Processed/Failed.`)

      // Close the workspace & reload parent list — rows will flip status as the queue worker processes them
      setImportDialogOpen(false)
      setFile(null)
      setPreviewRows([])
      setValidationResults(null)
      fetchOpenings()
    } catch (err: any) {
      setError(`Staging Error: ${err.message}`)
    } finally {
      setQueueing(false)
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
    // Final 10-column format:
    // 0:Account Name, 1:City, 2:MobileNo, 3:Salesman, 4:SchemeType,
    // 5:Total Amount, 6:Installment Amount, 7:Number of Months, 8:Branch ID, 9:Scheme ID
    const headers = [
      'Account Name', 'City', 'MobileNo', 'Salesman', 'SchemeType',
      'Total Amount', 'Installment Amount', 'Number of Months', 'Branch ID', 'Scheme ID'
    ]
    // Sample rows — Branch ID and Scheme ID accept name, code, or numeric ID
    const sampleRows = [
      ['Ramesh Kumar',  'BBSR',    '9861000001', 'Niranjan', 'Amount', '25000', '5000', '5',  'City Jewellers', 'Swarna Laxmi Yojana-Amount'],
      ['Sunita Devi',   'BBSR',    '9861000002', 'Khitish',  'Amount', '9000',  '3000', '3',  'City Jewellers', 'Swarna Laxmi Yojana-Amount'],
      ['Bijay Mohanty', 'BBSR',    '9861000003', 'Niranjan', 'Weight', '0',     '2',    '4',  'City Jewellers', 'SWARNA LAXMI'],
      ['Pratima Sahoo', 'Cuttack', '9861000004', 'Niranjan', 'Amount', '60000', '6000', '10', 'City Jewellers', 'Swarna Laxmi Yojana-Amount'],
      ['Manoj Nayak',   'BBSR',    '9861000005', 'Khitish',  'Weight', '0',     '1.5',  '6',  'City Jewellers', 'SWARNA LAXMI'],
    ]

    const csvLines = [
      headers.join(','),
      ...sampleRows.map(row => row.map(v => `"${v}"`).join(','))
    ]
    const csvContent = '\uFEFF' + csvLines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'scheme_opening_template.csv'
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
          <Button
            size='medium'
            variant='outlined'
            color='success'
            startIcon={<i className='ri-download-2-line' />}
            onClick={downloadSample}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Download Sample CSV
          </Button>

          {selectedRows.length > 0 && (
            <>
              <Button
                size='medium'
                variant='contained'
                color='success'
                startIcon={bulkEnrollProgress ? <CircularProgress size={16} color="inherit" /> : <i className='ri-play-fill' />}
                onClick={handleBulkEnroll}
                disabled={Boolean(bulkEnrollProgress) || queueing}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                {bulkEnrollProgress
                  ? `Enrolling ${bulkEnrollProgress.current}/${bulkEnrollProgress.total} (${Math.round((bulkEnrollProgress.current / bulkEnrollProgress.total) * 100)}%)`
                  : `Bulk Enroll Now (${selectedRows.length})`}
              </Button>
              <Tooltip title="Queues the selected rows for a background worker to process — requires php artisan queue:work to be running." arrow>
                <span>
                  <Button
                    size='medium'
                    variant='outlined'
                    color='success'
                    startIcon={queueing ? <CircularProgress size={16} color="inherit" /> : <i className='ri-time-line' />}
                    onClick={handleBulkEnrollBackground}
                    disabled={Boolean(bulkEnrollProgress) || queueing}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    {queueing ? 'Queueing...' : `Enroll in Background (${selectedRows.length})`}
                  </Button>
                </span>
              </Tooltip>
              <Button
                size='medium'
                variant='contained'
                color='error'
                startIcon={<i className='ri-delete-bin-line' />}
                onClick={handleBulkDelete}
                disabled={Boolean(bulkEnrollProgress) || queueing}
                sx={{ fontWeight: 600, textTransform: 'none' }}
              >
                Bulk Delete ({selectedRows.length})
              </Button>
            </>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Status Filter */}
          <FormControl size='small' sx={{ minWidth: 160 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              label="Status Filter"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              sx={{ height: 38, fontSize: '0.875rem', bgcolor: 'background.paper' }}
            >
              <MenuItem value=''>All Status</MenuItem>
              <MenuItem value='Pending'>Pending</MenuItem>
              <MenuItem value='Processed'>Processed</MenuItem>
              <MenuItem value='Failed'>Failed</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size='small'
            placeholder='Search openings...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ width: 250, '& .MuiInputBase-root': { height: 38, fontSize: '0.875rem', bgcolor: 'background.paper' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='ri-search-line' />
                </InputAdornment>
              )
            }}
          />
        </Stack>
        {bulkEnrollProgress && (
          <Box sx={{ px: 2, pb: 2 }}>
            <LinearProgress
              variant='determinate'
              color='success'
              value={(bulkEnrollProgress.current / bulkEnrollProgress.total) * 100}
            />
            <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
              {`Enrolling ${bulkEnrollProgress.current} of ${bulkEnrollProgress.total} rows (${Math.round((bulkEnrollProgress.current / bulkEnrollProgress.total) * 100)}%)`}
            </Typography>
          </Box>
        )}
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
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', width: 50 }}>
                  <Checkbox 
                    size="small"
                    indeterminate={selectedRows.length > 0 && selectedRows.length < listData.length}
                    checked={listData.length > 0 && selectedRows.length === listData.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(listData.map((row: any) => row.id))
                      } else {
                        setSelectedRows([])
                      }
                    }}
                  />
                </th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>SI. No</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Account Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Mobile No</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Scheme Type</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Scheme Name</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Inst. Amt</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>Months</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Salesman</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={13} style={{ padding: '40px', textAlign: 'center' }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Loading openings list...</Typography>
                  </td>
                </tr>
              ) : listData.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    No scheme openings entries found. Click the <strong>Import</strong> button to load spreadsheet data.
                  </td>
                </tr>
              ) : (
                listData.map((row: any, index: number) => {
                  const isSelected = selectedRows.includes(row.id)
                  return (
                    <tr 
                      key={row.id} 
                      style={{ 
                        borderBottom: '1px solid var(--mui-palette-divider)',
                        backgroundColor: isSelected ? 'rgba(var(--mui-palette-primary-mainChannel), 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '0 18px', fontSize: '0.85rem' }}>
                        <Checkbox 
                          size="small" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows([...selectedRows, row.id])
                            } else {
                              setSelectedRows(selectedRows.filter(id => id !== row.id))
                            }
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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
                      <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>{row.salesman_user?.name || row.salesman || '-'}</td>
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
                  )
                })
              )}
            </tbody>
          </table>
        </Box>
        
        {/* Pagination Bar */}
        {totalRecords > 0 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 4, flexWrap: 'wrap', gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Rows per page
              </Typography>
              <FormControl size="small">
                <Select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  sx={{ height: 36, fontSize: '0.875rem', bgcolor: 'background.paper' }}
                >
                  {[10, 15, 25, 50, 100].map(size => (
                    <MenuItem key={size} value={size}>{size}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                {`Showing ${Math.min((currentPage - 1) * pageSize + 1, totalRecords)}-${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords}`}
              </Typography>
            </Stack>

            {totalRecords > pageSize && (
              <Pagination
                count={Math.ceil(totalRecords / pageSize)}
                page={currentPage}
                onChange={(_, value) => setCurrentPage(value)}
                color="primary"
                size="small"
              />
            )}
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
              accept='.csv'
              onChange={handleFileChange}
              disabled={importing || processing}
            />
            <i className='ri-file-excel-line' style={{ fontSize: '48px', color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='h6' sx={{ mt: 3 }}>
              {file ? file.name : 'Click or Drag & Drop CSV file here'}
            </Typography>
            <Typography variant='caption' color='text.secondary' display="block" sx={{ mt: 1 }}>
              Required format (10 columns): Account Name, City, MobileNo, Salesman, SchemeType (Amount or Weight), Total Amount, Installment Amount, Number of Months, Branch, Scheme
            </Typography>
          </Dropzone>

          {/* Staging / Verify table */}
          {file && previewRows.length > 0 && (
            <Box sx={{ mt: 6 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                  Parsed Records Staging ({previewRows.length} rows)
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  {/* Inline skip notice when validation has found errors in selected rows */}
                  {isValidated && (() => {
                    const invalidSelected = selectedPreviewRows.filter(idx => {
                      const r = validationResults?.rows?.find((vr: any) => vr.index === idx + 1)
                      return r && !r.is_valid
                    }).length
                    return invalidSelected > 0 ? (
                      <Typography variant='caption' color='warning.main' sx={{ alignSelf: 'center', fontWeight: 600 }}>
                        ⚠ {invalidSelected} invalid row{invalidSelected > 1 ? 's' : ''} will be auto-skipped
                      </Typography>
                    ) : null
                  })()}
                  <Button 
                    variant="contained" 
                    color="info" 
                    onClick={handleValidate}
                    disabled={validating || processing}
                    startIcon={validating && <CircularProgress size={16} color="inherit" />}
                  >
                    {validating ? 'Validating...' : 'Verify & Validate Cells'}
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleImport('now')}
                    disabled={importing || processing || queueing || selectedPreviewRows.length === 0}
                    startIcon={(importing || processing) && <CircularProgress size={16} color="inherit" />}
                  >
                    {processing
                      ? (processProgress
                          ? `Processing ${processProgress.current}/${processProgress.total} (${Math.round((processProgress.current / processProgress.total) * 100)}%)`
                          : 'Processing & Enrolling...')
                      : importing ? 'Posting Records...' : (() => {
                      const validCount = selectedPreviewRows.filter(idx => {
                        if (!isValidated || !validationResults) return true
                        const r = validationResults.rows?.find((vr: any) => vr.index === idx + 1)
                        return !r || r.is_valid
                      }).length
                      return `Post & Enroll Now (${validCount} rows)`
                    })()}
                  </Button>
                  <Tooltip title="Queues rows for a background worker to process — you can navigate away immediately. Requires a queue worker (php artisan queue:work) to be running." arrow>
                    <span>
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => handleImport('background')}
                        disabled={importing || processing || queueing || selectedPreviewRows.length === 0}
                        startIcon={queueing && <CircularProgress size={16} color="inherit" />}
                      >
                        {queueing ? 'Queueing...' : 'Process in Background'}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>

              {(importing || processing) && (
                <Box sx={{ mt: 3, mb: 3 }}>
                  {processing && processProgress ? (
                    <LinearProgress
                      variant='determinate'
                      color='success'
                      value={(processProgress.current / processProgress.total) * 100}
                    />
                  ) : (
                    <LinearProgress color={processing ? 'success' : 'info'} />
                  )}
                  <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1.5 }}>
                    {processing
                      ? (processProgress
                          ? `Enrolling row ${processProgress.current} of ${processProgress.total} — please keep this window open.`
                          : 'Preparing to enroll staged rows...')
                      : 'Posting staged records...'}
                  </Typography>
                </Box>
              )}

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
                           {Array.from({ length: 10 }).map((_, cellIndex) => {
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
              { label: 'Account Name *', index: 0 },
              { label: 'City', index: 1 },
              { label: 'Mobile No * (10 digits)', index: 2 },
              { label: 'Salesman (optional)', index: 3 },
              { label: 'Scheme Type * (Amount or Weight)', index: 4 },
              { label: 'Total Amount *', index: 5 },
              { label: 'Installment Amount *', index: 6 },
              { label: 'Number of Months * (whole number)', index: 7 },
              { label: 'Branch (Name, Code, or ID)', index: 8 },
              { label: 'Scheme * (Name, Code, or ID)', index: 9 }
            ].map((col) => (
              <Grid size={{ xs: 12, sm: 4 }} key={col.index}>
                <TextField
                  fullWidth
                  size="small"
                  label={col.label}
                  value={editPreviewData[col.index] || ''}
                  inputProps={col.index === 7 ? { inputMode: 'numeric', pattern: '[0-9]*' } : {}}
                  onChange={(e) => {
                    const updated = [...editPreviewData]
                    // Number of Months: strip non-digits
                    updated[col.index] = col.index === 7
                      ? e.target.value.replace(/[^0-9]/g, '')
                      : e.target.value
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
                  freeSolo
                  options={customers}
                  getOptionLabel={(option: any) => typeof option === 'string' ? option : (option.name ? `${option.name} (${option.mobile})` : option.mobile || '')}
                  value={selectedRow.account_name || ''}
                  onChange={(event, newValue: any) => {
                    const isOption = newValue && typeof newValue === 'object'
                    setSelectedRow({
                      ...selectedRow,
                      account_name: isOption ? newValue.name : (newValue || ''),
                      mobile_no: isOption ? newValue.mobile : selectedRow.mobile_no
                    })
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input') {
                      setSelectedRow((prev: any) => ({ ...prev, account_name: newInputValue }))
                    }
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
                <Autocomplete
                  size="small"
                  freeSolo
                  options={salesmen}
                  getOptionLabel={(option: any) => typeof option === 'string' ? option : (option.name || '')}
                  value={selectedRow.salesman || ''}
                  onChange={(event, newValue: any) => {
                    const isOption = newValue && typeof newValue === 'object'
                    setSelectedRow({ ...selectedRow, salesman: isOption ? newValue.name : (newValue || '') })
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input') {
                      setSelectedRow((prev: any) => ({ ...prev, salesman: newInputValue }))
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Salesman" />
                  )}
                />
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

