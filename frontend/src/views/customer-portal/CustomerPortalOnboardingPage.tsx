'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useKeenSlider } from 'keen-slider/react'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import classnames from 'classnames'
import AppKeenSlider from '@/libs/styles/AppKeenSlider'

const SLIDES = [
  {
    icon: 'ri-coins-line',
    title: 'Save Gold Every Month',
    body: 'Start small and stay consistent — build real gold value with flexible monthly installments.'
  },
  {
    icon: 'ri-secure-payment-line',
    title: 'Pay Digitally & Securely',
    body: 'UPI, cards, and net banking — pay your installments safely from anywhere, anytime.'
  },
  {
    icon: 'ri-vip-diamond-line',
    title: 'Redeem Jewellery at Best Value',
    body: 'Convert your savings into jewellery or cash at maturity, with full benefit value protected.'
  }
]

const ONBOARDING_SEEN_KEY = 'customer_onboarding_seen'

const CustomerPortalOnboardingPage = () => {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const isLast = step === SLIDES.length - 1

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: false,
    slides: { perView: 1 },
    slideChanged: slider => setStep(slider.track.details.rel)
  })

  const finish = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    }
    router.replace('/customer/login')
  }

  const goToStep = (index: number) => instanceRef.current?.moveToIdx(index)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 4,
        background: 'linear-gradient(135deg, #0f172a 0%, #155e75 55%, #f59e0b 100%)',
        color: 'common.white'
      }}
    >
      <Stack direction='row' justifyContent='flex-end' sx={{ minHeight: 36 }}>
        {!isLast && (
          <Button onClick={finish} sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Skip
          </Button>
        )}
      </Stack>

      <Box sx={{ flex: 1, display: 'flex' }}>
        <AppKeenSlider style={{ flex: 1 }}>
          <div ref={sliderRef} className='keen-slider' style={{ height: '100%' }}>
            {SLIDES.map(slide => (
              <div key={slide.title} className='keen-slider__slide'>
                <Stack spacing={4} alignItems='center' textAlign='center' sx={{ height: '100%', justifyContent: 'center', px: 2 }}>
                  <i className={slide.icon} style={{ fontSize: '4rem' }} />
                  <Typography variant='h4'>{slide.title}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 360 }}>{slide.body}</Typography>
                </Stack>
              </div>
            ))}
          </div>
        </AppKeenSlider>
      </Box>

      <Stack spacing={3}>
        <Stack
          direction='row'
          justifyContent='center'
          spacing={2}
          sx={{
            '& .MuiBadge-dot': { width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.35)', cursor: 'pointer' },
            '& .active .MuiBadge-dot': { bgcolor: 'common.white' }
          }}
        >
          {SLIDES.map((slide, index) => (
            <Badge key={slide.title} variant='dot' component='div' className={classnames({ active: step === index })} onClick={() => goToStep(index)} />
          ))}
        </Stack>
        <Button
          variant='contained'
          size='large'
          color='warning'
          onClick={() => (isLast ? finish() : instanceRef.current?.next())}
        >
          {isLast ? 'Get Started' : 'Next'}
        </Button>
      </Stack>
    </Box>
  )
}

export default CustomerPortalOnboardingPage
