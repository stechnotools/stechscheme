<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackAnswer extends Model
{
    protected $fillable = [
        'feedback_id',
        'question_id',
        'answer_value',
    ];

    public function question()
    {
        return $this->belongsTo(FeedbackQuestion::class);
    }
}
