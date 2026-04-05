'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// MUI Imports
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { signIn } from 'next-auth/react'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

// Type Imports
import type { Mode } from '@core/types'

// Component Imports
import Logo from '@components/layout/shared/Logo'

// Config Imports
import themeConfig from '@configs/themeConfig'

type ErrorType = {
  message: string[]
}

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'This field is required')),
  password: pipe(
    string(),
    nonEmpty('This field is required'),
    minLength(5, 'Password must be at least 5 characters long')
  )
})

const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f5f1e8',
    backgroundColor: 'rgba(20, 17, 14, 0.55)',
    borderRadius: '14px',
    '& fieldset': {
      borderColor: 'rgba(243, 201, 124, 0.35)'
    },
    '&:hover fieldset': {
      borderColor: 'rgba(243, 201, 124, 0.6)'
    },
    '&.Mui-focused fieldset': {
      borderColor: '#e7b85b',
      boxShadow: '0 0 0 3px rgba(231, 184, 91, 0.18)'
    }
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(245, 241, 232, 0.8)'
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#f0c876'
  },
  '& .MuiFormHelperText-root': {
    marginInlineStart: 0
  }
} as const

const Login = ({ mode }: { mode: Mode }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: 'admin@jewelleryscheme.test',
      password: 'password123'
    }
  })

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false
    })

    if (res && res.ok && res.error === null) {
      const redirectURL = searchParams.get('redirectTo') ?? '/'

      router.replace(redirectURL.startsWith('/') ? redirectURL : '/')
    } else if (res?.error) {
      try {
        const parsedError = JSON.parse(res.error) as ErrorType

        setErrorState(parsedError)
      } catch {
        setErrorState({ message: [res.error] })
      }
    }
  }

  return (
    <div
      className='relative flex min-bs-[100dvh] items-center justify-center overflow-hidden p-4 sm:p-8'
      style={{
        background:
          mode === 'dark'
            ? 'radial-gradient(circle at 14% 20%, #5a421e 0%, #1d1912 45%, #0f0c09 100%)'
            : 'radial-gradient(circle at 12% 18%, #c29a58 0%, #4f3920 42%, #1c1510 100%)'
      }}
    >
      <Box
        aria-hidden='true'
        className='pointer-events-none absolute inset-0'
        sx={{
          background:
            'radial-gradient(circle at 78% 20%, rgba(248,220,158,0.17) 0%, rgba(248,220,158,0) 35%), radial-gradient(circle at 82% 76%, rgba(234,170,79,0.18) 0%, rgba(234,170,79,0) 38%)'
        }}
      />
      <Box
        aria-hidden='true'
        className='pointer-events-none absolute -right-24 -top-24 hidden h-80 w-80 rounded-full border md:block'
        sx={{
          borderColor: 'rgba(240, 200, 120, 0.18)',
          boxShadow: 'inset 0 0 120px rgba(232, 180, 82, 0.1)'
        }}
      />
      <Box
        aria-hidden='true'
        className='pointer-events-none absolute -bottom-14 -left-20 hidden h-72 w-72 rounded-full border sm:block'
        sx={{
          borderColor: 'rgba(240, 200, 120, 0.15)'
        }}
      />

      <div className='absolute left-4 top-4 sm:left-8 sm:top-8'>
        <Logo color='#f7d898' />
      </div>

      <div className='grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
        <div className='hidden text-[#f7ead0] lg:block'>
          <Typography sx={{ letterSpacing: '0.16em', textTransform: 'uppercase', color: '#f0c876', mb: 1 }}>
            Jewellery Savings Platform
          </Typography>
          <Typography variant='h2' sx={{ fontWeight: 700, lineHeight: 1.2, maxWidth: 700 }}>
            Secure every gram, every installment, every customer trust point.
          </Typography>
          <Typography sx={{ mt: 3, maxWidth: 620, color: 'rgba(247, 234, 208, 0.88)', fontSize: '1.05rem' }}>
            Enter your workspace to monitor schemes, customer KYC status, live collections, and maturity timelines in a
            single premium console built for jewellery operations.
          </Typography>
          <div className='mt-8 flex flex-wrap gap-3'>
            <span className='rounded-full border border-[#f0c87666] bg-[#f0c87614] px-4 py-2 text-sm'>Gold Scheme Ops</span>
            <span className='rounded-full border border-[#f0c87666] bg-[#f0c87614] px-4 py-2 text-sm'>Daily Collection View</span>
            <span className='rounded-full border border-[#f0c87666] bg-[#f0c87614] px-4 py-2 text-sm'>KYC & Membership Control</span>
          </div>
        </div>

        <Card
          elevation={0}
          sx={{
            borderRadius: '22px',
            border: '1px solid rgba(247, 216, 152, 0.28)',
            background: 'linear-gradient(180deg, rgba(26,22,18,0.95) 0%, rgba(17,14,12,0.93) 100%)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 26px 80px rgba(0,0,0,0.45)'
          }}
        >
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Typography variant='h4' sx={{ color: '#f9eed8', fontWeight: 700 }}>
              {`Welcome to ${themeConfig.templateName}`}
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(245, 241, 232, 0.82)' }}>
              Sign in using your registered email or mobile number.
            </Typography>

            <Alert
              icon={false}
              sx={{
                mt: 3,
                borderRadius: '12px',
                border: '1px solid rgba(231, 184, 91, 0.4)',
                color: '#f9e9ca',
                backgroundColor: 'rgba(161, 113, 35, 0.17)'
              }}
            >
              <Typography variant='body2' sx={{ color: 'inherit' }}>
                Demo login: <span className='font-semibold'>admin@jewelleryscheme.test</span> / Password:{' '}
                <span className='font-semibold'>password123</span>
              </Typography>
            </Alert>

            <form
              noValidate
              autoComplete='off'
              onSubmit={handleSubmit(onSubmit)}
              className='mt-6 flex flex-col gap-5'
            >
              <Controller
                name='email'
                control={control}
                rules={{ required: true }}
                render={({ field }) => {
                  const emailErrorText =
                    (typeof errors.email?.message === 'string' ? errors.email.message : undefined) ||
                    errorState?.message?.[0] ||
                    ''

                  return (
                    <TextField
                      {...field}
                      fullWidth
                      autoFocus
                      label='Email or mobile'
                      onChange={e => {
                        field.onChange(e.target.value)
                        errorState !== null && setErrorState(null)
                      }}
                      sx={textFieldSx}
                      error={Boolean(emailErrorText)}
                      helperText={emailErrorText}
                    />
                  )
                }}
              />
              <Controller
                name='password'
                control={control}
                rules={{ required: true }}
                render={({ field }) => {
                  const passwordErrorText =
                    typeof errors.password?.message === 'string' ? errors.password.message : ''

                  return (
                    <TextField
                      {...field}
                      fullWidth
                      label='Password'
                      id='login-password'
                      type={isPasswordShown ? 'text' : 'password'}
                      onChange={e => {
                        field.onChange(e.target.value)
                        errorState !== null && setErrorState(null)
                      }}
                      sx={textFieldSx}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={handleClickShowPassword}
                                onMouseDown={e => e.preventDefault()}
                                aria-label='toggle password visibility'
                                sx={{ color: '#e8cf9a' }}
                              >
                                <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                      error={Boolean(passwordErrorText)}
                      helperText={passwordErrorText}
                    />
                  )
                }}
              />
              <div className='flex items-center justify-between gap-2'>
                <FormControlLabel
                  control={
                    <Checkbox
                      defaultChecked
                      sx={{
                        color: 'rgba(240, 200, 120, 0.7)',
                        '&.Mui-checked': {
                          color: '#f0c876'
                        }
                      }}
                    />
                  }
                  label={<span style={{ color: '#efe7d8' }}>Remember me</span>}
                />
                <Typography
                  className='text-end'
                  component={Link}
                  href='/forgot-password'
                  sx={{
                    color: '#f0c876',
                    '&:hover': {
                      color: '#f7d898'
                    }
                  }}
                >
                  Forgot password?
                </Typography>
              </div>
              <Button
                fullWidth
                type='submit'
                variant='contained'
                sx={{
                  borderRadius: '12px',
                  py: 1.2,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  color: '#2a1c08',
                  background: 'linear-gradient(90deg, #f0c876 0%, #dca646 100%)',
                  boxShadow: '0 12px 24px rgba(219, 161, 69, 0.26)',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #f6d690 0%, #e6b455 100%)'
                  }
                }}
              >
                Access Dashboard
              </Button>
              <div className='flex justify-center gap-2'>
                <Typography sx={{ color: 'rgba(245, 241, 232, 0.78)' }}>New on our platform?</Typography>
                <Typography
                  component={Link}
                  href='/register'
                  sx={{
                    color: '#f0c876',
                    fontWeight: 600,
                    '&:hover': {
                      color: '#f7d898'
                    }
                  }}
                >
                  Create an account
                </Typography>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
