"use client"

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Divider,
  Chip,
  Paper
} from '@mui/material'
import { useSession } from 'next-auth/react'

type Question = {
  id: number
  campaign_id: number | null
  question_text: string
  question_type: string
  options: string[] | null
  is_required: boolean
  is_nps_driver: boolean
  depends_on_question_id: number | null
  depends_on_answer: string | null
  sort_order: number
  system_field: string | null
  ask_reason_if_no: boolean
}

const QUESTION_TYPES = [
  { value: 'rating_1_to_5', label: 'Rating (1 to 5 Stars)' },
  { value: 'nps_0_to_10', label: 'NPS Score (0 to 10)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'text', label: 'Short Text Answer' },
  { value: 'single_choice', label: 'Single Choice (Dropdown/Radio)' },
  { value: 'multiple_choice', label: 'Multiple Choice (Checkboxes)' },
  { value: 'number', label: 'Number / Phone Input' },
  { value: 'date', label: 'Date Picker' },
  { value: 'long_text', label: 'Long Text Answer' }
]

const SYSTEM_FIELDS = [
  { value: '', label: 'None (Standard Question)' },
  { value: 'Customer Mobile', label: 'Customer Mobile (Required)' },
  { value: 'Customer Name', label: 'Customer Name' },
  { value: 'Customer Type', label: 'Customer Type (Gold SIP / Returning)' },
  { value: 'Feedback Category', label: 'Feedback Category' },
  { value: 'Additional Comments', label: 'Additional Comments' }
]

export default function ManageQuestionsPage() {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState<Partial<Question>>({
    question_text: '',
    question_type: 'rating_1_to_5',
    is_required: true,
    is_nps_driver: false,
    options: [],
    depends_on_question_id: null,
    depends_on_answer: '',
    sort_order: 0,
    system_field: '',
    ask_reason_if_no: false
  })

  // Options State (for single/multiple choice)
  const [newOption, setNewOption] = useState('')

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback-questions`, {
        headers: {
          'Accept': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      })
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch questions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleOpenAdd = () => {
    setIsEditing(false)
    setFormData({
      question_text: '',
      question_type: 'rating_1_to_5',
      is_required: true,
      is_nps_driver: false,
      options: [],
      depends_on_question_id: null,
      depends_on_answer: '',
      sort_order: questions.length,
      system_field: '',
      ask_reason_if_no: false
    })
    setOpenDialog(true)
  }

  const handleOpenEdit = (q: Question) => {
    setIsEditing(true)
    setFormData({ ...q })
    setOpenDialog(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback-questions/${id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      })
      if (res.ok) {
        fetchQuestions()
      }
    } catch (err) {
      console.error('Failed to delete question', err)
    }
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()]
    }))
    setNewOption('')
  }

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const url = isEditing ? `${baseUrl}/feedback-questions/${formData.id}` : `${baseUrl}/feedback-questions`
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        options: formData.options?.length ? formData.options : null,
        depends_on_question_id: formData.depends_on_question_id || null,
        depends_on_answer: formData.depends_on_answer || null,
        system_field: formData.system_field || null,
        ask_reason_if_no: formData.ask_reason_if_no || false
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setOpenDialog(false)
        fetchQuestions()
      } else {
        const errorData = await res.json()
        const errorMsg = errorData.errors ? JSON.stringify(errorData.errors) : (errorData.message || 'Something went wrong')
        alert('Validation Failed: ' + errorMsg)
      }
    } catch (err) {
      console.error('Failed to save question', err)
      alert('An error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  const needsOptions = formData.question_type === 'single_choice' || formData.question_type === 'multiple_choice'

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">Question Setup</Typography>
        <Button variant="contained" onClick={handleOpenAdd}>
          <i className="ri-add-line" style={{ marginRight: 8 }} /> Add Question
        </Button>
      </Box>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <List disablePadding>
          {questions.length === 0 ? (
            <ListItem>
              <ListItemText primary="No questions found." secondary="Add your first dynamic question to get started." />
            </ListItem>
          ) : (
            questions.map((q, index) => (
              <Box key={q.id}>
                <ListItem sx={{ py: 3 }}>
                  <Box 
                    sx={{ 
                      minWidth: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      bgcolor: 'primary.light', 
                      color: 'primary.contrastText',
                      fontWeight: 'bold',
                      mr: 3
                    }}
                  >
                    {q.sort_order}
                  </Box>
                  <ListItemText
                    disableTypography
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">{q.question_text}</Typography>
                        {q.is_required && <Chip label="Required" size="small" color="error" variant="outlined" />}
                        {q.is_nps_driver && <Chip label="NPS Driver" size="small" color="primary" />}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Type: <strong>{QUESTION_TYPES.find(t => t.value === q.question_type)?.label || q.question_type}</strong>
                        </Typography>
                        {q.options && q.options.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Options: {q.options.join(', ')}
                          </Typography>
                        )}
                        {q.system_field && (
                          <Typography variant="body2" color="info.main" mt={0.5}>
                            <i className="ri-link" /> Mapped to System Field: <strong>{q.system_field}</strong>
                          </Typography>
                        )}
                        {q.depends_on_question_id && (
                          <Typography variant="body2" color="warning.main" mt={0.5}>
                            <i className="ri-arrow-corner-down-right-line" /> Depends on Question ID #{q.depends_on_question_id} answering "{q.depends_on_answer}"
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleOpenEdit(q)} color="primary">
                      <i className="ri-edit-line" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(q.id)} color="error">
                      <i className="ri-delete-bin-line" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < questions.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </List>
      </Card>

      {/* Dialog for Add/Edit */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>{isEditing ? 'Edit Question' : 'Add New Question'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Question Text"
                value={formData.question_text}
                onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Question Type"
                value={formData.question_type}
                onChange={e => setFormData({ ...formData, question_type: e.target.value })}
              >
                {QUESTION_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Sort Order"
                value={formData.sort_order}
                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                helperText="Lower numbers appear first"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="System Field Mapping"
                value={formData.system_field || ''}
                onChange={e => setFormData({ ...formData, system_field: e.target.value })}
                helperText="Link this question to a core CRM field"
              >
                {SYSTEM_FIELDS.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Options Management for Multiple Choice */}
            {needsOptions && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Choice Options</Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" gap={2} mb={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label="New Option"
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAddOption()}
                    />
                    <Button variant="contained" onClick={handleAddOption} type="button">Add</Button>
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {(formData.options || []).map((opt, idx) => (
                      <Chip
                        key={idx}
                        label={opt}
                        onDelete={() => handleRemoveOption(idx)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {(!formData.options || formData.options.length === 0) && (
                      <Typography variant="body2" color="text.secondary">No options added yet.</Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Switches */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch checked={formData.is_required} onChange={e => setFormData({ ...formData, is_required: e.target.checked })} />}
                label="Required Question"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Switch checked={formData.is_nps_driver} onChange={e => setFormData({ ...formData, is_nps_driver: e.target.checked })} />}
                label="Is NPS Driver (Overall Score)"
              />
            </Grid>
            {formData.question_type === 'yes_no' && (
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={formData.ask_reason_if_no} onChange={e => setFormData({ ...formData, ask_reason_if_no: e.target.checked })} />}
                  label="Ask reason if answered No"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Conditional Logic (Optional)</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Only show this question if a previous question was answered a certain way.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Depends On Question"
                value={formData.depends_on_question_id || ''}
                onChange={e => setFormData({ ...formData, depends_on_question_id: parseInt(e.target.value) || null })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {questions.filter(q => q.id !== formData.id).map(q => (
                  <MenuItem key={q.id} value={q.id}>
                    #{q.id} - {q.question_text.substring(0, 30)}...
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="If Answer Is"
                placeholder="e.g. Yes"
                value={formData.depends_on_answer || ''}
                onChange={e => setFormData({ ...formData, depends_on_answer: e.target.value })}
                disabled={!formData.depends_on_question_id}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={submitting || !formData.question_text || (needsOptions && (!formData.options || formData.options.length === 0))}
          >
            {submitting ? 'Saving...' : 'Save Question'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
