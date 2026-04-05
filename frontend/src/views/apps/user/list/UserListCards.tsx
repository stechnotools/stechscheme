import Grid from '@mui/material/Grid'
import type { UsersType } from '@/types/apps/userTypes'
import type { UserDataType } from '@components/card-statistics/HorizontalWithSubtitle'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

const UserListCards = ({ users }: { users: UsersType[] }) => {
  const totalUsers = users.length
  const activeUsers = users.filter(user => user.status === 'active').length
  const pendingUsers = users.filter(user => user.status === 'pending').length
  const inactiveUsers = users.filter(user => user.status === 'inactive').length

  const data: UserDataType[] = [
    {
      title: 'Users',
      stats: totalUsers.toLocaleString(),
      avatarIcon: 'ri-group-line',
      avatarColor: 'primary',
      trend: 'positive',
      trendNumber: '100%',
      subtitle: 'Total Users'
    },
    {
      title: 'Active',
      stats: activeUsers.toLocaleString(),
      avatarIcon: 'ri-user-follow-line',
      avatarColor: 'success',
      trend: 'positive',
      trendNumber: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%',
      subtitle: 'Active Users'
    },
    {
      title: 'Pending',
      stats: pendingUsers.toLocaleString(),
      avatarIcon: 'ri-user-search-line',
      avatarColor: 'warning',
      trend: 'positive',
      trendNumber: totalUsers > 0 ? `${Math.round((pendingUsers / totalUsers) * 100)}%` : '0%',
      subtitle: 'Pending Users'
    },
    {
      title: 'Inactive',
      stats: inactiveUsers.toLocaleString(),
      avatarIcon: 'ri-user-unfollow-line',
      avatarColor: 'secondary',
      trend: 'negative',
      trendNumber: totalUsers > 0 ? `${Math.round((inactiveUsers / totalUsers) * 100)}%` : '0%',
      subtitle: 'Inactive Users'
    }
  ]

  return (
    <Grid container spacing={6}>
      {data.map((item, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle {...item} />
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards
