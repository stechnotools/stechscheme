export type BranchStatus = 'Performing' | 'Needs Attention' | 'New Launch'

export type ApiBranchUser = {
  id: number
  name: string
  email?: string | null
  mobile?: string | null
}

export type ApiBranch = {
  id: number
  name: string
  code: string
  city?: string | null
  manager_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  status?: 'active' | 'inactive' | null
  users?: ApiBranchUser[]
}

export type Branch = {
  id: number
  name: string
  code: string
  city: string
  manager: string
  status: BranchStatus
  members: number
  activeSchemes: number
  monthlyCollections: number
  growth: number
  dueToday: number
  phone: string
  email: string
  address: string
  zone: 'north' | 'south' | 'west'
  defaultSchemeVisibility: 'all' | 'selected'
  active: boolean
  walkInEnrollments: boolean
  paymentReminders: boolean
}

export const branchRecords: Branch[] = [
  {
    id: 1,
    name: 'T. Nagar Flagship',
    code: 'BR-TN01',
    city: 'Chennai',
    manager: 'Harini S',
    status: 'Performing',
    members: 842,
    activeSchemes: 16,
    monthlyCollections: 2860000,
    growth: 18,
    dueToday: 14,
    phone: '+91 98765 41001',
    email: 'tnagar@jewelleryscheme.in',
    address: '12 Pondy Bazaar, T. Nagar, Chennai',
    zone: 'south',
    defaultSchemeVisibility: 'all',
    active: true,
    walkInEnrollments: true,
    paymentReminders: true
  },
  {
    id: 2,
    name: 'RS Puram Studio',
    code: 'BR-RS02',
    city: 'Coimbatore',
    manager: 'Praveen Kumar',
    status: 'Performing',
    members: 596,
    activeSchemes: 12,
    monthlyCollections: 1940000,
    growth: 11,
    dueToday: 9,
    phone: '+91 98765 41002',
    email: 'rspuram@jewelleryscheme.in',
    address: '44 DB Road, RS Puram, Coimbatore',
    zone: 'west',
    defaultSchemeVisibility: 'all',
    active: true,
    walkInEnrollments: true,
    paymentReminders: true
  },
  {
    id: 3,
    name: 'Madurai Heritage',
    code: 'BR-MD03',
    city: 'Madurai',
    manager: 'Divya R',
    status: 'Needs Attention',
    members: 421,
    activeSchemes: 9,
    monthlyCollections: 1120000,
    growth: -4,
    dueToday: 27,
    phone: '+91 98765 41003',
    email: 'madurai@jewelleryscheme.in',
    address: '9 West Masi Street, Madurai',
    zone: 'south',
    defaultSchemeVisibility: 'selected',
    active: true,
    walkInEnrollments: true,
    paymentReminders: true
  },
  {
    id: 4,
    name: 'Trichy Gold Hub',
    code: 'BR-TR04',
    city: 'Trichy',
    manager: 'Sathish V',
    status: 'Needs Attention',
    members: 368,
    activeSchemes: 8,
    monthlyCollections: 980000,
    growth: 2,
    dueToday: 31,
    phone: '+91 98765 41004',
    email: 'trichy@jewelleryscheme.in',
    address: '101 Salai Road, Trichy',
    zone: 'south',
    defaultSchemeVisibility: 'selected',
    active: true,
    walkInEnrollments: true,
    paymentReminders: false
  },
  {
    id: 5,
    name: 'Velachery Express',
    code: 'BR-VL05',
    city: 'Chennai',
    manager: 'Nisha K',
    status: 'New Launch',
    members: 154,
    activeSchemes: 5,
    monthlyCollections: 420000,
    growth: 37,
    dueToday: 6,
    phone: '+91 98765 41005',
    email: 'velachery@jewelleryscheme.in',
    address: '88 Velachery Main Road, Chennai',
    zone: 'south',
    defaultSchemeVisibility: 'all',
    active: true,
    walkInEnrollments: true,
    paymentReminders: true
  }
]

export const getBranchById = (branchId: number) => branchRecords.find(branch => branch.id === branchId) ?? null

export const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

export const branchCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

export const getBranchStatusColor = (status: BranchStatus): 'success' | 'warning' | 'info' => {
  if (status === 'Performing') return 'success'
  if (status === 'Needs Attention') return 'warning'

  return 'info'
}

export const mapApiBranchToBranch = (branch: ApiBranch): Branch => {
  const preset =
    branchRecords.find(item => item.code === branch.code) ??
    branchRecords.find(item => item.name.toLowerCase() === branch.name.toLowerCase())

  const isInactive = branch.status === 'inactive'

  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    city: branch.city || preset?.city || '-',
    manager: branch.manager_name || preset?.manager || '-',
    status: isInactive ? 'Needs Attention' : preset?.status || 'Performing',
    members: branch.users?.length ?? preset?.members ?? 0,
    activeSchemes: preset?.activeSchemes ?? 0,
    monthlyCollections: preset?.monthlyCollections ?? 0,
    growth: preset?.growth ?? 0,
    dueToday: preset?.dueToday ?? 0,
    phone: branch.phone || preset?.phone || '-',
    email: branch.email || preset?.email || '-',
    address: branch.address || preset?.address || '-',
    zone: preset?.zone ?? 'south',
    defaultSchemeVisibility: preset?.defaultSchemeVisibility ?? 'all',
    active: !isInactive,
    walkInEnrollments: preset?.walkInEnrollments ?? true,
    paymentReminders: preset?.paymentReminders ?? true
  }
}
