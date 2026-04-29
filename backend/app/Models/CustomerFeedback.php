<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerFeedback extends Model
{
    use HasFactory;

    protected $table = 'customer_feedback';

    protected $fillable = [
        'customer_id',
        'invoice_id',
        'staff_id',
        'campaign_id',
        'comments',
        'sentiment_score',
        'status',
        'follow_up_required',
    ];

    public function answers()
    {
        return $this->hasMany(FeedbackAnswer::class, 'feedback_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function campaign()
    {
        return $this->belongsTo(FeedbackCampaign::class, 'campaign_id');
    }

    public function actions()
    {
        return $this->hasMany(FeedbackAction::class, 'feedback_id');
    }
}
