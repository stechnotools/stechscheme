export type DashboardReport = {
  customers_count: number
  schemes_count: number
  memberships_count: number
  active_memberships_count: number
  payments_count: number
  transactions_count: number
  pending_installments_count: number
  overdue_installments_count: number
  pending_kyc_count: number
  today_collections_amount: number
  upcoming_maturities_count: number
  total_collected_amount: number
}

export type Customer = {
  id: number
  name?: string | null
  mobile: string
  email?: string | null
  status: string
  kyc?: {
    status?: string
  } | null
}

export type Scheme = {
  id: number
  name: string
  code: string
  scheme_type: string
  item_group?: string | null
  start_date?: string | null
  termination_date?: string | null
  no_of_installment_type?: string | null
  min_no_of_installments?: number | null
  installment_code?: string | null
  installment_base?: string | null
  installment_duration?: string | null
  first_installment_multiple_of?: string | null
  installment_value: string
  total_installments: number
  late_fee_effect_account?: string | null
  allow_overdue: boolean
  grace_days?: number | null
  maturity_months_after_last_installment?: number | null
  apply_rate?: string | null
  allow_change_rate_closing?: boolean
  advance_closure_account?: string | null
  allow_bonus?: boolean
  benefit_type?: string | null
  benefit_mode?: string | null
  bonus_no_of_installments?: number | null
  bonus_effect_account?: string | null
  effect_to_account?: string | null
  interest_receivable_account?: string | null
  advertisement_publicity_account?: string | null
  remarks?: string | null
  is_closed?: boolean
  wt_booked_with_gst?: boolean
}

export type Membership = {
  id: number
  status: string
  start_date: string
  maturity_date: string
  total_paid: string
  customer?: {
    id: number
    name?: string | null
    mobile: string
  } | null
  user?: {
    id: number
    name: string
  } | null
  scheme?: {
    id: number
    name: string
    code: string
  } | null
}

export type Payment = {
  id: number
  amount: string
  status: string
  payment_date: string
  gateway?: string | null
  transaction_id?: string | null
  membership?: {
    id: number
    customer?: {
      name?: string | null
      mobile: string
    } | null
    user?: {
      name: string
    } | null
    scheme?: {
      name: string
    } | null
  } | null
}

type PaginatedResponse<T> = {
  data: T[]
}

const backendApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

async function fetchJson<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${backendApiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  })

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string }

    throw new Error(payload.message || `Request failed for ${path}`)
  }

  return res.json() as Promise<T>
}

export async function getJewelleryDashboardData(accessToken: string) {
  const [reportResponse, customersResponse, schemesResponse, membershipsResponse, paymentsResponse] = await Promise.all([
    fetchJson<{ data: DashboardReport }>('/reports/dashboard', accessToken),
    fetchJson<PaginatedResponse<Customer>>('/customers?per_page=5&sort_by=created_at&sort_direction=desc', accessToken),
    fetchJson<PaginatedResponse<Scheme>>('/schemes?per_page=4&sort_by=created_at&sort_direction=desc', accessToken),
    fetchJson<PaginatedResponse<Membership>>('/memberships?per_page=5&status=active', accessToken),
    fetchJson<PaginatedResponse<Payment>>('/payments?per_page=5&status=success', accessToken)
  ])

  return {
    report: reportResponse.data,
    customers: customersResponse.data,
    schemes: schemesResponse.data,
    memberships: membershipsResponse.data,
    payments: paymentsResponse.data
  }
}
