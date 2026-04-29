"use client"

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Rating,
  Button,
  TextField,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Pagination
} from '@mui/material'
import { useSession } from 'next-auth/react'

type Question = {
  id: number
  question_text: string
  question_type: string
  options: string[] | null
  is_required: boolean
  depends_on_question_id: number | null
  depends_on_answer: string | null
  sort_order: number
  ask_reason_if_no?: boolean
}

export default function FeedbackCapturePage() {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  // Step 0: Responses List | Step 1: Part 1 (Q1) | Step 2: Part 2 (Q2-6) | Step 3: Part 3 (Q>6)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)

  // -- Step 0 State (List) --
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  // -- Step 1 State (Questions) --
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [reasons, setReasons] = useState<Record<number, string>>({})
  
  // Shared UI State
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Init Data
  useEffect(() => {
    fetchQuestions()
  }, [])

  useEffect(() => {
    if (step === 0) {
      fetchResponses(page)
    }
  }, [step, accessToken])

  // --- Step 0 Methods (Responses List) ---
  const fetchResponses = async (pageNum = 1) => {
    setListLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback?page=${pageNum}`, {
        headers: {
          'Accept': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        }
      })
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.data || [])
        setTotalPages(data.last_page || 1)
        setPage(data.current_page || 1)
      }
    } catch (err) {
      console.error('Failed to fetch responses', err)
    } finally {
      setListLoading(false)
    }
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleStartCapture = () => {
    setError('')
    setSuccess(false)
    setAnswers({})
    setReasons({})
    setStep(1)
  }

  // --- Step 1 & 2 Methods (Capture Form) ---
  const fetchQuestions = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback-questions`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch questions', err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const validateStep = (qList: Question[]) => {
    for (const q of qList) {
      if (q.is_required && !answers[q.id] && q.question_type !== 'multiple_choice') {
        setError(`Please answer: ${q.question_text}`)
        return false
      }
      if (q.is_required && q.question_type === 'multiple_choice' && (!answers[q.id] || answers[q.id].length === 0)) {
        setError(`Please select at least one option for: ${q.question_text}`)
        return false
      }
      if (q.question_type === 'yes_no' && q.ask_reason_if_no && answers[q.id] === 'No') {
        if (!reasons[q.id] || reasons[q.id].trim() === '') {
          setError(`Please provide a reason for answering "No" to: ${q.question_text}`)
          return false
        }
      }
    }
    return true
  }

  const handleNextStep = () => {
    const sortedVisible = questions.filter(isQuestionVisible).sort((a, b) => a.sort_order - b.sort_order)
    
    if (step === 1) {
      const page1Questions = sortedVisible.slice(0, 1)
      if (validateStep(page1Questions)) {
        setError('')
        // Check if there are questions for page 2, otherwise skip to 3 or submit
        setStep(2)
      }
    } else if (step === 2) {
      const page2Questions = sortedVisible.slice(1, 6)
      if (validateStep(page2Questions)) {
        setError('')
        setStep(3)
      }
    }
  }

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleReasonChange = (questionId: number, value: string) => {
    setReasons(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleCheckboxChange = (questionId: number, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || []
      if (checked) {
        return { ...prev, [questionId]: [...current, option] }
      } else {
        return { ...prev, [questionId]: current.filter((item: string) => item !== option) }
      }
    })
  }

  const isQuestionVisible = (q: Question) => {
    if (!q.depends_on_question_id) return true
    const parentAnswer = answers[q.depends_on_question_id]
    if (!parentAnswer) return false
    
    // For single/text matches
    if (typeof parentAnswer === 'string' && parentAnswer === q.depends_on_answer) return true
    
    // For arrays (multiple choice)
    if (Array.isArray(parentAnswer) && parentAnswer.includes(q.depends_on_answer)) return true

    // For numbers/booleans - convert to string for comparison
    if (String(parentAnswer) === String(q.depends_on_answer)) return true

    return false
  }

  const handleSubmit = async () => {
    // Validate all required questions before final submit
    const visibleQuestions = questions.filter(isQuestionVisible)
    if (!validateStep(visibleQuestions)) return

    setSubmitting(true)
    setError('')

    try {
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({
        question_id: Number(qId),
        answer_value: val,
        reason: reasons[Number(qId)] || null
      }))

      const payload = {
        answers: payloadAnswers
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to submit feedback')
      }

      setSuccess(true)
      
      // Reset form and go back to list after 3 seconds
      setTimeout(() => {
        setSuccess(false)
        setStep(0)
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestionInput = (q: Question) => {
    switch (q.question_type) {
      case 'rating_1_to_5':
        return (
          <Rating 
            size="large" 
            value={answers[q.id] ? Number(answers[q.id]) : 0} 
            onChange={(_, newValue) => handleAnswerChange(q.id, newValue)} 
            sx={{ fontSize: '3rem' }}
          />
        )
      case 'nps_0_to_10':
        return (
          <Box px={2}>
            <Slider
              value={answers[q.id] ? Number(answers[q.id]) : 5}
              min={0}
              max={10}
              step={1}
              marks
              valueLabelDisplay="on"
              onChange={(_, newValue) => handleAnswerChange(q.id, newValue)}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption">Not Likely</Typography>
              <Typography variant="caption">Extremely Likely</Typography>
            </Box>
          </Box>
        )
      case 'yes_no':
        return (
          <Box>
            <RadioGroup 
              row 
              value={answers[q.id] || ''} 
              onChange={e => handleAnswerChange(q.id, e.target.value)}
            >
              <FormControlLabel value="Yes" control={<Radio size="large" />} label="Yes" />
              <FormControlLabel value="No" control={<Radio size="large" />} label="No" />
            </RadioGroup>
            {q.ask_reason_if_no && answers[q.id] === 'No' && (
              <Box mt={2}>
                <TextField
                  fullWidth
                  required
                  label="Reason"
                  placeholder="Please specify why..."
                  value={reasons[q.id] || ''}
                  onChange={e => handleReasonChange(q.id, e.target.value)}
                />
              </Box>
            )}
          </Box>
        )
      case 'single_choice':
        return (
          <RadioGroup 
            value={answers[q.id] || ''} 
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          >
            {(q.options || []).map(opt => (
              <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
            ))}
          </RadioGroup>
        )
      case 'multiple_choice':
        return (
          <FormGroup>
            {(q.options || []).map(opt => (
              <FormControlLabel 
                key={opt}
                control={
                  <Checkbox 
                    checked={(answers[q.id] || []).includes(opt)}
                    onChange={(e) => handleCheckboxChange(q.id, opt, e.target.checked)}
                  />
                } 
                label={opt} 
              />
            ))}
          </FormGroup>
        )
      case 'text':
      case 'long_text':
        return (
          <TextField
            multiline={q.question_type === 'long_text'}
            rows={q.question_type === 'long_text' ? 3 : 1}
            fullWidth
            placeholder="Type your answer..."
            value={answers[q.id] || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        )
      case 'number':
        return (
          <TextField
            type="number"
            fullWidth
            placeholder="e.g. 9876543210"
            value={answers[q.id] || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
          />
        )
      case 'date':
        return (
          <TextField
            type="date"
            fullWidth
            value={answers[q.id] || ''}
            onChange={e => handleAnswerChange(q.id, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        )
      default:
        return null
    }
  }

  // --- Render logic ---
  
  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
        <Card elevation={6} sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: 500 }}>
          <Typography variant="h3" color="primary" gutterBottom>
            <i className="ri-checkbox-circle-fill"></i>
          </Typography>
          <Typography variant="h4" gutterBottom>Thank You!</Typography>
          <Typography variant="body1" color="text.secondary">
            Your feedback helps us shine brighter.
          </Typography>
        </Card>
      </Box>
    )
  }

  // List UI
  if (step === 0) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight="bold">Capture Kiosk & Responses</Typography>
          <Button variant="contained" color="primary" onClick={handleStartCapture} size="large">
            <i className="ri-add-circle-line" style={{ marginRight: 8 }} /> Start Capture Customer Feedback
          </Button>
        </Box>

        {listLoading && feedbacks.length === 0 ? (
          <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
              <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={50}></TableCell>
                  <TableCell>SL No.</TableCell>
                  <TableCell>Submit Date</TableCell>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Mobile No.</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Feedback</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Remark</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No responses found.</TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((f, index) => (
                    <React.Fragment key={f.id}>
                      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleRow(f.id)}>
                            <i className={expandedRows[f.id] ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          {(page - 1) * 15 + index + 1}
                        </TableCell>
                        <TableCell>
                          {new Date(f.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {f.customer?.name || 'Guest'}
                        </TableCell>
                        <TableCell>
                          {f.customer?.mobile || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            if (!f.answers) return '-'
                            const driver = f.answers.find((a: any) => a.question?.is_nps_driver)
                            if (driver) return `${driver.answer_value} ⭐`
                            const rating = f.answers.find((a: any) => a.question?.question_type === 'rating_1_to_5')
                            if (rating) return `${rating.answer_value} ⭐`
                            return '-'
                          })()}
                        </TableCell>
                        <TableCell>
                          {f.campaign?.name || '-'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.comments || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={f.status} 
                            color={f.status === 'resolved' ? 'success' : f.status === 'action_taken' ? 'info' : 'warning'} 
                            variant="outlined" 
                          />
                          {f.follow_up_required && <Chip size="small" label="Follow-up" color="error" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.actions && f.actions.length > 0 ? f.actions[f.actions.length - 1].notes : '-'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                          <Collapse in={expandedRows[f.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
                              <Typography variant="h6" gutterBottom component="div">
                                Questions & Answers
                              </Typography>
                              
                              {(!f.answers || f.answers.length === 0) ? (
                                <Typography variant="body2" color="text.secondary">No dynamic answers recorded.</Typography>
                              ) : (
                                <Table size="small" aria-label="answers">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Question</TableCell>
                                      <TableCell>Answer</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {f.answers.map((ans: any) => (
                                      <TableRow key={ans.id}>
                                        <TableCell component="th" scope="row">
                                          {ans.question?.question_text || `Question #${ans.question_id}`}
                                          {ans.question?.is_nps_driver && (
                                            <Chip size="small" label="NPS Driver" color="primary" sx={{ ml: 1, height: 20 }} />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {ans.answer_value || '-'}
                                          {ans.reason && (
                                            <Typography variant="body2" color="error.main" mt={1}>
                                              <strong>Reason:</strong> {ans.reason}
                                            </Typography>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}

                              {f.comments && (
                                <Box mt={3}>
                                  <Typography variant="subtitle2" color="text.secondary">Additional Comments:</Typography>
                                  <Typography variant="body1">{f.comments}</Typography>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(_, val) => fetchResponses(val)} 
                color="primary" 
              />
            </Box>
          )}
          </>
        )}
      </Box>
    )
  }

  // Capture Form UI
  if (loadingQuestions && step > 0) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh" py={4}>
      <Card elevation={6} sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 650, borderRadius: 4 }}>
        
        {step === 1 && (
          <Box display="flex" flexDirection="column" gap={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <IconButton onClick={() => setStep(0)}>
                <i className="ri-arrow-left-line"></i>
              </IconButton>
              <Box textAlign="center" flex={1}>
                <Typography variant="h4" gutterBottom fontWeight="bold">Customer Details</Typography>
                <Typography variant="body1" color="text.secondary">
                  Step 1 of 3
                </Typography>
              </Box>
              <Box width={40}></Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {(() => {
              const sortedVisible = questions.filter(isQuestionVisible).sort((a, b) => a.sort_order - b.sort_order)
              return sortedVisible.slice(0, 1).map(q => (
                <Box key={q.id} p={3} bgcolor="action.hover" borderRadius={3}>
                  <Typography variant="h6" gutterBottom>
                    {q.question_text} {q.is_required && <span style={{color:'red'}}>*</span>}
                  </Typography>
                  <Box mt={2}>
                    {renderQuestionInput(q)}
                  </Box>
                </Box>
              ))
            })()}

            <Button 
              variant="contained" 
              size="large" 
              onClick={handleNextStep} 
              sx={{ py: 2, fontSize: '1.2rem', borderRadius: 2 }}
            >
              Next Step
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box display="flex" flexDirection="column" gap={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <IconButton onClick={() => setStep(1)}>
                <i className="ri-arrow-left-line"></i>
              </IconButton>
              <Box textAlign="center" flex={1}>
                <Typography variant="h4" gutterBottom fontWeight="bold">Information</Typography>
                <Typography variant="body1" color="text.secondary">
                  Step 2 of 3
                </Typography>
              </Box>
              <Box width={40}></Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {(() => {
              const sortedVisible = questions.filter(isQuestionVisible).sort((a, b) => a.sort_order - b.sort_order)
              return sortedVisible.slice(1, 6).map(q => (
                <Box key={q.id} p={3} bgcolor="action.hover" borderRadius={3}>
                  <Typography variant="h6" gutterBottom>
                    {q.question_text} {q.is_required && <span style={{color:'red'}}>*</span>}
                  </Typography>
                  <Box mt={2}>
                    {renderQuestionInput(q)}
                  </Box>
                </Box>
              ))
            })()}

            <Button 
              variant="contained" 
              size="large" 
              onClick={handleNextStep} 
              sx={{ py: 2, fontSize: '1.2rem', borderRadius: 2 }}
            >
              Next Step
            </Button>
          </Box>
        )}

        {step === 3 && (
          <Box display="flex" flexDirection="column" gap={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <IconButton onClick={() => setStep(2)}>
                <i className="ri-arrow-left-line"></i>
              </IconButton>
              <Box textAlign="center" flex={1}>
                <Typography variant="h4" gutterBottom fontWeight="bold">Feedback Questions</Typography>
                <Typography variant="body1" color="text.secondary">
                  Step 3 of 3
                </Typography>
              </Box>
              <Box width={40}></Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {(() => {
              const sortedVisible = questions.filter(isQuestionVisible).sort((a, b) => a.sort_order - b.sort_order)
              return sortedVisible.slice(6).map(q => (
                <Box key={q.id} p={3} bgcolor="action.hover" borderRadius={3}>
                  <Typography variant="h6" gutterBottom>
                    {q.question_text} {q.is_required && <span style={{color:'red'}}>*</span>}
                  </Typography>
                  <Box mt={2}>
                    {renderQuestionInput(q)}
                  </Box>
                </Box>
              ))
            })()}

            <Button 
              variant="contained" 
              size="large" 
              onClick={handleSubmit} 
              disabled={submitting}
              sx={{ py: 2, fontSize: '1.2rem', borderRadius: 2 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Feedback'}
            </Button>
          </Box>
        )}
      </Card>
    </Box>
  )
}
