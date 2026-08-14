<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\LoyaltySetup;
use App\Models\ActivityLog;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'customer_code',
        'name',
        'mobile',
        'alternate_mobile',
        'email',
        'status',
        'portal_enabled',
        'portal_enabled_at',
        'feedback',
        'loyalty_card_no',
        'old_card_no',
        'join_date',
        'card_status',
        'category',
        'card_issue_date',
        'card_expiry_date',
        'introducer_card_no',
        'introducer_name',
        'spouse_name',
        'spouse_dob',
        'child1_name',
        'child1_dob',
        'child2_name',
        'child2_dob',
        'image',
        'opening_points',
        'loyalty_points_balance',
        'lifetime_points',
        'gift_status',
        'gift_achieved',
    ];

    protected function casts(): array
    {
        return [
            'portal_enabled' => 'boolean',
            'portal_enabled_at' => 'datetime',
            'join_date' => 'date',
            'card_issue_date' => 'date',
            'card_expiry_date' => 'date',
            'spouse_dob' => 'date',
            'child1_dob' => 'date',
            'child2_dob' => 'date',
            'opening_points' => 'decimal:2',
            'loyalty_points_balance' => 'decimal:2',
            'lifetime_points' => 'decimal:2',
            'deleted_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function kyc()
    {
        return $this->hasOne(CustomerKyc::class);
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }

    public function relativeRequestsAsPrimary()
    {
        return $this->hasMany(CustomerRelativeRequest::class, 'primary_customer_id');
    }

    public function relativeRequestsAsRelative()
    {
        return $this->hasMany(CustomerRelativeRequest::class, 'relative_customer_id');
    }

    public function mergesAsPrimary()
    {
        return $this->hasMany(CustomerMerge::class, 'primary_customer_id');
    }

    public function mergesAsDuplicate()
    {
        return $this->hasMany(CustomerMerge::class, 'duplicate_customer_id');
    }

    /**
     * Match a Customer by either their primary or alternate mobile number.
     * Used by the merge-tool matching logic and by shared-mobile lookups —
     * a mobile number is not guaranteed to identify a unique Customer, since
     * one person can register two numbers (merge) or one number can be
     * shared by several people (household).
     */
    public function scopeForMobile($query, string $mobile)
    {
        return $query->where('mobile', $mobile)->orWhere('alternate_mobile', $mobile);
    }

    public function checkAndApplyLoyaltyUpgrade()
    {
        $setup = LoyaltySetup::orderByDesc('id')->first();
        if (!$setup || empty($setup->category_level_setup)) return null;

        $levels = $setup->category_level_setup;
        $achievements = [];

        while (true) {
            $currentPoints = (float)$this->loyalty_points_balance;
            $currentCategory = $this->category;
            $upgradedInThisPass = false;

            foreach ($levels as $index => $level) {
                if ($level['level_code'] === $currentCategory) {
                    $toPoints = (float)($level['to_points'] ?? 0);
                    if ($currentPoints >= $toPoints && $toPoints > 0) {
                        $nextLevel = $levels[$index + 1] ?? null;
                        if ($nextLevel) {
                            $oldCat = $this->category;
                            $this->category = $nextLevel['level_code'];
                            $this->gift_achieved = $level['gift_description'] ?? 'Eligible Gift';
                            $this->gift_status = 'Pending';
                            $this->save();
                            
                            $ach = [
                                'upgraded' => true,
                                'old_category' => $oldCat,
                                'new_category' => $this->category,
                                'new_level_name' => $nextLevel['level_name'],
                                'gift' => $level['gift_description'] ?? 'Eligible Gift'
                            ];
                            $achievements[] = $ach;

                            ActivityLog::create([
                                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                                'module' => 'Loyalty Card',
                                'sub_module' => 'Auto Upgrade',
                                'action' => 'Update',
                                'description' => "Customer {$this->name} upgraded to {$nextLevel['level_name']}. Gift: {$level['gift_description']}",
                                'metadata' => $ach
                            ]);
                            $upgradedInThisPass = true;
                        } else {
                            $this->gift_achieved = $level['gift_description'] ?? 'Final Gift';
                            $this->gift_status = 'Pending';
                            $this->save();

                            $ach = [
                                'upgraded' => false,
                                'gift' => $level['gift_description'] ?? 'Final Gift'
                            ];
                            $achievements[] = $ach;
                            ActivityLog::create([
                                'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
                                'module' => 'Loyalty Card',
                                'sub_module' => 'Gift Achievement',
                                'action' => 'Update',
                                'description' => "Customer {$this->name} achieved gift: {$level['gift_description']}",
                                'metadata' => $ach
                            ]);
                        }
                    }
                    break;
                }
            }
            if (!$upgradedInThisPass) break;
        }

        return count($achievements) > 0 ? end($achievements) : null;
    }
}
