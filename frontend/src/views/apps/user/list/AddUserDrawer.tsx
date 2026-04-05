import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import FormHelperText from '@mui/material/FormHelperText'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { Controller, useForm } from 'react-hook-form'
import type { UsersType } from '@/types/apps/userTypes'

type Props = {
  open: boolean
  handleClose: () => void
  roles: string[]
  editingUser?: UsersType | null
  loading?: boolean
  onSubmitUser: (payload: {
    userId?: number
    name: string
    email: string
    mobile: string
    password?: string
    status: string
    role_names: string[]
  }) => Promise<void>
}

type FormValues = {
  name: string
  email: string
  mobile: string
  password: string
  role: string
  status: string
}

const AddUserDrawer = ({ open, handleClose, roles, editingUser = null, loading = false, onSubmitUser }: Props) => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      password: '',
      role: roles[0] ?? '',
      status: 'active'
    }
  })

  useEffect(() => {
    if (!open) return

    if (editingUser) {
      reset({
        name: editingUser.fullName || '',
        email: editingUser.email === '-' ? '' : editingUser.email,
        mobile: editingUser.contact === '-' ? '' : editingUser.contact,
        password: '',
        role: editingUser.role || roles[0] || '',
        status: editingUser.status || 'active'
      })
    } else {
      reset({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: roles[0] ?? '',
        status: 'active'
      })
    }
  }, [open, editingUser, roles, reset])

  const handleReset = () => {
    setSubmitError(null)
    reset()
    handleClose()
  }

  const submit = async (data: FormValues) => {
    setSubmitError(null)

    try {
      await onSubmitUser({
        userId: editingUser?.id,
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        password: data.password.trim() ? data.password : undefined,
        status: data.status,
        role_names: data.role ? [data.role] : []
      })

      handleReset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create user.')
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleReset}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 400 } } }}
    >
      <div className='flex items-center justify-between pli-5 plb-4'>
        <Typography variant='h5'>{editingUser ? 'Edit User' : 'Add New User'}</Typography>
        <IconButton size='small' onClick={handleReset}>
          <i className='ri-close-line text-2xl' />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>
        <form onSubmit={handleSubmit(submit)} className='flex flex-col gap-5'>
          {submitError ? <FormHelperText error>{submitError}</FormHelperText> : null}
          <Controller
            name='name'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} fullWidth label='Full Name' placeholder='John Doe' error={Boolean(errors.name)} helperText={errors.name ? 'This field is required.' : ''} />
            )}
          />
          <Controller
            name='email'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} fullWidth type='email' label='Email' placeholder='john@example.com' error={Boolean(errors.email)} helperText={errors.email ? 'This field is required.' : ''} />
            )}
          />
          <Controller
            name='mobile'
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} fullWidth label='Mobile' placeholder='9876543210' error={Boolean(errors.mobile)} helperText={errors.mobile ? 'This field is required.' : ''} />
            )}
          />
          <Controller
            name='password'
            control={control}
            rules={{ required: !editingUser, minLength: 8 }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type='password'
                label='Password'
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                error={Boolean(errors.password)}
                helperText={
                  errors.password ? 'Minimum 8 characters required.' : editingUser ? 'Optional while editing.' : ''
                }
              />
            )}
          />
          <FormControl fullWidth error={Boolean(errors.role)}>
            <InputLabel id='role-select'>Select Role</InputLabel>
            <Controller
              name='role'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select label='Select Role' labelId='role-select' {...field}>
                  {roles.map(roleName => (
                    <MenuItem key={roleName} value={roleName}>
                      {roleName}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.role ? <FormHelperText>This field is required.</FormHelperText> : null}
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id='status-select'>Select Status</InputLabel>
            <Controller
              name='status'
              control={control}
              render={({ field }) => (
                <Select label='Select Status' labelId='status-select' {...field}>
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='inactive'>Inactive</MenuItem>
                  <MenuItem value='blocked'>Blocked</MenuItem>
                </Select>
              )}
            />
          </FormControl>
          <div className='flex items-center gap-4'>
            <Button variant='contained' type='submit' disabled={isSubmitting || loading}>
              {isSubmitting ? 'Saving...' : editingUser ? 'Update' : 'Submit'}
            </Button>
            <Button variant='outlined' color='error' type='button' onClick={handleReset}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  )
}

export default AddUserDrawer
