<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FeedbackCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'trigger_event',
        'is_active',
    ];

    public function feedbacks()
    {
        return $this->hasMany(CustomerFeedback::class, 'campaign_id');
    }
}
