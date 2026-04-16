export type CustomerKyc = {
  id?: number
  aadhaar_number?: string | null
  pan_number?: string | null
  aadhaar_file?: string | null
  pan_file?: string | null
  photo?: string | null
  status?: 'pending' | 'approved' | 'rejected' | null
  city?: string | null
  state?: string | null
  address?: string | null
  pincode?: string | null
  remarks?: string | null
  verified_at?: string | null
}

export type Customer = {
  id: number
  name?: string | null
  mobile: string
  email?: string | null
  status?: 'active' | 'inactive' | 'blocked' | null
  created_at?: string | null
  user?: {
    id: number
    name: string
    email?: string | null
    mobile?: string | null
    branches?: Array<{
      id: number
      name: string
      code?: string | null
    }>
  } | null
  kyc?: CustomerKyc | null
  memberships?: Array<{
    id: number
    start_date: string
    maturity_date: string
    total_paid: string | number
    status: string
    scheme?: {
      id: number
      name: string
      code: string
      installment_value?: string | number | null
      total_installments?: number | null
      scheme_type?: string | null
      maturityBenefits?: Array<{
        id: number
        month: number
        type: string
        value: string | number
      }>
    } | null
    installments?: Array<{
      id: number
      installment_no: number
      due_date: string
      amount: string | number
      paid: boolean
      paid_date?: string | null
      penalty?: string | number | null
    }>
    payments?: Array<{
      id: number
      amount: string | number
      gateway?: string | null
      transaction_id?: string | null
      payment_date: string
      status: string
    }>
  }>
}

export type CustomersResponse = {
  data: Customer[]
}

export type CustomerResponse = {
  data: Customer
}

export const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

export const getCustomerName = (customer: Customer) => customer.name?.trim() || 'Unnamed customer'

export const getCustomerStatusColor = (status?: Customer['status']) => {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'default'

  return 'error'
}

export const getKycStatusColor = (status?: CustomerKyc['status']) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'

  return 'warning'
}

export const getCustomerLocationLabel = (customer: Customer) =>
  [customer.kyc?.city, customer.kyc?.state].filter(Boolean).join(', ') || 'Location Pending'
