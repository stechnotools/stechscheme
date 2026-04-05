import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const PaymentGatewayPage = () => {
  return (
    <SettingsTabsLayout activeTab='payment-gateway'>
      <SectionSettingsForm
        title='Payment Gateway'
        subtitle='Configure merchant and gateway keys used for online payment collections.'
        section='payment-gateway'
        fields={[
          { key: 'provider', label: 'Provider', placeholder: 'PhonePe / Razorpay / Stripe' },
          { key: 'merchant_id', label: 'Merchant ID' },
          { key: 'api_key', label: 'API Key' },
          { key: 'api_secret', label: 'API Secret' }
        ]}
      />
    </SettingsTabsLayout>
  )
}

export default PaymentGatewayPage
