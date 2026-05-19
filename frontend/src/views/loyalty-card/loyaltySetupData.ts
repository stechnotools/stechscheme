export interface PointsSetupLine {
  id: string;
  from_amount: number;
  to_amount: number;
  points_for_every: number;
  points_to_be_earned: number;
  min_points_to_earn: number;
  max_points_to_earn: number;
  status: string;
}

export interface GroupWisePointsLine {
  id: string;
  group_code: string;
  group_name: string;
  calculation_basis: 'Amount' | 'Weight' | 'Both';
  from_amount: number;
  to_amount: number;
  points_for_every_amt: number;
  points_to_be_earned_amt: number;
  from_weight: number;
  to_weight: number;
  points_for_every_wt: number;
  points_to_be_earned_wt: number;
  status: string;
}

export interface CategoryLevelLine {
  id: string;
  level_code: string;
  level_name: string;
  from_points: number;
  to_points: number;
  reward_gift: string;
  gift_description: string;
  status: string;
}

export interface IntroducerBenefitLine {
  id: string;
  from_points: number;
  to_points: number;
  card_category: string;
  benefit_type: 'Value' | 'Percentage';
  benefit_points: number;
  reward_gift: boolean;
  gift_name: string;
  benefit_description: string;
  status: string;
}

export interface LoyaltySetup {
  id?: number;
  setup_code: string;
  setup_name: string;
  status: string;
  from_date: string | null;
  to_date: string | null;
  loyalty_program: string;
  currency: string;
  rounding_method: string;
  description: string;
  enable_loyalty_program: boolean;
  allow_earn_points: boolean;
  allow_redeem_points: boolean;
  allow_expiry: boolean;
  point_expiry_months: number | null;
  point_calculation_on: string;
  points_setup_overall: PointsSetupLine[];
  group_wise_points_setup: GroupWisePointsLine[];
  category_level_setup: CategoryLevelLine[];
  introducer_benefit_setup: IntroducerBenefitLine[];
  
  // Redeem / Benefits
  point_value: number;
  min_redeem_points: number;
  max_redeem_points_per_txn: number;
  allow_partial_redemption: boolean;
  allow_redemption_on_discounted: boolean;
  redemption_validation: string;

  // Others
  excluded_categories: string[];
  notify_on_credit: boolean;
  notify_on_redemption: boolean;
  notify_before_expiry: boolean;

  points_for_every_wt_global: number | null;
  points_to_be_earned_wt_global: number | null;
  allow_introducer_points: boolean;
  notes: string;
}
