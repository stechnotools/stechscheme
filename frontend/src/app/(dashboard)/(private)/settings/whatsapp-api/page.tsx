import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const WhatsAppApiPage = () => {
  return (
    <SettingsTabsLayout activeTab='whatsapp-api'>
      <SectionSettingsForm
        title='WhatsApp Service Setup'
        subtitle='Configure your WhatsApp service provider details and enable/disable the service.'
        section='whatsapp-api'
        fields={[
          { key: 'is_active', label: 'Enable WhatsApp Service', placeholder: 'true / false' },
          { key: 'provider', label: 'Provider', placeholder: 'Meta / Twilio / Gupshup' },
          { key: 'sender_number', label: 'Sender Number' },
          { key: 'access_token', label: 'Access Token' },
          { key: 'webhook_url', label: 'Webhook URL' }
        ]}
      />
    </SettingsTabsLayout>
  )
}

export default WhatsAppApiPage
