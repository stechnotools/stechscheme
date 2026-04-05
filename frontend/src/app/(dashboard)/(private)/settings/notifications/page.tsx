import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const NotificationsPage = () => {
  return (
    <SettingsTabsLayout activeTab='notifications'>
      <SectionSettingsForm
        title='Notifications'
        subtitle='Control reminder and alert preferences for schemes, payments, and operational events.'
        section='notifications'
        fields={[
          { key: 'payment_reminder_days', label: 'Payment Reminder Days', placeholder: 'e.g. 3' },
          { key: 'maturity_alert_days', label: 'Maturity Alert Days', placeholder: 'e.g. 7' },
          { key: 'email_notifications', label: 'Email Notifications', placeholder: 'enabled / disabled' },
          { key: 'whatsapp_notifications', label: 'WhatsApp Notifications', placeholder: 'enabled / disabled' }
        ]}
      />
    </SettingsTabsLayout>
  )
}

export default NotificationsPage
