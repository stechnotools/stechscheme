'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type SupportMessage = {
  id: number
  subject: string
  message: string
  status: 'open' | 'resolved'
  created_at: string
}

const CustomerPortalSupportPage = () => {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [history, setHistory] = useState<SupportMessage[]>([])

  const loadHistory = async () => {
    try {
      const response = await customerPortalRequest<{ data: SupportMessage[] }>('/customer-portal/support')
      setHistory(response.data)
    } catch {
      // History is a nice-to-have — don't block the form on it.
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await customerPortalRequest<{ message: string }>('/customer-portal/support', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() })
      })

      setSuccess(response.message)
      setSubject('')
      setMessage('')
      void loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your message.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h6'>Contact Support</Typography>
                <Typography color='text.secondary'>Have a question or issue? Send us a message and our team will respond.</Typography>
              </div>

              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <TextField fullWidth size='small' label='Subject' value={subject} onChange={event => setSubject(event.target.value)} />
              <TextField
                fullWidth
                multiline
                minRows={4}
                label='Message'
                value={message}
                onChange={event => setMessage(event.target.value)}
              />
              <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Sending...' : 'Send Message'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                Your Messages
              </Typography>
              <Stack spacing={2}>
                {history.map((item, index) => (
                  <Box key={item.id}>
                    {index > 0 && <Divider sx={{ mb: 2 }} />}
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                      <div>
                        <Typography fontWeight={700}>{item.subject}</Typography>
                        <Typography variant='body2' color='text.secondary'>{item.message}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {new Date(item.created_at).toLocaleDateString('en-IN')}
                        </Typography>
                      </div>
                      <Chip size='small' label={item.status} color={item.status === 'resolved' ? 'success' : 'warning'} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalSupportPage
