'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type Branch = {
  id: number
  name: string
  city?: string | null
  phone?: string | null
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

type BranchWithDistance = Branch & { distanceKm?: number }

// Haversine distance — no Maps API key needed, just lat/lng arithmetic.
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CustomerPortalStoreLocatorPage = () => {
  const [branches, setBranches] = useState<BranchWithDistance[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<{ data: Branch[] }>('/customer-portal/branches')
        setBranches(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branches.')
      }
    }

    void load()
  }, [])

  const findNearby = () => {
    if (!branches) return
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device.')
      return
    }

    setLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords

        const withDistance = branches
          .map(branch => {
            if (branch.latitude == null || branch.longitude == null) return branch

            return {
              ...branch,
              distanceKm: distanceKm(latitude, longitude, Number(branch.latitude), Number(branch.longitude))
            }
          })
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))

        setBranches(withDistance)
        setLocating(false)
      },
      () => {
        setLocationError('Could not access your location. Showing all branches instead.')
        setLocating(false)
      }
    )
  }

  if (!branches) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Alert severity='info'>
          An interactive map view isn&apos;t available yet — this list uses your device&apos;s location to sort branches by distance,
          and the Navigate button opens your own maps app for directions.
        </Alert>

        {locationError ? <Alert severity='warning'>{locationError}</Alert> : null}

        <Button variant='contained' onClick={findNearby} disabled={locating} sx={{ alignSelf: 'flex-start' }} startIcon={<i className='ri-map-pin-line' />}>
          {locating ? 'Locating...' : 'Find Nearest Branch'}
        </Button>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {branches.length === 0 ? (
          <Alert severity='info'>No branches are available right now.</Alert>
        ) : (
          <Stack spacing={2}>
            {branches.map(branch => (
              <Card key={branch.id} variant='outlined'>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
                    <div>
                      <Typography variant='h6'>{branch.name}</Typography>
                      {branch.address ? <Typography color='text.secondary'>{branch.address}</Typography> : null}
                      {branch.city ? <Typography variant='body2' color='text.secondary'>{branch.city}</Typography> : null}
                      {branch.phone ? <Typography variant='body2' color='text.secondary'>{branch.phone}</Typography> : null}
                      {branch.distanceKm !== undefined ? (
                        <Typography variant='body2' fontWeight={700} sx={{ mt: 0.5 }}>
                          {branch.distanceKm.toFixed(1)} km away
                        </Typography>
                      ) : null}
                    </div>
                    <Stack direction='row' spacing={1} alignItems='flex-start'>
                      {branch.latitude != null && branch.longitude != null ? (
                        <Button
                          variant='outlined'
                          size='small'
                          component='a'
                          href={`https://maps.google.com/?q=${branch.latitude},${branch.longitude}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          startIcon={<i className='ri-navigation-line' />}
                        >
                          Navigate
                        </Button>
                      ) : null}
                      <Button
                        variant='contained'
                        size='small'
                        component={Link}
                        href={`/customer/panel/appointments?branch_id=${branch.id}`}
                      >
                        Book Visit
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalStoreLocatorPage
