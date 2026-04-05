'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import CustomTabList from '@core/components/mui/TabList'

type SettingsTabKey =
  | 'company-info'
  | 'payment-gateway'
  | 'sms-gateway'
  | 'whatsapp-api'
  | 'notifications'
  | 'general-settings'

type Props = {
  activeTab: SettingsTabKey
  children: ReactNode
}

const SettingsTabsLayout = ({ activeTab, children }: Props) => {
  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList variant='scrollable' pill='true'>
            <Tab
              label='Company Info'
              icon={<i className='ri-building-line' />}
              iconPosition='start'
              value='company-info'
              component={Link}
              href='/settings/company-info'
            />
            <Tab
              label='Payment Gateway'
              icon={<i className='ri-bank-card-line' />}
              iconPosition='start'
              value='payment-gateway'
              component={Link}
              href='/settings/payment-gateway'
            />
            <Tab
              label='WhatsApp API'
              icon={<i className='ri-whatsapp-line' />}
              iconPosition='start'
              value='whatsapp-api'
              component={Link}
              href='/settings/whatsapp-api'
            />
            <Tab
              label='SMS Gateway'
              icon={<i className='ri-message-2-line' />}
              iconPosition='start'
              value='sms-gateway'
              component={Link}
              href='/settings/sms-gateway'
            />
            <Tab
              label='Notifications'
              icon={<i className='ri-notification-4-line' />}
              iconPosition='start'
              value='notifications'
              component={Link}
              href='/settings/notifications'
            />
            <Tab
              label='General Settings'
              icon={<i className='ri-settings-3-line' />}
              iconPosition='start'
              value='general-settings'
              component={Link}
              href='/settings/general-settings'
            />
          </CustomTabList>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TabPanel value={activeTab} className='p-0'>
            {children}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default SettingsTabsLayout
