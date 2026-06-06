'use client'

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Paper,
  InputAdornment,
  Tooltip,
  Chip
} from '@mui/material'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// --- Mock Data ---
const kpiData = [
  { title: 'Total Active Cards', value: '4,521', icon: 'ri-vip-crown-line', color: 'primary.main' },
  { title: 'Total Points Added', value: '125,000', icon: 'ri-add-circle-line', color: 'success.main' },
  { title: 'Total Redeemed', value: '45,200', icon: 'ri-arrow-down-circle-line', color: 'error.main' },
  { title: 'Outstanding Balance', value: '79,800', icon: 'ri-wallet-3-line', color: 'warning.main' }
]

const lineChartData = [
  { month: 'Jan', added: 4000, redeemed: 2400 },
  { month: 'Feb', added: 3000, redeemed: 1398 },
  { month: 'Mar', added: 2000, redeemed: 9800 },
  { month: 'Apr', added: 2780, redeemed: 3908 },
  { month: 'May', added: 1890, redeemed: 4800 },
  { month: 'Jun', added: 2390, redeemed: 3800 }
]

const barChartData = [
  { branch: 'Main Branch', points: 4000 },
  { branch: 'North Mall', points: 3000 },
  { branch: 'South Plaza', points: 2000 },
  { branch: 'West End', points: 2780 }
]

const pieChartData = [
  { name: 'Redeemed', value: 45200 },
  { name: 'Outstanding', value: 79800 }
]
const COLORS = ['#FF8042', '#00C49F']

const tableData = [
  { id: 1, cardNo: 'LC-1001', customer: 'John Doe', branch: 'Main Branch', opening: 500, added: 1500, redeemed: 200, closing: 1800 },
  { id: 2, cardNo: 'LC-1002', customer: 'Jane Smith', branch: 'North Mall', opening: 100, added: 500, redeemed: 600, closing: 0 },
  { id: 3, cardNo: 'LC-1003', customer: 'Mike Johnson', branch: 'South Plaza', opening: 2000, added: 0, redeemed: 500, closing: 1500 },
  { id: 4, cardNo: 'LC-1004', customer: 'Emily Davis', branch: 'West End', opening: 0, added: 300, redeemed: 0, closing: 300 },
  { id: 5, cardNo: 'LC-1005', customer: 'Chris Wilson', branch: 'Main Branch', opening: 1200, added: 400, redeemed: 1000, closing: 600 }
]

const ledgerMockData = [
  { id: 101, date: '2026-05-01', description: 'Purchase - Invoice #1024', type: 'Added', points: 500, balance: 2300 },
  { id: 102, date: '2026-04-20', description: 'Redemption - Invoice #0988', type: 'Redeemed', points: 200, balance: 1800 },
  { id: 103, date: '2026-03-15', description: 'Bonus Points - Scheme A', type: 'Added', points: 1500, balance: 2000 },
  { id: 104, date: '2026-01-10', description: 'Opening Balance', type: 'Added', points: 500, balance: 500 }
]

const LoyaltyReportPage = () => {
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('All')
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(tableData.map(row => row.id))
    } else {
      setSelectedRows([])
    }
  }

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  const openLedger = (customer: any) => {
    setSelectedCustomer(customer)
    setLedgerOpen(true)
  }

  return (
    <Grid container spacing={6}>
      {/* Filters & Actions Header */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                Loyalty Card Reports Dashboard
              </Typography>
              <Box display="flex" gap={2}>
                <Button variant="outlined" color="secondary" startIcon={<i className="ri-upload-cloud-line" />}>
                  Import
                </Button>
                <Button variant="contained" color="primary" startIcon={<i className="ri-file-excel-line" />}>
                  Export to Excel
                </Button>
              </Box>
            </Box>
            <Divider sx={{ my: 4 }} />
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Customer / Card No"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Branch"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <MenuItem value="All">All Branches</MenuItem>
                  <MenuItem value="Main Branch">Main Branch</MenuItem>
                  <MenuItem value="North Mall">North Mall</MenuItem>
                  <MenuItem value="South Plaza">South Plaza</MenuItem>
                  <MenuItem value="West End">West End</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField fullWidth size="small" type="date" label="From Date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField fullWidth size="small" type="date" label="To Date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 1 }}>
                <Button fullWidth variant="contained" color="primary" sx={{ height: '100%' }}>
                  <i className="ri-filter-3-line" />
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* KPI Cards */}
      {kpiData.map((kpi, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {kpi.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    backgroundColor: `${kpi.color}15`,
                    color: kpi.color,
                    p: 2,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={kpi.icon} style={{ fontSize: '24px' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Charts Section */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Points Added vs Redeemed (Monthly)" />
          <CardContent sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="added" stroke="#00C49F" strokeWidth={2} name="Added" />
                <Line type="monotone" dataKey="redeemed" stroke="#FF8042" strokeWidth={2} name="Redeemed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Points by Branch" />
          <CardContent sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="points" fill="#8884d8" name="Points" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Points Distribution" />
          <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Report Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <Box display="flex" justifyContent="space-between" alignItems="center" p={4} pb={0}>
            <CardHeader title="Detailed Points Report" sx={{ p: 0 }} />
            {selectedRows.length > 0 && (
              <Button variant="contained" color="error" size="small" startIcon={<i className="ri-delete-bin-line" />}>
                Delete Selected ({selectedRows.length})
              </Button>
            )}
          </Box>
          <CardContent>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table size="medium">
                <TableHead sx={{ backgroundColor: 'background.default' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedRows.length > 0 && selectedRows.length < tableData.length}
                        checked={selectedRows.length === tableData.length && tableData.length > 0}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Card No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Branch</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Opening</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>Added</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>Redeemed</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Closing</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.id} hover selected={selectedRows.includes(row.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                        />
                      </TableCell>
                      <TableCell>{row.cardNo}</TableCell>
                      <TableCell>{row.customer}</TableCell>
                      <TableCell>{row.branch}</TableCell>
                      <TableCell align="right">{row.opening}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>+{row.added}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>-{row.redeemed}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.closing}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Ledger">
                          <IconButton color="info" size="small" onClick={() => openLedger(row)}>
                            <i className="ri-history-line" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Ledger View Dialog */}
      <Dialog open={ledgerOpen} onClose={() => setLedgerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span" fontWeight="bold">
            Loyalty Ledger: {selectedCustomer?.customer} ({selectedCustomer?.cardNo})
          </Typography>
          <IconButton onClick={() => setLedgerOpen(false)}>
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'background.default' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Points</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerMockData.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>
                      <Chip 
                        label={log.type} 
                        color={log.type === 'Added' ? 'success' : 'error'} 
                        size="small" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ color: log.type === 'Added' ? 'success.main' : 'error.main', fontWeight: 500 }}>
                      {log.type === 'Added' ? '+' : '-'}{log.points}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{log.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLedgerOpen(false)} variant="outlined">Close</Button>
          <Button variant="contained" color="primary" startIcon={<i className="ri-printer-line" />}>
            Print Ledger
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default LoyaltyReportPage

