import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const SmsGatewayPage = () => {
  return (
    <SettingsTabsLayout activeTab='sms-gateway'>
      <SectionSettingsForm
        title='SMS Gateway'
        subtitle='Configure SMS provider credentials and sender details for OTP and reminders.'
        section='sms-gateway'
        fields={[
          { key: 'provider', label: 'Provider', placeholder: 'Twilio / MSG91 / Fast2SMS' },
          { key: 'sender_id', label: 'Sender ID' },
          { key: 'api_key', label: 'API Key' },
          { key: 'route', label: 'Route', placeholder: 'Transactional / Promotional' }
        ]}
      />
    </SettingsTabsLayout>
  )
}

export default SmsGatewayPage
