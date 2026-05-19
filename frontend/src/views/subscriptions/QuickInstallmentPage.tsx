'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { CustomerAddForm } from '../customers/CustomerAddForm'

import { usePageLoading } from '@/contexts/pageLoadingContext'
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
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type InstallmentItem = {
  id: number
  installment_no: number
  due_date: string
  paid: boolean
  paid_date?: string | null
  amount?: string | number
  penalty?: string | number
}

type SchemeOption = {
  id: number
  name: string
  code: string
  installment_value?: string | number | null
  total_installments?: number | null
  installment_code?: string | null
  is_closed?: boolean
  no_of_installment_type?: string | null
}

type MembershipLookup = {
  id: number
  membership_no?: string | null
  card_no?: string | null
  card_reference?: string | null
  start_date?: string
  maturity_date?: string
  total_paid?: string | number
  status?: string
  customer?: { id: number; name?: string | null; mobile: string; email?: string | null } | null
  scheme?: SchemeOption | null
  installments?: InstallmentItem[]
  passbook_no?: string | null
  ticket_no?: string | null
}

type CustomerMembershipSummary = {
  id: number
  status: string
}

type CustomerLookup = {
  id?: number
  name?: string | null
  mobile: string
  email?: string | null
  memberships?: CustomerMembershipSummary[]
  kyc?: {
    family_head?: string | null
    contact_name_1?: string | null
    contact_name_2?: string | null
    mobile_no_1?: string | null
    mobile_no_2?: string | null
    std_code?: string | null
    phone_no_1?: string | null
    phone_no_2?: string | null
    phone_no_3?: string | null
    phone_no_4?: string | null
    phone_no_5?: string | null
    fax_no_1?: string | null
    fax_no_2?: string | null
    email_1?: string | null
    email_2?: string | null
    reference_1?: string | null
    reference_2?: string | null
    block_no?: string | null
    building_name?: string | null
    area?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    country?: string | null
    nominee_name?: string | null
    nominee_relation?: string | null
    nominee_mobile_1?: string | null
    nominee_mobile_2?: string | null
    nominee_block_no?: string | null
    nominee_building_name?: string | null
    nominee_street?: string | null
    nominee_area?: string | null
    nominee_city?: string | null
    nominee_zip_code?: string | null
    nominee_state?: string | null
    nominee_country?: string | null
    birth_date?: string | null
    anniversary?: string | null
    spouse_name?: string | null
    child_name_1?: string | null
    child_1_birth_date?: string | null
    child_name_2?: string | null
    child_2_birth_date?: string | null
    aadhaar_number?: string | null
    pan_number?: string | null
    photo?: string | null
    pan_file?: string | null
    aadhaar_file?: string | null
    driving_licence?: string | null
    election_card?: string | null
    passport_no?: string | null
    it_pan_no?: string | null
    address?: string | null
    remarks?: string | null
  } | null
}

type CustomerListItem = {
  id: number
  name?: string | null
  mobile: string
  email?: string | null
  status?: string
  kyc?: {
    city?: string | null
    state?: string | null
  } | null
}

type CustomerSearchResponse = {
  data: CustomerListItem[]
}

type CustomerDetailResponse = {
  data: CustomerLookup
}

type MembershipDetailResponse = {
  data: MembershipLookup
}

type MembershipsResponse = {
  data: MembershipLookup[]
}

type SchemesResponse = {
  data: SchemeOption[]
}

type SalesmanOption = {
  id: number
  name: string
}

type UsersResponse = {
  data: SalesmanOption[]
}

type BulkPaymentResponse = {
  data: Array<{ id: number }>
  message?: string
}

type EnrollmentResponse = {
  data: {
    customer?: { id?: number; mobile?: string; name?: string | null }
    membership?: { id?: number; membership_no?: string | null; card_no?: string | null }
    payment?: { id?: number }
  }
}

type CustomerResponse = {
  data: CustomerLookup
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const formatDate = (value?: string | null) => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('en-IN')
}

const addMonthsToDate = (value: string, months: number) => {
  if (!value || months <= 0) return value

  const next = new Date(value)
  const originalDay = next.getDate()

  next.setMonth(next.getMonth() + months)

  if (next.getDate() !== originalDay) {
    next.setDate(0)
  }

  return next.toISOString().slice(0, 10)
}

const cardSx = {
  borderRadius: 0,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)'
} as const

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 0
  }
} as const

const summaryPair = (label: string, value: string | number) => ({ label, value })

const QuickInstallmentPage = () => {
  const customerFormRef = useRef<import('../customers/CustomerAddForm').CustomerAddFormHandle>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMembershipId = searchParams.get('membership_id')
  const initialInstallmentId = searchParams.get('installment_id')
  const searchAbortRef = useRef<AbortController | null>(null)
  const customerDropdownRef = useRef<HTMLDivElement | null>(null)

  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [accountSearch, setAccountSearch] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [gateway, setGateway] = useState<'cash' | 'upi' | 'card' | 'cheque'>('cash')
  const [transactionId, setTransactionId] = useState('')
  const [remark, setRemark] = useState('')
  const [salesman, setSalesman] = useState('None')
  const [todayRate] = useState('0.00')
  const [weight, setWeight] = useState('0.000')
  const [isBonus, setIsBonus] = useState(false)
  const [editableInstallmentValue, setEditableInstallmentValue] = useState('')
  const [passbookNumber, setPassbookNumber] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')

  const [schemes, setSchemes] = useState<SchemeOption[]>([])
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([])
  const [allMemberships, setAllMemberships] = useState<MembershipLookup[]>([])
  const [lookupCustomer, setLookupCustomer] = useState<CustomerLookup | null>(null)
  const [customerMemberships, setCustomerMemberships] = useState<MembershipLookup[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [selectedSchemeId, setSelectedSchemeId] = useState('')
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const [ticketSearchOpen, setTicketSearchOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [ticketSearchText, setTicketSearchText] = useState('')
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerLookup[]>([])
  const [customerInlineSearch, setCustomerInlineSearch] = useState('')
  const [customerInlineResults, setCustomerInlineResults] = useState<CustomerLookup[]>([])
  const [customerInlineOpen, setCustomerInlineOpen] = useState(false)
  const [customerInlineSearching, setCustomerInlineSearching] = useState(false)
  const [customerModalSearching, setCustomerModalSearching] = useState(false)
  const [customerFormModalOpen, setCustomerFormModalOpen] = useState(false)

  useEffect(() => {
    if (!customerInlineOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setCustomerInlineOpen(false)

        if (!lookupCustomer) {
          setCustomerInlineSearch('')
          setCustomerInlineResults([])
        } else {
          setCustomerInlineSearch(customerName || customerMobile)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [customerInlineOpen, customerMobile, customerName, lookupCustomer])

  const [lastSavedPaymentId, setLastSavedPaymentId] = useState<number | null>(null)
  const [, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { startLoading, stopLoading } = usePageLoading()

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
        },
        cache: 'no-store',
        signal: init?.signal
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) throw new Error(payload?.message || 'Request failed')

      return payload as T
    },
    [accessToken]
  )

  const loadMembership = useCallback(
    async (membershipId: number | string) => {
      const response = await request<MembershipDetailResponse>(`/memberships/${membershipId}`)

      return response.data
    },
    [request]
  )

  const applyMembershipSelection = useCallback(
    async (membership: MembershipLookup, preferredInstallmentId?: string | null) => {
      if (!membership.customer?.id) return

      const customerResponse = await request<CustomerDetailResponse>(`/customers/${membership.customer.id}`)
      const customer = customerResponse.data
      const activeMembershipSummaries = (customer.memberships || []).filter(item => item.status === 'active')
      const memberships = await Promise.all(activeMembershipSummaries.map(item => loadMembership(item.id)))
      const sortedMemberships = memberships.sort((a, b) => a.id - b.id)
      const selected = sortedMemberships.find(item => item.id === membership.id) || membership

      setLookupCustomer(customer)
      setCustomerName(customer.name || '')
      setCustomerMobile(customer.mobile || '')
      setCustomerEmail(customer.email || '')
      setCustomerMemberships(sortedMemberships)
      setSelectedMembershipId(String(selected.id))
      setSelectedSchemeId(String(selected.scheme?.id || ''))
      setAccountSearch(customer.mobile || '')

      const pending = (selected.installments || []).filter(item => !item.paid).sort((a, b) => a.installment_no - b.installment_no)
      const preferredId = preferredInstallmentId ? Number(preferredInstallmentId) : null
      setSelectedInstallmentIds(
        preferredId && pending.some(item => item.id === preferredId) ? [preferredId] : pending[0] ? [pending[0].id] : []
      )
    },
    [loadMembership, request]
  )

  useEffect(() => {
    if (!accessToken) return

    const bootstrap = async () => {
      try {
        const [schemeResponse, userResponse] = await Promise.all([
          request<SchemesResponse>('/schemes?per_page=300&sort_by=created_at&sort_direction=desc'),
          request<UsersResponse>('/users?per_page=100&sort_by=name&sort_direction=asc&status=active')
        ])

        setSchemes(schemeResponse.data.filter(item => !item.is_closed))
        setSalesmen(userResponse.data)
      } catch {
        // Keep operator desk usable even if prefetch fails.
      }
    }

    void bootstrap()
  }, [accessToken, request])

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken || !initialMembershipId) return

    const bootstrap = async () => {
      setLoading(true)
      startLoading()
      setError(null)

      try {
        const membership = await loadMembership(initialMembershipId)
        await applyMembershipSelection(membership, initialInstallmentId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription.')
      } finally {
        setLoading(false)
        stopLoading()
      }
    }

    void bootstrap()
  }, [accessToken, applyMembershipSelection, initialInstallmentId, initialMembershipId, loadMembership, startLoading, status, stopLoading])

  const activeMembership = useMemo(
    () => customerMemberships.find(item => String(item.id) === selectedMembershipId) || null,
    [customerMemberships, selectedMembershipId]
  )

  const selectedScheme = useMemo(() => {
    if (activeMembership?.scheme) return activeMembership.scheme

    return schemes.find(item => item.id === Number(selectedSchemeId)) || null
  }, [activeMembership?.scheme, schemes, selectedSchemeId])

  const isFirstMembershipMode = !activeMembership && Boolean(customerMobile.trim() || accountSearch.trim() || lookupCustomer)
  const isVariableScheme = (selectedScheme?.no_of_installment_type || '').toLowerCase() === 'variable'

  useEffect(() => {
    if (selectedScheme) {
      setEditableInstallmentValue(Number(selectedScheme.installment_value || 0).toFixed(2))
    }
  }, [selectedScheme])

  const pendingInstallments = useMemo(() => {
    if (!activeMembership?.installments) return []

    return [...activeMembership.installments].filter(item => !item.paid).sort((a, b) => a.installment_no - b.installment_no)
  }, [activeMembership])

  const tableRows = useMemo(() => {
    if (activeMembership) return pendingInstallments

    if (!isFirstMembershipMode || !selectedScheme) return []

    return [
      {
        id: -1,
        installment_no: 1,
        due_date: paymentDate,
        paid: false,
        amount: Number(editableInstallmentValue || selectedScheme.installment_value || 0),
        penalty: 0
      }
    ]
  }, [activeMembership, editableInstallmentValue, isFirstMembershipMode, paymentDate, pendingInstallments, selectedScheme])

  const selectedRows = useMemo(() => tableRows.filter(item => selectedInstallmentIds.includes(item.id)), [selectedInstallmentIds, tableRows])

  const totals = useMemo(() => {
    const amount = selectedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const lateFee = selectedRows.reduce((sum, item) => sum + Number(item.penalty || 0), 0)

    return {
      amount,
      lateFee,
      total: amount + lateFee
    }
  }, [selectedRows])

  const paidInstallments = activeMembership?.installments?.filter(item => item.paid).length || 0
  const totalInstallments = activeMembership?.installments?.length || Number(selectedScheme?.total_installments || 0)
  const firstPendingInstallment = pendingInstallments[0] || null
  const maturityDate = activeMembership?.maturity_date || (selectedScheme?.total_installments ? addMonthsToDate(paymentDate, Math.max(Number(selectedScheme.total_installments) - 1, 0)) : '')
  const installmentCode = selectedScheme?.installment_code || selectedScheme?.code || ''
  const lotNo = activeMembership?.id || 0

  const ticketSearchResults = useMemo(() => {
    const query = ticketSearchText.trim().toLowerCase()

    return allMemberships.filter(item => {
      if (!query) return true

      return (
        (item.card_no || '').toLowerCase().includes(query) ||
        (item.membership_no || '').toLowerCase().includes(query) ||
        (item.passbook_no || '').toLowerCase().includes(query) ||
        (item.ticket_no || '').toLowerCase().includes(query) ||
        (item.customer?.name || '').toLowerCase().includes(query) ||
        (item.customer?.mobile || '').toLowerCase().includes(query) ||
        (item.scheme?.name || '').toLowerCase().includes(query) ||
        (item.scheme?.code || '').toLowerCase().includes(query)
      )
    })
  }, [allMemberships, ticketSearchText])

  const handleCustomerLookup = async (query: string) => {
    if (!query.trim()) {
      setError('Enter customer mobile to search.')

      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setLastSavedPaymentId(null)

    try {
      const customerSearch = await request<CustomerSearchResponse>(`/customers?search=${encodeURIComponent(query.trim())}`)

      if (!customerSearch.data.length) {
        setLookupCustomer({ mobile: query.trim(), name: '', email: '' })
        setCustomerName('')
        setCustomerMobile(query.trim())
        setCustomerEmail('')
        setCustomerMemberships([])
        setSelectedMembershipId('')
        setSelectedSchemeId('')
        setSelectedInstallmentIds([])
        setAccountSearch(query.trim())
        setSuccess('New customer ready. Choose scheme and save first subscription.')

        return
      }

      const customerDetail = await request<CustomerDetailResponse>(`/customers/${customerSearch.data[0].id}`)
      const customer = customerDetail.data

      setLookupCustomer(customer)
      setCustomerName(customer.name || '')
      setCustomerMobile(customer.mobile || '')
      setCustomerEmail(customer.email || '')
      setAccountSearch(customer.mobile || '')

      const activeMembershipSummaries = (customer.memberships || []).filter(item => item.status === 'active')

      if (!activeMembershipSummaries.length) {
        setCustomerMemberships([])
        setSelectedMembershipId('')
        setSelectedSchemeId('')
        setSelectedInstallmentIds([])
        setSuccess('Customer found. No active subscription yet, continue with first subscription entry.')

        return
      }

      const memberships = await Promise.all(activeMembershipSummaries.map(item => loadMembership(item.id)))
      const selected = memberships.sort((a, b) => a.id - b.id)[0]
      await applyMembershipSelection(selected)
      setSuccess('Customer loaded successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer search failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSearchModal = async () => {
    if (!customerSearchText.trim()) {
      setCustomerSearchResults([])

      return
    }

    setCustomerModalSearching(true)

    try {
      const response = await request<CustomerSearchResponse>(`/customers?search=${encodeURIComponent(customerSearchText.trim())}`)

      const results: CustomerLookup[] = response.data.slice(0, 20).map(item => ({
        id: item.id,
        name: item.name,
        mobile: item.mobile,
        email: item.email,
        kyc: item.kyc || null
      }))

      setCustomerSearchResults(results)
    } catch {
      setCustomerSearchResults([])
    } finally {
      setCustomerModalSearching(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return

    const query = customerInlineSearch.trim()

    if (query.length < 2) {
      setCustomerInlineResults([])
      setCustomerInlineSearching(false)

      return
    }

    setCustomerInlineSearching(false)

    searchAbortRef.current?.abort()
    const controller = new AbortController()

    searchAbortRef.current = controller

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (controller.signal.aborted) return

        setCustomerInlineSearching(true)

        try {
          const response = await request<CustomerSearchResponse>(`/customers?per_page=10&search=${encodeURIComponent(query)}&status=active`, {
            signal: controller.signal
          })

          if (controller.signal.aborted) return

          const results: CustomerLookup[] = response.data.map(item => ({
            id: item.id,
            name: item.name,
            mobile: item.mobile,
            email: item.email,
            kyc: item.kyc || null
          }))

          setCustomerInlineResults(results)
        } catch {
          if (!controller.signal.aborted) setCustomerInlineResults([])
        } finally {
          if (!controller.signal.aborted) setCustomerInlineSearching(false)
        }
      })()
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [accessToken, customerInlineSearch, request])

  const handleSelectCustomer = async (customer: CustomerLookup) => {
    setCustomerModalOpen(false)
    setCustomerInlineOpen(false)
    setCustomerInlineSearch(customer.name || customer.mobile || '')
    setLoading(true)

    try {
      const full = await request<CustomerDetailResponse>(`/customers/${customer.id}`)
      const data = full.data

      setLookupCustomer(data)
      setCustomerName(data.name || '')
      setCustomerMobile(data.mobile || '')
      setCustomerEmail(data.email || '')
      setCustomerInlineSearch(data.name || data.mobile || '')
      setAccountSearch(data.mobile || '')

      const activeMembershipSummaries = (data.memberships || []).filter(item => item.status === 'active')

      if (activeMembershipSummaries.length) {
        const memberships = await Promise.all(activeMembershipSummaries.map(item => loadMembership(item.id)))
        const selected = memberships.sort((a, b) => a.id - b.id)[0]
        await applyMembershipSelection(selected)
      } else {
        setCustomerMemberships([])
        setSelectedMembershipId('')
        setSelectedSchemeId('')
        setSelectedInstallmentIds([])
      }
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMembership = async (membershipId: number) => {
    setTicketSearchOpen(false)
    setTicketSearchText('')
    setLoading(true)

    try {
      const membership = await loadMembership(membershipId)
      await applyMembershipSelection(membership)
      setSuccess('Subscription loaded successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription.')
    } finally {
      setLoading(false)
    }
  }

  const handleMembershipChange = async (membershipId: string) => {
    setSelectedMembershipId(membershipId)
    setLastSavedPaymentId(null)
    setSuccess(null)
    setError(null)

    const membership = customerMemberships.find(item => String(item.id) === membershipId)

    if (!membership) return

    setSelectedSchemeId(String(membership.scheme?.id || ''))

    const pending = (membership.installments || []).filter(item => !item.paid).sort((a, b) => a.installment_no - b.installment_no)
    setSelectedInstallmentIds(pending[0] ? [pending[0].id] : [])
  }

  const handleSchemeChange = (schemeId: string) => {
    setSelectedSchemeId(schemeId)
    setSelectedInstallmentIds(schemeId ? [-1] : [])
  }

  const handleToggleRow = (rowId: number) => {
    setSelectedInstallmentIds(current =>
      current.includes(rowId) ? current.filter(id => id !== rowId) : [...current, rowId].sort((a, b) => a - b)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!activeMembership) {
        if (!selectedScheme) throw new Error('Select scheme for first subscription.')
        if (!customerMobile.trim()) throw new Error('Choose customer or enter new customer mobile.')
        if (!selectedInstallmentIds.includes(-1)) throw new Error('Select first installment row.')

        const response = await request<EnrollmentResponse>('/memberships/enroll', {
          method: 'POST',
          body: JSON.stringify({
            customer: {
              name: customerName.trim() || null,
              mobile: customerMobile.trim(),
              email: customerEmail.trim() || null,
              status: 'active'
            },
            scheme_id: selectedScheme.id,
            start_date: paymentDate,
            payment: {
              amount: Number(selectedScheme.installment_value || 0),
              gateway,
              transaction_id: gateway !== 'cash' ? transactionId : null,
              payment_date: paymentDate,
              status: 'success'
            }
          })
        })

        const customerId = response.data.customer?.id
        const membershipId = response.data.membership?.id

        if (customerId && membershipId) {
          const membership = await loadMembership(membershipId)
          await applyMembershipSelection(membership)
        }

        setLastSavedPaymentId(response.data.payment?.id || null)
        setSuccess('First subscription saved successfully.')
      } else {
        if (!selectedInstallmentIds.length) throw new Error('Select installment rows.')

        const response = await request<BulkPaymentResponse>('/payments/bulk', {
          method: 'POST',
          body: JSON.stringify({
            membership_id: activeMembership.id,
            installment_ids: selectedInstallmentIds,
            gateway,
            transaction_id: gateway !== 'cash' ? transactionId : null,
            payment_date: paymentDate,
            status: 'success'
          })
        })

        const refreshedMembership = await loadMembership(activeMembership.id)
        await applyMembershipSelection(refreshedMembership)
        setLastSavedPaymentId(response.data?.[response.data.length - 1]?.id || null)
        setSuccess(response.message || 'Installment saved successfully.')
      }

      setTransactionId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    if (!lastSavedPaymentId) return

    router.push(`/payments/receipt/${lastSavedPaymentId}?autoprint=1`)
  }

  const rightTopSummary = [
    summaryPair('Rec No', activeMembership?.membership_no || (lastSavedPaymentId ? `REC-${lastSavedPaymentId}` : '-')),
    summaryPair('Rec Date', formatDate(paymentDate)),
    summaryPair('Joining Date', formatDate(activeMembership?.start_date || paymentDate)),
    summaryPair('Last Installment Date', formatDate(activeMembership ? firstPendingInstallment?.due_date : paymentDate)),
    summaryPair('Maturity Date', formatDate(maturityDate))
  ]

  const rightBottomSummary = [
    summaryPair('Installment Code', installmentCode),
    summaryPair('Lot No', lotNo),
    summaryPair('Installment', selectedRows.length),
    summaryPair('Paid Installment', paidInstallments),
    summaryPair('Total Installment', totalInstallments)
  ]

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              ...cardSx,
              overflow: 'hidden'
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={2}>
                  <div>
                    <Typography variant='h4' sx={{ color: 'common.white' }}>
                      New Subscription
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.75 }}>
                      Subscription management and installment entry.
                    </Typography>
                  </div>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    <Chip label={activeMembership ? 'Existing Subscription' : 'New Subscription'} sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
                    <Chip label={selectedScheme ? `${selectedScheme.name} (${selectedScheme.code})` : 'No scheme selected'} sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: 'common.white' }} />
                  </Stack>
                </Stack>

              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {error ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity='error'>{error}</Alert>
          </Grid>
        ) : null}

        {success ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity='success'>{success}</Alert>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, lg: 8.5 }}>
          <Stack spacing={4}>
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <div>
                    <Typography variant='h6'>Customer</Typography>
                    <Typography color='text.secondary'>
                      Search and choose the customer directly from the customer name field.
                    </Typography>
                  </div>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems='center'>
                          <Box ref={customerDropdownRef as React.Ref<HTMLDivElement>} sx={{ flex: 1 }}>
                            <TextField
                              fullWidth
                              placeholder='Search customer name'
                              value={customerInlineSearch}
                              onChange={event => {
                                setCustomerInlineSearch(event.target.value)
                                setCustomerInlineOpen(true)
                              }}
                              onFocus={() => {
                                setCustomerInlineOpen(true)
                              }}
                              sx={inputSx}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position='end'>
                                    <Box
                                      onClick={() => {
                                        setCustomerInlineOpen(current => !current)
                                      }}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'text.secondary',
                                        cursor: 'pointer',
                                        pr: 0.5
                                      }}
                                    >
                                      {customerInlineSearching ? <CircularProgress size={18} /> : <i className='ri-arrow-down-s-line' />}
                                    </Box>
                                  </InputAdornment>
                                )
                              }}
                            />

                            {customerInlineOpen && (customerInlineSearch.trim().length > 0 || customerInlineResults.length > 0) ? (
                              <Paper
                                elevation={0}
                                sx={{
                                  position: 'absolute',
                                  zIndex: 10,
                                  mt: 0.5,
                                  width: '100%',
                                  borderRadius: 0,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                  overflow: 'hidden',
                                  maxHeight: 320,
                                  overflowY: 'auto'
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                    gap: 1.5,
                                    px: 2,
                                    py: 1,
                                    bgcolor: 'action.hover',
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    fontSize: 13,
                                    fontWeight: 700
                                  }}
                                >
                                  <Box>Customer Name</Box>
                                  <Box>Phone</Box>
                                  <Box>Mobile</Box>
                                  <Box>City</Box>
                                  <Box>State</Box>
                                </Box>

                                {customerInlineSearching ? (
                                  <Box sx={{ px: 2, py: 2, fontSize: 13, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} />
                                    Searching...
                                  </Box>
                                ) : customerInlineResults.length ? (
                                  customerInlineResults.map(option => (
                                    <Box
                                      key={option.id || option.mobile}
                                      onMouseDown={event => event.preventDefault()}
                                      onClick={() => {
                                        setCustomerInlineOpen(false)
                                        void handleSelectCustomer(option)
                                      }}
                                      sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                        gap: 1.5,
                                        alignItems: 'center',
                                        px: 2,
                                        py: 1.1,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        '&:hover': {
                                          bgcolor: 'action.hover'
                                        }
                                      }}
                                    >
                                      <Typography fontWeight={600}>{option.name || 'Unnamed customer'}</Typography>
                                      <Typography variant='body2'>{option.mobile}</Typography>
                                      <Typography variant='body2'>{option.mobile}</Typography>
                                      <Typography variant='body2'>{option.kyc?.city || '-'}</Typography>
                                      <Typography variant='body2'>{option.kyc?.state || '-'}</Typography>
                                    </Box>
                                  ))
                                ) : (
                                  <Box sx={{ px: 2, py: 2, fontSize: 13, color: 'text.secondary' }}>
                                    No customer found
                                  </Box>
                                )}
                              </Paper>
                            ) : null}
                          </Box>
                          
                          <Stack direction='row' spacing={1}>
                            <Button
                                variant='contained'
                                color='primary'
                                onClick={() => setCustomerFormModalOpen(true)}
                                sx={{ height: 56, borderRadius: 0, minWidth: 44 }}
                            >
                                +
                            </Button>
                            <Button
                                variant='outlined'
                                color='primary'
                                onClick={() => setTicketSearchOpen(true)}
                                sx={{ height: 56, borderRadius: 0 }}
                                startIcon={<i className='ri-search-line' />}
                            >
                                A/C Search
                            </Button>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Typography variant='h6'>Subscription Entry Details</Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      {customerMemberships.length ? (
                        <TextField select fullWidth label='Subscription Scheme' value={selectedMembershipId} onChange={event => void handleMembershipChange(event.target.value)} sx={inputSx}>
                          {customerMemberships.map(item => (
                            <MenuItem key={item.id} value={String(item.id)}>
                              {`${item.scheme?.name || 'Scheme'} - ${item.membership_no || `#${item.id}`}`}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <TextField select fullWidth label='Subscription Scheme' value={selectedSchemeId} onChange={event => handleSchemeChange(event.target.value)} sx={inputSx}>
                          <MenuItem value=''>Select Scheme</MenuItem>
                          {schemes.map(item => (
                            <MenuItem key={item.id} value={String(item.id)}>
                              {`${item.name} (${item.code})`}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label="Today's Rate (per gm)" value={todayRate} InputProps={{ readOnly: true }} sx={inputSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Amount'
                        value={totals.amount.toFixed(2)}
                        InputProps={{ readOnly: true }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Installment Value'
                        value={activeMembership ? Number(selectedScheme?.installment_value || 0).toFixed(2) : editableInstallmentValue}
                        onChange={isVariableScheme || !activeMembership ? (event => setEditableInstallmentValue(event.target.value)) : undefined}
                        InputProps={{ readOnly: isVariableScheme || !activeMembership ? false : true }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Weight' value={weight} onChange={event => setWeight(event.target.value)} sx={inputSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Late Fee' value={totals.lateFee.toFixed(2)} sx={inputSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField select fullWidth label='Salesman' value={salesman} onChange={event => setSalesman(event.target.value)} sx={inputSx}>
                        <MenuItem value='None'>None</MenuItem>
                        {salesmen.map(item => (
                          <MenuItem key={item.id} value={item.name}>
                            {item.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Typography variant='h6'>Payment Details</Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label='Payment Method' value={gateway} onChange={event => setGateway(event.target.value as 'cash' | 'upi' | 'card' | 'cheque')} select sx={inputSx}>
                        <MenuItem value='cash'>Cash</MenuItem>
                        <MenuItem value='upi'>UPI</MenuItem>
                        <MenuItem value='card'>Card</MenuItem>
                        <MenuItem value='cheque'>Cheque</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label='Amount' value={totals.total.toFixed(2)} sx={inputSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth label='Reference No' value={transactionId} onChange={event => setTransactionId(event.target.value)} sx={inputSx} />
                    </Grid>
                    {gateway === 'upi' && (
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='UPI ID' value={transactionId} onChange={event => setTransactionId(event.target.value)} sx={inputSx} />
                      </Grid>
                    )}
                    {gateway === 'card' && (
                      <>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField fullWidth label='Card Last 4 Digits' value={transactionId} onChange={event => setTransactionId(event.target.value)} sx={inputSx} />
                        </Grid>
                      </>
                    )}
                    {gateway === 'cheque' && (
                      <>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField fullWidth label='Cheque No' value={transactionId} onChange={event => setTransactionId(event.target.value)} sx={inputSx} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField fullWidth label='Bank Name' onChange={event => setRemark(event.target.value)} sx={inputSx} />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                    <div>
                      <Typography variant='h6'>Table List</Typography>
                      <Typography color='text.secondary'>
                        Receipt-wise entry selection for first subscription or pending installments.
                      </Typography>
                    </div>
                    <Stack direction='row' spacing={1}>
                      <Button variant='outlined' onClick={() => setSelectedInstallmentIds(tableRows[0] ? [tableRows[0].id] : [])} disabled={!tableRows.length}>
                        First
                      </Button>
                      <Button variant='outlined' onClick={() => setSelectedInstallmentIds(tableRows.map(item => item.id))} disabled={!tableRows.length}>
                        All
                      </Button>
                    </Stack>
                  </Stack>

                  <TableContainer sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell />
                          <TableCell>Receipt No</TableCell>
                          <TableCell>Receipt Date</TableCell>
                          <TableCell>Gold Rate</TableCell>
                          <TableCell>Total Amount</TableCell>
                          <TableCell>Late Fee</TableCell>
                          <TableCell>Total Weight</TableCell>
                          <TableCell>Remarks</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableRows.length ? (
                          tableRows.map(item => {
                            const isSelected = selectedInstallmentIds.includes(item.id)

                            return (
                              <TableRow key={item.id} hover selected={isSelected} sx={{ cursor: 'pointer' }} onClick={() => handleToggleRow(item.id)}>
                                <TableCell padding='checkbox'>
                                  <Checkbox checked={isSelected} />
                                </TableCell>
                                <TableCell>{activeMembership?.membership_no || 'NEW'}</TableCell>
                                <TableCell>{formatDate(paymentDate)}</TableCell>
                                <TableCell>{todayRate}</TableCell>
                                <TableCell>{(Number(item.amount || 0) + Number(item.penalty || 0)).toFixed(2)}</TableCell>
                                <TableCell>{Number(item.penalty || 0).toFixed(2)}</TableCell>
                                <TableCell>{weight}</TableCell>
                                <TableCell>{remark || (activeMembership ? `Installment ${item.installment_no}` : 'First subscription entry')}</TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                              Search by customer to start entry.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TextField fullWidth multiline minRows={3} label='Remarks' value={remark} onChange={event => setRemark(event.target.value)} sx={inputSx} />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 3.5 }}>
          <Stack spacing={4}>
            {lookupCustomer ? (
              <Card sx={cardSx}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography variant='h6'>Customer Information</Typography>

                    <Stack spacing={1.2}>
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>Name</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {customerName || '-'}
                        </Typography>
                      </Stack>
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>Mobile</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {customerMobile || '-'}
                        </Typography>
                      </Stack>
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>Email</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {customerEmail || '-'}
                        </Typography>
                      </Stack>
                      {lookupCustomer.kyc?.city || lookupCustomer.kyc?.state ? (
                        <Stack direction='row' justifyContent='space-between' spacing={2}>
                          <Typography color='text.secondary'>Location</Typography>
                          <Typography fontWeight={700} textAlign='right'>
                            {[lookupCustomer.kyc?.city, lookupCustomer.kyc?.state].filter(Boolean).join(', ')}
                          </Typography>
                        </Stack>
                      ) : null}
                      {lookupCustomer.kyc?.nominee_name ? (
                        <Stack direction='row' justifyContent='space-between' spacing={2}>
                          <Typography color='text.secondary'>Nominee</Typography>
                          <Typography fontWeight={700} textAlign='right'>
                            {[lookupCustomer.kyc.nominee_name, lookupCustomer.kyc.nominee_relation].filter(Boolean).join(' - ')}
                          </Typography>
                        </Stack>
                      ) : null}
                      <Divider />
                      <Stack direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>Active Subscriptions</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {customerMemberships.length}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'success.50' }}>
                    <Typography variant='body2' color='text.secondary'>
                      Total
                    </Typography>
                    <Typography variant='h3' color='success.main' fontWeight={800}>
                      {currencyFormatter.format(totals.total)}
                    </Typography>
                  </Box>

                  <Typography variant='h6'>Receipt Summary</Typography>

                  <Stack spacing={1.2}>
                    {rightTopSummary.map(item => (
                      <Stack key={item.label} direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>{item.label}</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack spacing={1.2}>
                    {rightBottomSummary.map(item => (
                      <Stack key={item.label} direction='row' justifyContent='space-between' spacing={2}>
                        <Typography color='text.secondary'>{item.label}</Typography>
                        <Typography fontWeight={700} textAlign='right'>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant='h6'>Actions</Typography>
                  <Button
                    variant='contained'
                    size='large'
                    onClick={() => void handleSave()}
                    disabled={saving || !selectedRows.length || (!activeMembership && !selectedSchemeId)}
                    sx={{ borderRadius: 3 }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant='outlined' size='large' onClick={handlePrint} disabled={!lastSavedPaymentId} sx={{ borderRadius: 3 }}>
                    Print
                  </Button>
                  <Button variant='text' size='large' onClick={() => router.push('/subscriptions')}>
                    Close
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={ticketSearchOpen} onClose={() => setTicketSearchOpen(false)} fullWidth maxWidth='md'>
        <DialogTitle>Existing Subscription Search</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label='Search Subscription No / Customer'
              value={ticketSearchText}
              onChange={event => setTicketSearchText(event.target.value)}
              sx={inputSx}
            />
            <TableContainer sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Subscription No</TableCell>
                    <TableCell>Passbook No</TableCell>
                    <TableCell>Ticket No</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Scheme</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ticketSearchResults.slice(0, 25).map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.membership_no || '-'}</TableCell>
                      <TableCell>{item.passbook_no || '-'}</TableCell>
                      <TableCell>{item.ticket_no || '-'}</TableCell>
                      <TableCell>{item.customer?.name || item.customer?.mobile || '-'}</TableCell>
                      <TableCell>{item.scheme?.name || '-'}</TableCell>
                      <TableCell align='right'>
                        <Button size='small' variant='contained' onClick={() => void handleSelectMembership(item.id)}>
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ticketSearchResults.length ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                        No subscription found in loaded active records.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTicketSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} fullWidth maxWidth='lg'>
        <DialogTitle>Choose Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField fullWidth label='Customer Mobile / Name' value={customerSearchText} onChange={event => setCustomerSearchText(event.target.value)} sx={inputSx} />
              <Button variant='contained' onClick={() => void handleCustomerSearchModal()} disabled={customerModalSearching}>
                {customerModalSearching ? <CircularProgress size={18} color='inherit' /> : 'Search'}
              </Button>
            </Stack>

            <TableContainer sx={{ borderRadius: 0, border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Customer</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerSearchResults.map(item => (
                    <TableRow key={item.id || item.mobile}>
                      <TableCell>{item.name || 'Unnamed customer'}</TableCell>
                      <TableCell>{item.mobile}</TableCell>
                      <TableCell>{item.email || '-'}</TableCell>
                      <TableCell align='right'>
                        <Button size='small' variant='contained' onClick={() => void handleSelectCustomer(item)}>
                          Choose
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!customerSearchResults.length ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                        Search for an existing customer.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={customerFormModalOpen} onClose={() => setCustomerFormModalOpen(false)} fullWidth maxWidth='lg'>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant='h6' component='span'>Add New Customer</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant='outlined' color='secondary' onClick={() => setCustomerFormModalOpen(false)}>Cancel</Button>
            <Button variant='contained' onClick={() => void customerFormRef.current?.submit()}>Save Customer</Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <CustomerAddForm 
            ref={customerFormRef}
            embedded 
            fullFields
            onSuccess={(id) => {
              setCustomerFormModalOpen(false)
              setSuccess('Customer created successfully.')
              void handleSelectCustomer({ id } as CustomerLookup)
            }}
            onCancel={() => setCustomerFormModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default QuickInstallmentPage
