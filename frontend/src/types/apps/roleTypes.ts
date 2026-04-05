export type RoleApiType = {
  id: number
  name: string
  users_count?: number
  permissions?: Array<{ id: number; name: string }>
  created_at: string
}
