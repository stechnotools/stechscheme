'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type Branch = { id: number; name: string; city?: string | null }

type Appointment = {
  id: number
  requested_at: string
  purpose: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string | null
  branch?: { id: number; name: string; city?: string | null } | null
}

const statusColor = (status: Appointment['status']) =>
  status === 'confirmed' ? 'success' : status === 'completed' ? 'info' : status === 'cancelled' ? 'error' : 'warning'

const CustomerPortalAppointmentsPage = () => {
  const searchParams = useSearchParams()
  const [branches, setBranches] = useState<Branch[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [branchId, setBranchId] = useState<number | ''>('')
  const [dateTime, setDateTime] = useState('')
  const [purpose, setPurpose] = useState('general')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadAppointments = async () => {
    try {
      const response = await customerPortalRequest<{ data: Appointment[] }>('/customer-portal/appointments')
      setAppointments(response.data)
    } catch {
      // Non-fatal — booking form still works without history.
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<{ data: Branch[] }>('/customer-portal/branches')
        setBranches(response.data)

        const preselect = searchParams.get('branch_id')
        if (preselect) setBranchId(Number(preselect))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branches.')
      } finally {
        setLoading(false)
      }
    }

    void load()
    void loadAppointments()
  }, [searchParams])

  const handleSubmit = async () => {
    if (!branchId || !dateTime) {
      setError('Please select a branch and a date/time.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await customerPortalRequest<{ message: string }>('/customer-portal/appointments', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchId,
          requested_at: dateTime.replace('T', ' '),
          purpose,
          notes: notes.trim() || undefined
        })
      })

      setSuccess(response.message)
      setDateTime('')
      setNotes('')
      void loadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ mt: 6 }}>
        <CircularProgress />
      </Stack>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Book a Store Visit
              </Typography>

              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <FormControl fullWidth size='small'>
                <InputLabel>Branch</InputLabel>
                <Select label='Branch' value={branchId} onChange={event => setBranchId(Number(event.target.value))}>
                  {branches.map(branch => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name} {branch.city ? `(${branch.city})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size='small'
                type='datetime-local'
                label='Preferred Date & Time'
                value={dateTime}
                onChange={event => setDateTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth size='small'>
                <InputLabel>Purpose</InputLabel>
                <Select label='Purpose' value={purpose} onChange={event => setPurpose(event.target.value)}>
                  <MenuItem value='redemption'>Scheme Redemption</MenuItem>
                  <MenuItem value='purchase'>Purchase</MenuItem>
                  <MenuItem value='general'>General Enquiry</MenuItem>
                </Select>
              </FormControl>

              <TextField fullWidth size='small' multiline minRows={2} label='Notes (optional)' value={notes} onChange={event => setNotes(event.target.value)} />

              <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Booking...' : 'Book Appointment'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {appointments.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                Your Appointments
              </Typography>
              <Stack spacing={2}>
                {appointments.map(appointment => (
                  <Stack key={appointment.id} direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <div>
                      <Typography fontWeight={700}>{appointment.branch?.name || 'Branch'}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {new Date(appointment.requested_at).toLocaleString('en-IN')} • {appointment.purpose}
                      </Typography>
                      {appointment.notes ? <Typography variant='body2' color='text.secondary'>{appointment.notes}</Typography> : null}
                    </div>
                    <Chip size='small' label={appointment.status} color={statusColor(appointment.status)} sx={{ textTransform: 'capitalize' }} />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalAppointmentsPage
