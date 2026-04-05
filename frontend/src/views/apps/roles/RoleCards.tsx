'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AvatarGroup from '@mui/material/AvatarGroup'
import IconButton from '@mui/material/IconButton'
import CustomAvatar from '@core/components/mui/Avatar'
import type { RoleApiType } from '@/types/apps/roleTypes'

type Props = {
  roles: RoleApiType[]
  loading: boolean
  onRefresh: () => Promise<void>
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}

const RoleCards = ({ roles, loading, onRefresh, request }: Props) => {
  const [open, setOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<{ id: number; name: string } | null>(null)
  const [roleName, setRoleName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cardData = useMemo(
    () =>
      roles.map(role => ({
        id: role.id,
        title: role.name,
        totalUsers: role.users_count ?? 0,
        avatarCount: Math.min(Math.max(role.users_count ?? 0, 1), 4)
      })),
    [roles]
  )

  const openCreateDialog = () => {
    setEditingRole(null)
    setRoleName('')
    setError(null)
    setOpen(true)
  }

  const openEditDialog = (id: number, name: string) => {
    setEditingRole({ id, name })
    setRoleName(name)
    setError(null)
    setOpen(true)
  }

  const handleSubmit = async () => {
    const trimmedName = roleName.trim()

    if (!trimmedName) {
      setError('Role name is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingRole) {
        await request(`/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: trimmedName })
        })
      } else {
        await request('/roles', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName })
        })
      }

      setOpen(false)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Grid container spacing={6}>
        {cardData.map(item => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
            <Card>
              <CardContent className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <Typography className='grow'>{`Total ${item.totalUsers} users`}</Typography>
                  <AvatarGroup total={item.totalUsers}>
                    {Array.from({ length: item.avatarCount }).map((_, index) => (
                      <CustomAvatar key={`${item.id}-${index}`} size={40}>
                        {item.title.charAt(0).toUpperCase()}
                      </CustomAvatar>
                    ))}
                  </AvatarGroup>
                </div>
                <div className='flex justify-between items-center'>
                  <div className='flex flex-col items-start gap-1'>
                    <Typography variant='h5' className='capitalize'>
                      {item.title}
                    </Typography>
                    {!isSuperAdminRole(item.title) ? (
                      <div className='flex items-center gap-2 flex-wrap'>
                        <Button variant='text' className='!px-0' onClick={() => openEditDialog(item.id, item.title)}>
                          Edit Role
                        </Button>
                        <Button
                          variant='text'
                          className='!px-0'
                          component={Link}
                          href={`/apps/roles/${item.id}/permissions`}
                        >
                          Assign Permissions
                        </Button>
                      </div>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        System role
                      </Typography>
                    )}
                  </div>
                  <IconButton disabled>
                    <i className='ri-file-copy-line text-secondary' />
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Card className='cursor-pointer bs-full' onClick={openCreateDialog}>
            <Grid container className='bs-full'>
              <Grid size={{ xs: 5 }}>
                <div className='flex items-end justify-center bs-full'>
                  <img alt='add-role' src='/images/illustrations/characters/9.png' height={130} />
                </div>
              </Grid>
              <Grid size={{ xs: 7 }}>
                <CardContent>
                  <div className='flex flex-col items-end gap-4 text-right'>
                    <Button variant='contained' size='small' onClick={openCreateDialog}>
                      Add Role
                    </Button>
                    <Typography>
                      Add new role, <br />
                      if it doesn&#39;t exist.
                    </Typography>
                  </div>
                </CardContent>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      <Dialog fullWidth maxWidth='sm' open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editingRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity='error' className='mb-4'>
              {error}
            </Alert>
          ) : null}
          <TextField
            fullWidth
            autoFocus
            className='mt-2'
            label='Role Name'
            value={roleName}
            onChange={e => setRoleName(e.target.value)}
            disabled={loading || submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' color='secondary' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RoleCards
  const isSuperAdminRole = (name: string) => {
    const normalized = name.toLowerCase().replace(/[_\s]+/g, '-')

    return normalized === 'super-admin' || normalized === 'superadmin'
  }
