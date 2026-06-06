'use client'

import React from 'react'
import { Grid, Card, CardHeader, CardContent, Typography } from '@mui/material'

const LoyaltyProgrammePage = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Loyalty Card' />
          <CardContent>
            <Typography variant='body1' sx={{ mb: 4 }}>
              Welcome to the Loyalty Card module.
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              This module is being prepared to help you manage customer loyalty cards, reward points, and membership tiers. 
              The configuration and tracking features will be available here soon.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default LoyaltyProgrammePage

