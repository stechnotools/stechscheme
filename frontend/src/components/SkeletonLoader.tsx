'use client'

import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

export const SkeletonCard = ({ count = 3 }: { count?: number }) => (
  <Stack spacing={3}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} variant='outlined'>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
              <Stack spacing={1}>
                <Skeleton width={160} height={28} animation='wave' />
                <Skeleton width={120} height={18} animation='wave' />
              </Stack>
              <Stack direction='row' spacing={1}>
                <Skeleton width={70} height={24} animation='wave' />
                <Skeleton width={30} height={30} variant='circular' animation='wave' />
                <Skeleton width={30} height={30} variant='circular' animation='wave' />
              </Stack>
            </Stack>
            <Divider />
            <Stack direction='row' spacing={3}>
              {[1, 2, 3, 4].map(j => (
                <Stack key={j} spacing={0.5} sx={{ flex: 1 }}>
                  <Skeleton width={60} height={14} animation='wave' />
                  <Skeleton width={80} height={22} animation='wave' />
                </Stack>
              ))}
            </Stack>
            <Stack direction='row' spacing={1}>
              <Skeleton width={110} height={24} variant='rounded' animation='wave' />
              <Skeleton width={100} height={24} variant='rounded' animation='wave' />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Stack>
)

export const SkeletonTable = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <Stack spacing={1}>
    <Skeleton width='100%' height={40} animation='wave' variant='rounded' />
    {Array.from({ length: rows }).map((_, i) => (
      <Stack key={i} direction='row' spacing={2} sx={{ py: 1 }}>
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} height={28} animation='wave' sx={{ flex: 1 }} />
        ))}
      </Stack>
    ))}
  </Stack>
)

export const SkeletonDetail = () => (
  <Stack spacing={4}>
    <Stack spacing={1}>
      <Skeleton width={200} height={36} animation='wave' />
      <Skeleton width={300} height={20} animation='wave' />
    </Stack>
    <Divider />
    <Skeleton width={120} height={24} animation='wave' />
    <Stack spacing={3}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Stack key={i} direction='row' spacing={2} alignItems='center'>
          <Skeleton width={140} height={20} animation='wave' />
          <Skeleton width={200} height={20} animation='wave' />
        </Stack>
      ))}
    </Stack>
  </Stack>
)

export const SkeletonSectionHeader = () => (
  <Stack spacing={2}>
    <Stack direction='row' justifyContent='space-between' alignItems='center'>
      <Box>
        <Skeleton width={180} height={30} animation='wave' />
        <Skeleton width={120} height={18} animation='wave' sx={{ mt: 0.5 }} />
      </Box>
      <Skeleton width={100} height={28} variant='rounded' animation='wave' />
    </Stack>
    <Skeleton width='100%' height={4} animation='wave' variant='rounded' />
  </Stack>
)

export const SkeletonHeroCard = () => (
  <Card
    sx={{
      overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(133,77,14,0.3) 0%, rgba(217,119,6,0.3) 50%, rgba(251,191,36,0.3) 100%)'
    }}
  >
    <CardContent sx={{ p: { xs: 5, md: 7 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems='center'>
        <Stack spacing={1.5}>
          <Skeleton width={200} height={36} animation='wave' />
          <Skeleton width={500} height={20} animation='wave' />
        </Stack>
        <Skeleton width={140} height={38} variant='rounded' animation='wave' />
      </Stack>
    </CardContent>
  </Card>
)

export const SkeletonFilterBar = () => (
  <Card>
    <CardContent>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Skeleton width='100%' height={40} variant='rounded' animation='wave' />
        <Skeleton width={200} height={40} variant='rounded' animation='wave' />
        <Skeleton width={120} height={40} variant='rounded' animation='wave' />
      </Stack>
    </CardContent>
  </Card>
)

export const SkeletonStatCards = ({ count = 4 }: { count?: number }) => (
  <Grid container spacing={3}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton width={100} height={14} animation='wave' />
              <Skeleton width={120} height={32} animation='wave' />
              <Skeleton width={80} height={14} animation='wave' />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
)
