"use client"

import { useState, useEffect } from 'react'
import React from 'react'
import { Card, CardContent, Typography, Grid, Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, IconButton, Collapse } from '@mui/material'

export default function FeedbackDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [staffStats, setStaffStats] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [recentFeedbacks, setRecentFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  // Follow-up dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      
      const [statsRes, staffRes, feedbacksRes, recentRes] = await Promise.all([
        fetch(`${baseUrl}/feedback/stats`),
        fetch(`${baseUrl}/feedback/staff-performance`),
        fetch(`${baseUrl}/feedback?follow_up_required=true`),
        fetch(`${baseUrl}/feedback`)
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (staffRes.ok) setStaffStats(await staffRes.json())
      if (feedbacksRes.ok) {
        const fData = await feedbacksRes.json()
        setFeedbacks(fData.data || [])
      }
      if (recentRes.ok) {
        const rData = await recentRes.json()
        setRecentFeedbacks(rData.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch feedback data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenFollowUp = (feedback: any) => {
    setSelectedFeedback(feedback)
    setActionNotes('')
    setOpenDialog(true)
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleLogAction = async () => {
    if (!selectedFeedback) return
    setSubmittingAction(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
      const res = await fetch(`${baseUrl}/feedback/${selectedFeedback.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          action_type: 'called_customer',
          notes: actionNotes,
          status: 'resolved'
        })
      })

      if (res.ok) {
        setOpenDialog(false)
        fetchData() // Refresh dashboard
      }
    } catch (err) {
      console.error('Failed to log action', err)
    } finally {
      setSubmittingAction(false)
    }
  }

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">Customer Feedback Dashboard</Typography>
      
      {/* KPIs */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Overall NPS</Typography>
              <Typography variant="h3" color={stats?.nps > 50 ? 'success.main' : 'warning.main'}>
                {stats?.nps || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Avg Rating (out of 5)</Typography>
              <Typography variant="h3" color="primary.main">{stats?.avg_overall || '0.0'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Feedback</Typography>
              <Typography variant="h3">{stats?.total || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3} sx={{ borderRadius: 3, bgcolor: stats?.pending_follow_ups > 0 ? 'error.light' : 'success.light', color: 'white' }}>
            <CardContent>
              <Typography sx={{ color: 'white', opacity: 0.8 }} gutterBottom>Pending Follow-ups</Typography>
              <Typography variant="h3">{stats?.pending_follow_ups || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        {/* Staff Performance */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Staff Performance (Feedback Based)</Typography>
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Name</TableCell>
                  <TableCell align="right">Feedbacks</TableCell>
                  <TableCell align="right">Avg Rating</TableCell>
                  <TableCell align="right">Complaints (&lt;3 ⭐)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffStats.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">No staff feedback data yet.</TableCell></TableRow>
                ) : (
                  staffStats.map((row) => (
                    <TableRow key={row.staff_id}>
                      <TableCell component="th" scope="row">{row.staff?.name || 'Unknown'}</TableCell>
                      <TableCell align="right">{row.total_feedback}</TableCell>
                      <TableCell align="right">{Number(row.avg_rating).toFixed(1)}</TableCell>
                      <TableCell align="right">
                        {row.complaints > 0 ? <Chip color="error" size="small" label={row.complaints} /> : '0'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Action Center */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Action Center (Requires Follow-up)</Typography>
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer ID</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feedbacks.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center">No pending follow-ups! Great job.</TableCell></TableRow>
                ) : (
                  feedbacks.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>#{f.customer_id}</TableCell>
                      <TableCell>
                        {f.answers?.filter((a: any) => a.question?.is_nps_driver).map((a: any) => (
                          <Chip key={a.id} size="small" color={Number(a.answer_value) <= 3 ? 'error' : 'primary'} label={`${a.answer_value} ⭐`} sx={{ mr: 1 }} />
                        ))}
                        {(!f.answers || f.answers.length === 0) && <Chip size="small" label="No rating" />}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.comments || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Button variant="outlined" size="small" onClick={() => handleOpenFollowUp(f)}>Resolve</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* All Recent Responses */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>All Recent Responses</Typography>
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
                {recentFeedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No responses found.</TableCell>
                  </TableRow>
                ) : (
                  recentFeedbacks.map((f, index) => (
                    <React.Fragment key={f.id}>
                      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                        <TableCell>
                          <IconButton size="small" onClick={() => toggleRow(f.id)}>
                            <i className={expandedRows[f.id] ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          {index + 1}
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
        </Grid>
      </Grid>

      {/* Follow-up Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Customer Follow-up</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>Feedback Context:</Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="body2">
              <strong>Key Rating:</strong>{' '}
              {selectedFeedback?.answers?.filter((a: any) => a.question?.is_nps_driver).map((a: any) => a.answer_value).join(', ') || 'N/A'}
            </Typography>
            <Typography variant="body2"><strong>Comments:</strong> {selectedFeedback?.comments || 'None'}</Typography>
          </Paper>
          
          <TextField
            autoFocus
            margin="dense"
            label="Resolution Notes / Action Taken"
            fullWidth
            multiline
            rows={4}
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="e.g. Called customer and offered 10% discount on making charges for next visit."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleLogAction} variant="contained" disabled={submittingAction || !actionNotes}>
            {submittingAction ? 'Saving...' : 'Mark as Resolved'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
