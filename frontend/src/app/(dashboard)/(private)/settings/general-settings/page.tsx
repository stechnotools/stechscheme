import GeneralSetupForm from '@views/settings/GeneralSetupForm'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const GeneralSettingsPage = () => {
  return (
    <SettingsTabsLayout activeTab='general-settings'>
      <GeneralSetupForm />
    </SettingsTabsLayout>
  )
}

export default GeneralSettingsPage
