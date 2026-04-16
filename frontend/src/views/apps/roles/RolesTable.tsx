'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import classnames from 'classnames'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import type { RoleApiType } from '@/types/apps/roleTypes'
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/react-table' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type Props = {
  roles: RoleApiType[]
  loading: boolean
  onRefresh: () => Promise<void>
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}

type RoleRow = {
  id: number
  name: string
  usersCount: number
  permissionsCount: number
  createdDate: string
}

type RoleRowWithAction = RoleRow & {
  action?: string
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

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

  return <TextField value={value} onChange={e => setValue(e.target.value)} size='small' placeholder={placeholder} className={className} />
}

const toRow = (role: RoleApiType): RoleRow => ({
  id: role.id,
  name: role.name,
  usersCount: role.users_count ?? 0,
  permissionsCount: role.permissions?.length ?? 0,
  createdDate: new Date(role.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  })
})

const isSuperAdminRole = (name: string) => {
  const normalized = name.toLowerCase().replace(/[_\s]+/g, '-')

  return normalized === 'super-admin' || normalized === 'superadmin'
}

const columnHelper = createColumnHelper<RoleRowWithAction>()

const RolesTable = ({ roles, loading, onRefresh, request }: Props) => {
  const [selectedRole, setSelectedRole] = useState('')
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<RoleRow[]>([])

  useEffect(() => {
    const mapped = roles.map(toRow)

    if (!selectedRole) {
      setData(mapped)
      return
    }

    setData(mapped.filter(item => item.name === selectedRole))
  }, [roles, selectedRole])

  const uniqueRoleNames = useMemo(() => Array.from(new Set(roles.map(role => role.name))), [roles])

  const handleDeleteRole = async (row: RoleRow) => {
    if (row.usersCount > 0) {
      return
    }

    if (!confirm('Delete this role?')) {
      return
    }

    await request(`/roles/${row.id}`, {
      method: 'DELETE'
    })

    await onRefresh()
  }

  const columns = useMemo<ColumnDef<RoleRowWithAction, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Role',
        cell: ({ row }) => (
          <Typography color='text.primary' className='font-medium capitalize'>
            {row.original.name}
          </Typography>
        )
      }),
      columnHelper.accessor('usersCount', {
        header: 'Users',
        cell: ({ row }) => <Chip size='small' variant='tonal' label={row.original.usersCount} />
      }),
      columnHelper.accessor('permissionsCount', {
        header: 'Permissions',
        cell: ({ row }) => <Chip size='small' color='info' variant='tonal' label={row.original.permissionsCount} />
      }),
      columnHelper.accessor('createdDate', {
        header: 'Created',
        cell: ({ row }) => <Typography>{row.original.createdDate}</Typography>
      }),
      columnHelper.accessor('action', {
        header: 'Actions',
        cell: ({ row }) => (
          <div className='flex items-center gap-0.5'>
            <IconButton
              size='small'
              disabled={row.original.usersCount > 0 || isSuperAdminRole(row.original.name)}
              onClick={() => void handleDeleteRole(row.original)}
            >
              <i className='ri-delete-bin-7-line text-textSecondary' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    [onRefresh, request]
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
    <Card>
      <CardContent className='flex justify-between flex-col items-start sm:flex-row sm:items-center max-sm:gap-4'>
        <Button variant='outlined' color='secondary' startIcon={<i className='ri-upload-2-line' />} className='max-sm:is-full'>
          Export
        </Button>
        <div className='flex flex-col !items-start max-sm:is-full sm:flex-row sm:items-center gap-4'>
          <DebouncedInput
            value={globalFilter ?? ''}
            className='max-sm:is-full min-is-[220px]'
            onChange={value => setGlobalFilter(String(value))}
            placeholder='Search Role'
          />
          <FormControl size='small' className='max-sm:is-full'>
            <InputLabel id='roles-app-role-select-label'>Select Role</InputLabel>
            <Select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              label='Select Role'
              id='roles-app-role-select'
              labelId='roles-app-role-select-label'
              className='min-is-[150px]'
            >
              <MenuItem value=''>Select Role</MenuItem>
              {uniqueRoleNames.map(roleName => (
                <MenuItem value={roleName} key={roleName}>
                  {roleName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
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

          {loading ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  Loading roles...
                </td>
              </tr>
            </tbody>
          ) : table.getFilteredRowModel().rows.length === 0 ? (
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
        rowsPerPageOptions={[10, 25, 50]}
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
  )
}

export default RolesTable
