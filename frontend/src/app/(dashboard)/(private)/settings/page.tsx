import CompanyInfoSettings from '@views/settings/CompanyInfoSettings'
import SettingsTabsLayout from '@views/settings/SettingsTabsLayout'

const SettingsPage = () => {
  return (
    <SettingsTabsLayout activeTab='company-info'>
      <CompanyInfoSettings />
    </SettingsTabsLayout>
  )
}

export default SettingsPage
