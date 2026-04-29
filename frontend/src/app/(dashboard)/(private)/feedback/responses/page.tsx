"use client"

import React, { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Box,
  CircularProgress,
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

export default function FeedbackResponsesPage() {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const fetchResponses = async (pageNum = 1) => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResponses()
  }, [accessToken])

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading && feedbacks.length === 0) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">Customer Responses</Typography>
      </Box>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Submitted On</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Follow-up Required</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No responses found.</TableCell>
              </TableRow>
            ) : (
              feedbacks.map((f) => (
                <React.Fragment key={f.id}>
                  <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleRow(f.id)}>
                        <i className={expandedRows[f.id] ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      {f.customer?.name || 'Guest'}
                      <Typography variant="body2" color="text.secondary">
                        {f.customer?.mobile || 'No Mobile'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(f.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={f.status} 
                        color={f.status === 'resolved' ? 'success' : f.status === 'action_taken' ? 'info' : 'warning'} 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      {f.follow_up_required ? (
                        <Chip size="small" label="Required" color="error" />
                      ) : (
                        <Chip size="small" label="No" color="default" />
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
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
    </Box>
  )
}
