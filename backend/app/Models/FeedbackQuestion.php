<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackQuestion extends Model
{
    protected $fillable = [
        'campaign_id',
        'question_text',
        'question_type',
        'options',
        'is_required',
        'is_nps_driver',
        'depends_on_question_id',
        'depends_on_answer',
        'sort_order',
        'system_field',
        'ask_reason_if_no',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_required' => 'boolean',
            'is_nps_driver' => 'boolean',
            'ask_reason_if_no' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
