export type CustomerKyc = {
  id?: number
  family_head?: string | null
  birth_date?: string | null
  anniversary?: string | null
  spouse_name?: string | null
  child_name_1?: string | null
  child_1_birth_date?: string | null
  child_name_2?: string | null
  child_2_birth_date?: string | null
  mobile_no_2?: string | null
  std_code?: string | null
  phone_no_1?: string | null
  phone_no_2?: string | null
  phone_no_3?: string | null
  phone_no_4?: string | null
  phone_no_5?: string | null
  fax_no_1?: string | null
  fax_no_2?: string | null
  email_2?: string | null
  block_no?: string | null
  building_name?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  country?: string | null
  address?: string | null
  aadhaar_number?: string | null
  pan_number?: string | null
  driving_licence?: string | null
  election_card?: string | null
  passport_no?: string | null
  nominee_name?: string | null
  nominee_relation?: string | null
  nominee_mobile_1?: string | null
  nominee_mobile_2?: string | null
  nominee_block_no?: string | null
  nominee_building_name?: string | null
  nominee_street?: string | null
  nominee_area?: string | null
  nominee_city?: string | null
  nominee_state?: string | null
  nominee_zip_code?: string | null
  nominee_country?: string | null
  reference_1?: string | null
  reference_2?: string | null
  remarks?: string | null
  photo?: string | null
  aadhaar_file?: string | null
  pan_file?: string | null
  status?: 'pending' | 'approved' | 'rejected' | null
  verified_at?: string | null
}

export type Customer = {
  id: number
  name?: string | null
  mobile: string
  email?: string | null
  status?: 'active' | 'inactive' | 'blocked' | null
  feedback?: string | null
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
