'use client'

// React Imports
import { useEffect, useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

type PermissionDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  data?: {
    id: number
    name: string
  } | null
  loading?: boolean
  onSubmit: (payload: { id?: number; name: string }) => Promise<void>
}

const PermissionDialog = ({ open, setOpen, data, loading = false, onSubmit }: PermissionDialogProps) => {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(data?.name ?? '')
      setError(null)
    }
  }, [open, data])

  const handleClose = () => {
    if (!loading) {
      setOpen(false)
    }
  }

  const handleSave = async () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Permission name is required.')

      return
    }

    setError(null)
    await onSubmit({
      id: data?.id,
      name: trimmedName
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} closeAfterTransition={false} fullWidth maxWidth='sm'>
      <DialogTitle variant='h4' className='flex flex-col gap-2 text-center sm:pbs-16 sm:pbe-6 sm:pli-16'>
        {data ? 'Edit Permission' : 'Add New Permission'}
        <Typography component='span' className='flex flex-col text-center'>
          {data ? 'Update permission name.' : 'Create a new permission for role assignment.'}
        </Typography>
      </DialogTitle>
      <DialogContent className='overflow-visible pbs-0 sm:pbe-6 sm:pli-16'>
        <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4' disabled={loading}>
          <i className='ri-close-line text-textSecondary' />
        </IconButton>

        {data ? (
          <Alert severity='warning' className='mbe-5'>
            <AlertTitle>Warning</AlertTitle>
            Renaming permissions may affect authorization checks already in use.
          </Alert>
        ) : null}

        <TextField
          fullWidth
          label='Permission Route Name'
          variant='outlined'
          placeholder='e.g. customers.all'
          value={name}
          onChange={event => setName(event.target.value)}
          error={Boolean(error)}
          helperText={error || ' '}
          autoFocus
        />
      </DialogContent>
      <DialogActions className='max-sm:flex-col max-sm:items-center justify-center pbs-0 sm:pbe-16 sm:pli-16 gap-y-4'>
        <Button type='button' variant='contained' onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : data ? 'Update Permission' : 'Create Permission'}
        </Button>
        <Button onClick={handleClose} variant='outlined' disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PermissionDialog
