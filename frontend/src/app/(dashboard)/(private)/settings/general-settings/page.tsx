import SectionSettingsForm from '@views/settings/SectionSettingsForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const GeneralSettingsPage = () => {
  return (
    <SettingsTabsLayout activeTab='general-settings'>
      <SectionSettingsForm
        title='General Settings'
        subtitle='Manage core application preferences used across branches and operations.'
        section='general-settings'
        fields={[
          { key: 'currency', label: 'Currency', placeholder: 'INR' },
          { key: 'timezone', label: 'Timezone', placeholder: 'Asia/Kolkata' },
          { key: 'date_format', label: 'Date Format', placeholder: 'DD-MM-YYYY' },
          { key: 'language', label: 'Language', placeholder: 'English' }
        ]}
      />
    </SettingsTabsLayout>
  )
}

export default GeneralSettingsPage
