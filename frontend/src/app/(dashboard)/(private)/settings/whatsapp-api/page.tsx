import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const WhatsAppApiPage = () => {
  return (
    <SettingsTabsLayout activeTab='whatsapp-api'>
      <SectionSettingsForm
        title='WhatsApp API'
        subtitle='Manage WhatsApp sender and authentication details for customer communication.'
        section='whatsapp-api'
        fields={[
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
