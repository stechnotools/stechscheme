import { getApiBaseUrl } from '@/libs/runtimeConfig'

export type LoyaltyCardCategory = {
  id?: number
  category_code: string
  category_name: string
  description?: string | null
  category_type: string
  card_color?: string | null
  card_design?: string | null
  card_prefix?: string | null
  card_number_length: number
  earning_based_on: string
  points_for_every: number | string
  points_to_be_earned: number | string
  min_points_to_redeem: number | string
  point_expiry_months: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
  allow_downgrade: boolean
  allow_upgrade: boolean
  created_at?: string
  updated_at?: string
}

export type LoyaltyCardCategoriesResponse = LoyaltyCardCategory[]

export const resolveBackendApiUrl = getApiBaseUrl
