'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { useSession } from 'next-auth/react'


import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Backdrop from '@mui/material/Backdrop'
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

import { usePageLoading } from '@/contexts/pageLoadingContext'
import { CustomerModalForm } from '../customers/CustomerModalForm'
import { getApiBaseUrl } from '@/libs/runtimeConfig'

type InstallmentItem = {
  id: number
  installment_no: number
  due_date: string
  paid: boolean
  paid_date?: string | null
  amount?: string | number
  penalty?: string | number
  paid_amount?: string | number
  balance_amount?: string | number
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
  scheme_type?: string | null
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
  data: Array<{ id: number; receipt_id?: number }>
  message?: string
}

type PaymentMethod = {
  gateway: 'cash' | 'upi' | 'card' | 'cheque'
  amount: string
  transaction_id: string
}

type EnrollmentResponse = {
  data: {
    customer?: { id?: number; mobile?: string; name?: string | null }
    membership?: { id?: number; membership_no?: string | null; card_no?: string | null }
    payment?: { id?: number; receipt_id?: number }
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

const resolveBackendApiUrl = getApiBaseUrl

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

const MembershipCreatePage = () => {
  const customerFormRef = useRef<import('../customers/CustomerModalForm').CustomerModalFormHandle>(null)
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

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { gateway: 'cash', amount: '', transaction_id: '' }
  ])

  const [remark, setRemark] = useState('')
  const [salesman, setSalesman] = useState('None')
  const [todayRate, setTodayRate] = useState('0.00')
  const [metalRates, setMetalRates] = useState<any[]>([])

  const [weight, setWeight] = useState('0.000')
  const [isBonus, setIsBonus] = useState(false)
  const [editableInstallmentValue, setEditableInstallmentValue] = useState('')
  const [payableAmount, setPayableAmount] = useState('')
  const [passbookNumber, setPassbookNumber] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')

  const [schemeOptions, setSchemeOptions] = useState<SchemeOption[]>([])
  const [schemeSearching, setSchemeSearching] = useState(false)
  const [schemeSearchText, setSchemeSearchText] = useState('')
  const [selectedSchemeOption, setSelectedSchemeOption] = useState<SchemeOption | null>(null)
  const schemeSearchAbortRef = useRef<AbortController | null>(null)

  const [salesmanOptions, setSalesmanOptions] = useState<SalesmanOption[]>([])
  const [salesmanSearching, setSalesmanSearching] = useState(false)
  const [salesmanSearchText, setSalesmanSearchText] = useState('')
  const [selectedSalesmanOption, setSelectedSalesmanOption] = useState<SalesmanOption | null>(null)
  const salesmanSearchAbortRef = useRef<AbortController | null>(null)

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

  const [lastSavedPaymentId, setLastSavedPaymentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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
        const metalResponse = await request<{ success: boolean; data: any[] }>('/digital-metal-masters')

        const activeMetals = (metalResponse.data || []).filter((m: any) => m.status !== 'inactive')

        const mappedMetalRates = activeMetals.map((m: any) => {
          const baseRate = m.last_log ? parseFloat(m.last_log.new_rate) : parseFloat(m.rate_per || '0')
          const buyMarkup = m.last_log ? parseFloat(m.last_log.new_buy_markup) : parseFloat(m.buy_markup_amount || '0')
          const buyRate = baseRate + buyMarkup


return {
            ...m,
            rate_per: buyRate
          }
        })

        const goldMaster = mappedMetalRates.find((m: any) => m.metal_name?.toLowerCase().includes('gold'))

        if (goldMaster) {
          const originalGold = activeMetals.find((m: any) => m.metal_name?.toLowerCase().includes('gold'))
          const ratePerNum = parseFloat(originalGold?.rate_per || '10')
          const perGramRate = goldMaster.rate_per / (ratePerNum > 0 ? ratePerNum : 10)

          setTodayRate(perGramRate.toFixed(2))
        }

        setMetalRates(mappedMetalRates)
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

    return selectedSchemeOption
  }, [activeMembership?.scheme, selectedSchemeOption])

  const isFirstMembershipMode = !activeMembership && Boolean(customerMobile.trim() || accountSearch.trim() || lookupCustomer)
  const isVariableScheme = (selectedScheme?.no_of_installment_type || '').toLowerCase() === 'variable'
  const isWeightScheme = (selectedScheme?.scheme_type || '').toLowerCase() === 'weight'

  const activeInstallmentValue = useMemo(() => {
    if (!activeMembership?.installments?.length) return null

    const sortedInstallments = [...activeMembership.installments].sort((a, b) => a.installment_no - b.installment_no)
    const installment = sortedInstallments.find(item => !item.paid) || sortedInstallments[0]

    return installment?.amount != null ? Number(installment.amount) : null
  }, [activeMembership])

  const currentInstallmentValue = activeMembership
    ? Number(activeInstallmentValue ?? selectedScheme?.installment_value ?? 0)
    : Number(editableInstallmentValue || selectedScheme?.installment_value || 0)

  const remainingPayableAmount = useMemo(() => {
    if (!activeMembership?.installments?.length) return 0

    return activeMembership.installments.reduce((sum, installment) => {
      const amount = Number(installment.amount || 0)
      const penalty = Number(installment.penalty || 0)
      const paidAmount = Number(installment.paid_amount || 0)

      return sum + Math.max(0, amount + penalty - paidAmount)
    }, 0)
  }, [activeMembership])

  const payableLimit = activeMembership
    ? remainingPayableAmount
    : Number(selectedScheme?.total_installments || 0) * currentInstallmentValue

  const payableAmountError = useMemo(() => {
    if (!selectedScheme || isWeightScheme || !payableAmount) return null

    const enteredAmount = Number(payableAmount || 0)

    if (enteredAmount > payableLimit) {
      const label = activeMembership ? 'remaining payable amount' : 'total installment amount'


return `Payable amount (${currencyFormatter.format(enteredAmount)}) cannot be greater than the ${label} (${currencyFormatter.format(payableLimit)}).`
    }

    const installmentVal = currentInstallmentValue

    if (installmentVal > 0 && enteredAmount % installmentVal !== 0) {
      return `Payable amount (${currencyFormatter.format(enteredAmount)}) must be a multiple of the scheme installment value (${currencyFormatter.format(installmentVal)}).`
    }

    return null
  }, [activeMembership, currentInstallmentValue, payableAmount, payableLimit, selectedScheme, isWeightScheme])

  useEffect(() => {
    if (selectedScheme) {
      const val = Number(activeMembership ? activeInstallmentValue ?? selectedScheme.installment_value ?? 0 : selectedScheme.installment_value || 0).toFixed(2)

      setEditableInstallmentValue(val)
      setPayableAmount(val)
    }
  }, [activeInstallmentValue, activeMembership, selectedScheme])

  // Auto-sync first payment method amount when payableAmount changes
  useEffect(() => {
    if (payableAmount && paymentMethods.length > 0) {
      setPaymentMethods(prev => {
        if (prev.length === 1) {
          return [{ ...prev[0], amount: payableAmount }]
        }


return prev
      })
    }
  }, [payableAmount])

  // On-the-fly validation for payment amounts
  const paymentTotalAllocated = useMemo(
    () => paymentMethods.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [paymentMethods]
  )

  const paymentAmountErrors = useMemo(() => {
    const payable = Number(payableAmount || 0)

    const errors: (string | null)[] = paymentMethods.map(p => {
      const amt = Number(p.amount || 0)

      if (payable > 0 && amt > payable) {
        return `Amount cannot exceed payable amount (${currencyFormatter.format(payable)})`
      }


return null
    })


return errors
  }, [paymentMethods, payableAmount])

  const paymentTotalError = useMemo(() => {
    const payable = Number(payableAmount || 0)

    if (payable > 0 && Math.abs(payable - paymentTotalAllocated) > 0.01) {
      return `Total allocated (${currencyFormatter.format(paymentTotalAllocated)}) must equal payable amount (${currencyFormatter.format(payable)}). Difference: ${currencyFormatter.format(payable - paymentTotalAllocated)}`
    }


return null
  }, [payableAmount, paymentTotalAllocated])

  // Auto-calculate weight for weight-based schemes
  useEffect(() => {
    if (isWeightScheme) {
      const rate = Number(todayRate)
      const amount = Number(payableAmount || 0)

      if (rate > 0 && amount > 0) {
        setWeight((amount / rate).toFixed(3))
      } else {
        setWeight('0.000')
      }
    }
  }, [isWeightScheme, payableAmount, todayRate])

  const pendingInstallments = useMemo(() => {
    if (!activeMembership?.installments) return []

    return [...activeMembership.installments].filter(item => !item.paid).sort((a, b) => a.installment_no - b.installment_no)
  }, [activeMembership])

  const tableRows = useMemo(() => {
    if (!selectedScheme) return []

    const installmentVal = currentInstallmentValue
    const enteredAmount = Number(payableAmount || 0)

    if (activeMembership) {
      if (installmentVal > 0 && enteredAmount > 0) {
        const numInstallments = Math.max(1, Math.floor(enteredAmount / installmentVal))


return pendingInstallments.slice(0, numInstallments)
      }


return pendingInstallments.slice(0, 1)
    }

    if (!isFirstMembershipMode) return []

    if (installmentVal > 0 && enteredAmount > 0) {
      const numInstallments = Math.max(1, Math.floor(enteredAmount / installmentVal))
      const rows = []

      for (let i = 0; i < numInstallments; i++) {
        rows.push({
          id: -(i + 1),
          installment_no: i + 1,
          due_date: addMonthsToDate(paymentDate, i),
          paid: false,
          amount: installmentVal,
          penalty: 0
        })
      }


return rows
    }

    return [
      {
        id: -1,
        installment_no: 1,
        due_date: paymentDate,
        paid: false,
        amount: Number(payableAmount || editableInstallmentValue || selectedScheme.installment_value || 0),
        penalty: 0
      }
    ]
  }, [activeMembership, currentInstallmentValue, editableInstallmentValue, isFirstMembershipMode, payableAmount, paymentDate, pendingInstallments, selectedScheme])

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

  useEffect(() => {
    if (tableRows.length > 0) {
      const ids = tableRows.map(item => item.id)

      const isDifferent =
        ids.length !== selectedInstallmentIds.length ||
        !ids.every(id => selectedInstallmentIds.includes(id))

      if (isDifferent) {
        setSelectedInstallmentIds(ids)
      }
    } else {
      if (selectedInstallmentIds.length > 0) {
        setSelectedInstallmentIds([])
      }
    }
  }, [tableRows, selectedInstallmentIds])

  const paidInstallments = activeMembership?.installments?.filter(item => item.paid).length || 0
  const totalInstallments = activeMembership?.installments?.length || Number(selectedScheme?.total_installments || 0)
  const firstPendingInstallment = pendingInstallments[0] || null
  const maturityDate = activeMembership?.maturity_date || (selectedScheme?.total_installments ? addMonthsToDate(paymentDate, Math.max(Number(selectedScheme.total_installments) - 1, 0)) : '')
  const installmentCode = selectedScheme?.installment_code || selectedScheme?.code || ''
  const lotNo = activeMembership ? (paidInstallments + 1) : 1

  const [ticketSearchResults, setTicketSearchResults] = useState<MembershipLookup[]>([])
  const [ticketModalSearching, setTicketModalSearching] = useState(false)

  const handleTicketSearchModal = async (fetchDefault = false) => {
    const query = ticketSearchText.trim()

    if (!query && !fetchDefault) {
      setTicketSearchResults([])

      return
    }

    setTicketModalSearching(true)

    try {
      const endpoint = query
        ? `/memberships?search=${encodeURIComponent(query)}&status_group=active`
        : `/memberships?status_group=active&per_page=25`

      const response = await request<MembershipsResponse>(endpoint)

      setTicketSearchResults(response.data || [])
    } catch {
      setTicketSearchResults([])
    } finally {
      setTicketModalSearching(false)
    }
  }

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
        setSelectedSchemeOption(null)
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
        setSelectedSchemeOption(null)
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

  useEffect(() => {
    if (!accessToken) return

    const query = schemeSearchText.trim()

    schemeSearchAbortRef.current?.abort()
    const controller = new AbortController()

    schemeSearchAbortRef.current = controller
    setSchemeSearching(true)

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (controller.signal.aborted) return

        try {
          const endpoint = query
            ? `/schemes?per_page=25&search=${encodeURIComponent(query)}`
            : '/schemes?per_page=25&sort_by=created_at&sort_direction=desc'

          const response = await request<SchemesResponse>(endpoint, { signal: controller.signal })

          if (controller.signal.aborted) return

          setSchemeOptions(response.data.filter(item => !item.is_closed))
        } catch {
          if (!controller.signal.aborted) setSchemeOptions([])
        } finally {
          if (!controller.signal.aborted) setSchemeSearching(false)
        }
      })()
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [accessToken, schemeSearchText, request])

  useEffect(() => {
    if (!accessToken) return

    const query = salesmanSearchText.trim()

    salesmanSearchAbortRef.current?.abort()
    const controller = new AbortController()

    salesmanSearchAbortRef.current = controller
    setSalesmanSearching(true)

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (controller.signal.aborted) return

        try {
          const endpoint = query
            ? `/salesmen?per_page=25&status=active&search=${encodeURIComponent(query)}`
            : '/salesmen?per_page=25&sort_by=name&sort_direction=asc&status=active'

          const response = await request<UsersResponse>(endpoint, { signal: controller.signal })

          if (controller.signal.aborted) return

          setSalesmanOptions(response.data)
        } catch {
          if (!controller.signal.aborted) setSalesmanOptions([])
        } finally {
          if (!controller.signal.aborted) setSalesmanSearching(false)
        }
      })()
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [accessToken, salesmanSearchText, request])

  const handleSelectCustomer = async (customer: CustomerLookup) => {
    setCustomerModalOpen(false)
    setCustomerInlineOpen(false)
    setCustomerInlineSearch(customer.name || customer.mobile || '')
    setLoading(true)
    setError(null)
    setSuccess(null)
    setLastSavedPaymentId(null)

    try {
      const full = await request<CustomerDetailResponse>(`/customers/${customer.id}`)
      const data = full.data
      const activeMembershipSummaries = (data.memberships || []).filter(item => item.status === 'active')

      if (activeMembershipSummaries.length) {
        const memberships = await Promise.all(activeMembershipSummaries.map(item => loadMembership(item.id)))
        const selected = memberships.sort((a, b) => a.id - b.id)[0]

        await applyMembershipSelection(selected)
      } else {
        setLookupCustomer(data)
        setCustomerName(data.name || '')
        setCustomerMobile(data.mobile || '')
        setCustomerEmail(data.email || '')
        setCustomerInlineSearch(data.name || data.mobile || '')
        setAccountSearch(data.mobile || '')
        setCustomerMemberships([])
        setSelectedMembershipId('')
        setSelectedSchemeId('')
        setSelectedSchemeOption(null)
        setSelectedInstallmentIds([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer.')
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
      setSuccess('Membership loaded successfully.')
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

  const handleSchemeChange = (scheme: SchemeOption | null) => {
    setSelectedSchemeOption(scheme)
    setSelectedSchemeId(scheme ? String(scheme.id) : '')
    setSelectedInstallmentIds(scheme ? [-1] : [])
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
      if (payableAmountError) {
        throw new Error(payableAmountError)
      }

      if (activeMembership && payableAmount && Number(payableAmount) > remainingPayableAmount + 0.01) {
        throw new Error(
          `Payable amount cannot exceed the remaining balance of ${currencyFormatter.format(remainingPayableAmount)}.`
        )
      }

      const rowError = paymentAmountErrors.find(e => e !== null)

      if (rowError) {
        throw new Error(rowError)
      }

      if (paymentTotalError) {
        throw new Error(paymentTotalError)
      }

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
            installment_value: Number(editableInstallmentValue || selectedScheme.installment_value || 0),
            start_date: paymentDate,
            payment: {
              amount: paymentMethods.reduce((sum, p) => sum + Number(p.amount || 0), 0),
              gateway: paymentMethods[0]?.gateway || 'cash',
              transaction_id: paymentMethods[0]?.transaction_id || null,
              payment_date: paymentDate,
              status: 'success'
            },
            payments: paymentMethods.filter(p => Number(p.amount) > 0).map(p => ({
              ...p,
              amount: Number(p.amount),
              payment_date: paymentDate
            }))
          })
        })

        const customerId = response.data.customer?.id
        const membershipId = response.data.membership?.id

        if (customerId && membershipId) {
          router.push(`/subscriptions/${membershipId}`)
        }
      } else {
        if (!selectedInstallmentIds.length) throw new Error('Select installment rows.')

        const response = await request<BulkPaymentResponse>('/payments/bulk', {
          method: 'POST',
          body: JSON.stringify({
            membership_id: activeMembership.id,
            installment_ids: selectedInstallmentIds,
            gateway: paymentMethods[0]?.gateway || 'cash',
            transaction_id: paymentMethods[0]?.transaction_id || null,
            payments: paymentMethods.filter(p => Number(p.amount) > 0).map(p => ({
              ...p,
              amount: Number(p.amount)
            })),
            payment_date: paymentDate,
            status: 'success'
          })
        })

        const refreshedMembership = await loadMembership(activeMembership.id)

        await applyMembershipSelection(refreshedMembership)
        setLastSavedPaymentId(response.data[0]?.receipt_id?.toString() || response.data[0]?.id?.toString() || null)
        setSuccess(response.message || 'Installment saved successfully.')
      }


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
      <Backdrop
        open={loading}
        sx={{
          zIndex: theme => theme.zIndex.modal + 1,
          color: 'common.white',
          bgcolor: 'rgba(15, 23, 42, 0.48)'
        }}
      >
        <CircularProgress color='inherit' />
      </Backdrop>

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
                      {activeMembership ? 'Installment Payment' : 'New Enrollment'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.75 }}>
                      Membership management and installment entry.
                    </Typography>
                  </div>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    <Chip label={activeMembership ? 'Existing Membership' : 'New Membership'} sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
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
            <Card sx={{ ...cardSx, overflow: 'visible' }}>
              <CardContent sx={{ p: 3, overflow: 'visible' }}>
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
                          <Box ref={customerDropdownRef as React.Ref<HTMLDivElement>} sx={{ flex: 1, position: 'relative' }}>
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
                                        if (lookupCustomer) {
                                          setLookupCustomer(null)
                                          setCustomerInlineSearch('')
                                          setCustomerInlineResults([])
                                          setCustomerInlineOpen(false)
                                          setCustomerName('')
                                          setCustomerMobile('')
                                          setCustomerEmail('')
                                          setCustomerMemberships([])
                                          setSelectedMembershipId('')
                                          setSelectedSchemeId('')
                                          setSelectedSchemeOption(null)
                                          setSelectedInstallmentIds([])
                                        } else {
                                          setCustomerInlineOpen(current => !current)
                                        }
                                      }}
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'text.secondary',
                                        cursor: 'pointer',
                                        pr: 0.5
                                      }}
                                    >
                                      {customerInlineSearching ? (
                                        <CircularProgress size={18} />
                                      ) : lookupCustomer ? (
                                        <i className='ri-close-line' style={{ fontSize: 20 }} />
                                      ) : (
                                        <i className='ri-arrow-down-s-line' />
                                      )}
                                    </Box>
                                  </InputAdornment>
                                )
                              }}
                            />

                            {customerInlineOpen && (customerInlineSearch.trim().length > 0 || customerInlineResults.length > 0) && (!lookupCustomer || (customerInlineSearch !== lookupCustomer.name && customerInlineSearch !== lookupCustomer.mobile)) ? (
                              <Paper
                                elevation={0}
                                sx={{
                                  position: 'absolute',
                                  zIndex: 9999,
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
                                onClick={() => {
                                  setTicketSearchOpen(true)
                                  if (!ticketSearchResults.length && !ticketSearchText) {
                                    void handleTicketSearchModal(true)
                                  }
                                }}
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
                  <Typography variant='h6'>Membership Entry Details</Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      {customerMemberships.length ? (
                        <TextField select fullWidth label='Membership Scheme' value={selectedMembershipId} onChange={event => void handleMembershipChange(event.target.value)} sx={inputSx}>
                          {customerMemberships.map(item => (
                            <MenuItem key={item.id} value={String(item.id)}>
                              {`${item.scheme?.name || 'Scheme'} - ${item.membership_no || `#${item.id}`}`}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Autocomplete
                          fullWidth
                          options={schemeOptions}
                          loading={schemeSearching}
                          getOptionKey={option => option.id}
                          getOptionLabel={option => `${option.name} (${option.code})`}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          value={selectedSchemeOption}
                          onChange={(_, value) => handleSchemeChange(value)}
                          onInputChange={(_, value, reason) => {
                            if (reason === 'input') setSchemeSearchText(value)
                          }}
                          filterOptions={options => options}
                          renderInput={params => (
                            <TextField
                              {...params}
                              label='Membership Scheme'
                              placeholder='Search scheme...'
                              InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                  <>
                                    {schemeSearching ? <CircularProgress color='inherit' size={16} /> : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                )
                              }}
                              sx={inputSx}
                            />
                          )}
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type='date'
                        label={activeMembership ? 'Payment Date' : 'Joining Date'}
                        value={paymentDate}
                        onChange={event => setPaymentDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText={activeMembership ? 'Back-date this payment if collected on an earlier date' : 'Back-date if this customer actually joined earlier'}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Scheme Value'
                        type='number'
                        disabled={!selectedScheme}
                        value={activeMembership ? currentInstallmentValue.toFixed(2) : editableInstallmentValue}
                        onChange={!activeMembership ? (event => {
                          setEditableInstallmentValue(event.target.value)
                          setPayableAmount(event.target.value)
                        }) : undefined}
                        InputProps={{
                          readOnly: Boolean(activeMembership),
                          startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                        }}
                        helperText={activeMembership ? 'Locked to scheme plan for repayment' : 'Editable for first subscription'}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label='Payable Amount'
                        type='number'
                        disabled={!selectedScheme}
                        value={payableAmount}
                        onChange={event => setPayableAmount(event.target.value)}
                        error={Boolean(payableAmountError)}
                        helperText={payableAmountError || 'Amount to be collected from customer'}
                        InputProps={{
                          startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                        }}
                        sx={inputSx}
                      />
                    </Grid>
                    {isWeightScheme && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label='Weight (gm)'
                          value={weight}
                          InputProps={{
                            readOnly: true,
                            endAdornment: <InputAdornment position='end'>gm</InputAdornment>
                          }}
                          helperText={`Auto-calculated: ₹${payableAmount || '0'} ÷ ₹${todayRate}/gm`}
                          sx={inputSx}
                        />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Late Fee' value={totals.lateFee.toFixed(2)} InputProps={{ readOnly: true }} sx={inputSx} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Autocomplete
                        fullWidth
                        options={salesmanOptions}
                        loading={salesmanSearching}
                        getOptionKey={option => option.id}
                        getOptionLabel={option => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedSalesmanOption}
                        onChange={(_, value) => {
                          setSelectedSalesmanOption(value)
                          setSalesman(value ? value.name : 'None')
                        }}
                        onInputChange={(_, value, reason) => {
                          if (reason === 'input') setSalesmanSearchText(value)
                        }}
                        filterOptions={options => options}
                        renderInput={params => (
                          <TextField
                            {...params}
                            label='Salesman'
                            placeholder='Search salesman...'
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {salesmanSearching ? <CircularProgress color='inherit' size={16} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              )
                            }}
                            sx={inputSx}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Typography variant='h6'>Payment Details</Typography>

                  <Stack spacing={4}>
                    {paymentMethods.map((method, index) => (
                      <Grid container spacing={3} key={index} alignItems='flex-end'>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <TextField
                            select
                            fullWidth
                            label='Payment Method'
                            value={method.gateway}
                            onChange={event => {
                              const newMethods = [...paymentMethods]

                              newMethods[index].gateway = event.target.value as any
                              setPaymentMethods(newMethods)
                            }}
                            sx={inputSx}
                          >
                            <MenuItem value='cash'>Cash</MenuItem>
                            <MenuItem value='upi'>UPI</MenuItem>
                            <MenuItem value='card'>Card</MenuItem>
                            <MenuItem value='cheque'>Cheque</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <TextField
                            fullWidth
                            label='Amount'
                            type='number'
                            value={method.amount}
                            placeholder={index === 0 ? Number(payableAmount || 0).toFixed(2) : '0.00'}
                            onChange={event => {
                              const newMethods = [...paymentMethods]

                              newMethods[index].amount = event.target.value
                              setPaymentMethods(newMethods)
                            }}
                            error={Boolean(paymentAmountErrors[index])}
                            helperText={paymentAmountErrors[index] || ''}
                            InputProps={{
                              startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                            }}
                            sx={inputSx}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            fullWidth
                            label={method.gateway === 'cash' ? 'Reference (Optional)' : 'Transaction ID / Ref No'}
                            value={method.transaction_id}
                            onChange={event => {
                              const newMethods = [...paymentMethods]

                              newMethods[index].transaction_id = event.target.value
                              setPaymentMethods(newMethods)
                            }}
                            sx={inputSx}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 2 }}>
                          <Stack direction='row' spacing={1}>
                            {paymentMethods.length > 1 && (
                              <Button
                                variant='outlined'
                                color='error'
                                onClick={() => {
                                  setPaymentMethods(paymentMethods.filter((_, i) => i !== index))
                                }}
                                sx={{ minWidth: 44, height: 56 }}
                              >
                                <i className='ri-delete-bin-line' />
                              </Button>
                            )}
                            {index === paymentMethods.length - 1 && (
                              <Button
                                variant='outlined'
                                onClick={() => {
                                  const currentTotal = paymentMethods.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                                  const remaining = Math.max(0, Number(payableAmount || 0) - currentTotal)

                                  setPaymentMethods([...paymentMethods, { gateway: 'cash', amount: remaining > 0 ? remaining.toFixed(2) : '', transaction_id: '' }])
                                }}
                                sx={{ minWidth: 44, height: 56 }}
                              >
                                <i className='ri-add-line' />
                              </Button>
                            )}
                          </Stack>
                        </Grid>
                      </Grid>
                    ))}

                    <Box sx={{ p: 2, bgcolor: paymentTotalError ? 'error.main' : 'action.hover', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: paymentTotalError ? 'error.contrastText' : 'text.secondary' }}>
                      <Typography variant='subtitle2' color='inherit'>
                        Total Allocated: {currencyFormatter.format(paymentTotalAllocated)} / Payable: {currencyFormatter.format(Number(payableAmount || 0))}
                      </Typography>
                      {paymentTotalError && (
                        <Typography variant='caption' color='inherit' fontWeight={700}>
                          {paymentTotalError}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3.5}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                    <div>
                      <Typography variant='h6'>Table List</Typography>
                      <Typography color='text.secondary'>
                        Receipt-wise entry selection and metadata summary.
                      </Typography>
                    </div>
                  </Stack>

                  <Box
                    sx={{
                      p: 3.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 4,
                      position: 'relative',
                      bgcolor: 'background.paper'
                    }}
                  >
                    {/* Vertical line divider for md and above */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        position: 'absolute',
                        left: '50%',
                        top: '12%',
                        bottom: '12%',
                        width: '1px',
                        bgcolor: 'divider'
                      }}
                    />

                    <Stack spacing={2.5}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>Receipt NO :</Typography>
                        <Typography fontWeight={600}>
                          {activeMembership?.membership_no || (lastSavedPaymentId ? `REC-${lastSavedPaymentId}` : 'NEW')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>Receipt Date :</Typography>
                        <Typography fontWeight={600}>
                          {formatDate(paymentDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>Sales Man :</Typography>
                        <Typography fontWeight={600}>
                          {salesman || 'None'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={2.5} sx={{ pl: { md: 4 } }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>Total Amount :</Typography>
                        <Typography fontWeight={600}>
                          {currencyFormatter.format(totals.total)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>No of Installment :</Typography>
                        <Typography fontWeight={600}>
                          {selectedRows.length}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography color='text.secondary' fontWeight={500}>Late Fee :</Typography>
                        <Typography fontWeight={600}>
                          {currencyFormatter.format(totals.lateFee)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Typography variant='h6' sx={{ mt: 1 }}>Installment Details</Typography>

                  <TableContainer sx={{ borderRadius: 0, border: '1px solid', borderColor: 'divider' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell>Installment NO</TableCell>
                          <TableCell>Installment Amount</TableCell>
                          <TableCell>Date</TableCell>
                          {isWeightScheme && <TableCell>Weight (gm)</TableCell>}
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableRows.length ? (
                          tableRows.map(item => {
                            return (
                              <TableRow key={item.id} hover>
                                <TableCell>{item.installment_no}</TableCell>
                                <TableCell>{(Number(item.amount || 0)).toFixed(2)}</TableCell>
                                <TableCell>{formatDate(item.due_date)}</TableCell>
                                {isWeightScheme && (
                                  <TableCell>
                                    {(Number(item.amount || 0) / Number(todayRate || 1)).toFixed(3)}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Chip
                                    label={item.paid ? 'Paid' : 'Pending'}
                                    size='small'
                                    color={item.paid ? 'success' : 'warning'}
                                    variant='outlined'
                                  />
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={isWeightScheme ? 5 : 4} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
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
            <Card sx={cardSx}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant='caption' sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Today's Metal Rates</Typography>

                  {metalRates.length > 0 ? (
                    <Stack spacing={2}>
                      {metalRates.map((metal, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant='body2' fontWeight={600} color='text.secondary'>
                            {metal.display_text || metal.metal_name}
                          </Typography>
                          <Typography variant='h5' fontWeight={800} color='primary.main'>
                            {currencyFormatter.format(Number(metal.rate_per || 0))}
                            <Typography component='span' variant='caption' sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 400 }}>
                              /{metal.rate_per_unit || 'gm'}
                            </Typography>
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant='h3' sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {currencyFormatter.format(Number(todayRate))}
                      <Typography component='span' variant='body2' sx={{ ml: 1, color: 'text.secondary' }}>/gm</Typography>
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

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
                        <Typography color='text.secondary'>Active Memberships</Typography>
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
        <DialogTitle>Existing Membership Search</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                label='Search Membership No / Customer / A/C'
                value={ticketSearchText}
                onChange={event => setTicketSearchText(event.target.value)}
                sx={inputSx}
              />
              <Button variant='contained' onClick={() => void handleTicketSearchModal()} disabled={ticketModalSearching}>
                {ticketModalSearching ? <CircularProgress size={18} color='inherit' /> : 'Search'}
              </Button>
            </Stack>
            <TableContainer sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>Membership No</TableCell>
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
                      <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                        Search for a subscription, passbook, or ticket number.
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
          <CustomerModalForm
            ref={customerFormRef}
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

export default MembershipCreatePage
