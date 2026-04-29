<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FeedbackAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'feedback_id',
        'action_taken_by',
        'action_type',
        'notes',
    ];

    public function feedback()
    {
        return $this->belongsTo(CustomerFeedback::class, 'feedback_id');
    }

    public function actionTakenBy()
    {
        return $this->belongsTo(User::class, 'action_taken_by');
    }
}
