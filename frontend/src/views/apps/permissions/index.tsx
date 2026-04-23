'use client'

// React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// Next Auth Imports
import { useSession } from 'next-auth/react'

// MUI Imports
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import TablePagination from '@mui/material/TablePagination'
import IconButton from '@mui/material/IconButton'

// Third-party Imports
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { PermissionRowType } from '@/types/apps/permissionTypes'

// Component Imports
import PermissionDialog from '@components/dialogs/permission-dialog'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type PermissionApiItem = {
  id: number
  name: string
  module_name?: string
  description?: string
  created_at: string
  roles?: Array<{ name: string }>
}

type PermissionsPaginatedResponse = {
  data: PermissionApiItem[]
}

type PermissionsTypeWithAction = PermissionRowType & {
  action?: string
}

type Colors = {
  [key: string]: ThemeColor
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const colors: Colors = {
  support: 'info',
  users: 'success',
  manager: 'warning',
  administrator: 'primary',
  'restricted-user': 'error',
  'super-admin': 'error',
  admin: 'primary',
  staff: 'warning',
  customer: 'info'
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({
    itemRank
  })

  return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  placeholder,
  className
}: {
  value: string
  onChange: (value: string) => void
  debounce?: number
  placeholder?: string
  className?: string
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, debounce, onChange])

  return (
    <TextField
      value={value}
      onChange={e => setValue(e.target.value)}
      size='small'
      placeholder={placeholder}
      className={className}
    />
  )
}

const formatPermissionToken = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const moduleLabelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  branches: 'Branches',
  customers: 'Customers',
  kyc: 'KYC',
  schemes: 'Schemes',
  membership: 'Membership',
  installments: 'Installments',
  payments: 'Payments',
  accounts: 'Accounts',
  reports: 'Reports',
  users: 'Users & Roles',
  settings: 'Settings'
}

const hiddenPermissionModules = new Set(['catalog', 'promotions', 'feedback'])
const hiddenPermissions = new Set(['customers.profile'])

const getModuleName = (item: PermissionApiItem) => {
  if (item.module_name?.trim()) {
    return item.module_name.trim()
  }

  const [moduleKey] = item.name.split('.')
  const normalizedModuleKey = moduleKey?.toLowerCase() ?? ''

  return moduleLabelMap[normalizedModuleKey] || formatPermissionToken(moduleKey || 'General')
}

const getPermissionDescription = (item: PermissionApiItem) => {
  if (item.description?.trim()) {
    return item.description.trim()
  }

  const segments = item.name.split('.').filter(Boolean)

  if (segments.length === 0) {
    return 'Permission access'
  }

  const action = formatPermissionToken(segments[segments.length - 1])
  const target = formatPermissionToken(segments.slice(0, -1).join(' ') || segments[0])

  return `Allows ${action.toLowerCase()} access for ${target}.`
}

const isSuperAdminRole = (roleName: string) => {
  const normalized = roleName.toLowerCase().replace(/[_\s]+/g, '-')

  return normalized === 'super-admin' || normalized === 'superadmin'
}

const mapPermissionToRow = (item: PermissionApiItem): PermissionRowType => {
  const assignedRoles = (item.roles ?? []).map(role => role.name).filter(Boolean)
  const filteredAssignedRoles = assignedRoles.filter(roleName => !isSuperAdminRole(roleName))

  return {
    id: item.id,
    name: item.name,
    moduleName: getModuleName(item),
    description: getPermissionDescription(item),
    createdDate: new Date(item.created_at).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }),
    assignedTo:
      filteredAssignedRoles.length > 0
        ? filteredAssignedRoles
        : assignedRoles.length > 0
          ? 'No assignment needed (super-admin has default access)'
          : 'Unassigned'
  }
}

const columnHelper = createColumnHelper<PermissionsTypeWithAction>()

const Permissions = () => {
  const { data: session, status } = useSession()

  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [open, setOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [data, setData] = useState<PermissionRowType[]>([])
  const [editingPermission, setEditingPermission] = useState<{ id: number; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) {
      throw new Error('Missing access token')
    }

    const response = await fetch(`${backendApiUrl}${path}`, {
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
  }, [accessToken])

  const loadPermissions = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await request<PermissionsPaginatedResponse>('/permissions?per_page=100&sort_by=created_at&sort_direction=desc')
      const visiblePermissions = response.data.filter(item => {
        const moduleKey = item.name.split('.')[0]?.toLowerCase() ?? ''

        return !hiddenPermissionModules.has(moduleKey) && !hiddenPermissions.has(item.name)
      })

      setData(visiblePermissions.map(mapPermissionToRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')

      return
    }

    if (status === 'authenticated') {
      void loadPermissions()
    }
  }, [status, accessToken, loadPermissions])

  const handleAddPermission = useCallback(() => {
    setEditingPermission(null)
    setOpen(true)
  }, [])

  const handleEditPermission = useCallback((id: number, name: string) => {
    setEditingPermission({ id, name })
    setOpen(true)
  }, [])

  const handleSubmitPermission = useCallback(async ({ id, name }: { id?: number; name: string }) => {
    setSubmitting(true)
    setError(null)

    try {
      if (id) {
        await request(`/permissions/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ name })
        })
      } else {
        await request('/permissions', {
          method: 'POST',
          body: JSON.stringify({ name })
        })
      }

      setOpen(false)
      await loadPermissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permission.')
    } finally {
      setSubmitting(false)
    }
  }, [loadPermissions, request])

  const handleDeletePermission = useCallback(async (id: number) => {
    if (!confirm('Delete this permission?')) {
      return
    }

    setError(null)

    try {
      await request(`/permissions/${id}`, {
        method: 'DELETE'
      })
      await loadPermissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete permission.')
    }
  }, [loadPermissions, request])

  const columns = useMemo<ColumnDef<PermissionsTypeWithAction, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => <Typography color='text.primary'>{row.original.name}</Typography>
      }),
      columnHelper.accessor('moduleName', {
        header: 'Module',
        cell: ({ row }) => <Typography color='text.primary'>{row.original.moduleName}</Typography>
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ row }) => <Typography color='text.secondary'>{row.original.description}</Typography>
      }),
      columnHelper.accessor('assignedTo', {
        header: 'Assigned To',
        cell: ({ row }) =>
          typeof row.original.assignedTo === 'string' ? (
            <Chip
              variant='tonal'
              label={row.original.assignedTo}
              color={colors[row.original.assignedTo] || 'default'}
              size='small'
              className='capitalize'
            />
          ) : (
            row.original.assignedTo.map((item, index) => (
              <Chip
                variant='tonal'
                className='capitalize mie-4'
                key={index}
                label={item}
                color={colors[item] || 'default'}
                size='small'
              />
            ))
          )
      }),
      columnHelper.accessor('createdDate', {
        header: 'Created Date',
        cell: ({ row }) => <Typography>{row.original.createdDate}</Typography>
      }),
      columnHelper.accessor('action', {
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex items-center gap-0.5'>
            <IconButton size='small' onClick={() => handleEditPermission(row.original.id, row.original.name)}>
              <i className='ri-edit-box-line text-textSecondary' />
            </IconButton>
            <IconButton size='small' onClick={() => handleDeletePermission(row.original.id)}>
              <i className='ri-delete-bin-line text-error' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    [handleDeletePermission, handleEditPermission]
  )

  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      rowSelection,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  return (
    <>
      {error ? (
        <Alert severity='error' className='mbe-4'>
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardContent className='flex flex-col sm:flex-row items-start sm:items-center justify-between max-sm:gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Permissions'
            className='max-sm:is-full'
          />
          <Button variant='contained' onClick={handleAddPermission} className='max-sm:is-full'>
            Add Permission
          </Button>
        </CardContent>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={classnames({
                            'flex items-center': header.column.getIsSorted(),
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='ri-arrow-up-s-line text-xl' />,
                            desc: <i className='ri-arrow-down-s-line text-xl' />
                          }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    No data available
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <TablePagination
          rowsPerPageOptions={[5, 7, 10, 25]}
          component='div'
          className='border-bs'
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          SelectProps={{
            inputProps: { 'aria-label': 'rows per page' }
          }}
          onPageChange={(_, page) => {
            table.setPageIndex(page)
          }}
          onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
        />
      </Card>

      <PermissionDialog
        open={open}
        setOpen={setOpen}
        data={editingPermission}
        loading={submitting}
        onSubmit={handleSubmitPermission}
      />
    </>
  )
}

export default Permissions
