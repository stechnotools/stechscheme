<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FeedbackQuestion;

class FeedbackQuestionController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => FeedbackQuestion::query()
                ->orderBy('sort_order')
                ->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'campaign_id' => 'nullable|exists:feedback_campaigns,id',
            'question_text' => 'required|string|max:255',
            'question_type' => 'required|in:rating_1_to_5,nps_0_to_10,text,yes_no,single_choice,multiple_choice,number,date,long_text',
            'options' => 'nullable|array',
            'is_required' => 'boolean',
            'is_nps_driver' => 'boolean',
            'ask_reason_if_no' => 'boolean',
            'depends_on_question_id' => 'nullable|exists:feedback_questions,id',
            'depends_on_answer' => 'nullable|string',
            'sort_order' => 'integer',
            'system_field' => 'nullable|string',
        ]);

        $question = FeedbackQuestion::create($validated);

        return response()->json([
            'message' => 'Question created successfully',
            'data' => $question
        ], 201);
    }

    public function show(FeedbackQuestion $feedbackQuestion)
    {
        return response()->json(['data' => $feedbackQuestion]);
    }

    public function update(Request $request, FeedbackQuestion $feedbackQuestion)
    {
        $validated = $request->validate([
            'campaign_id' => 'nullable|exists:feedback_campaigns,id',
            'question_text' => 'sometimes|required|string|max:255',
            'question_type' => 'sometimes|required|in:rating_1_to_5,nps_0_to_10,text,yes_no,single_choice,multiple_choice,number,date,long_text',
            'options' => 'nullable|array',
            'is_required' => 'boolean',
            'is_nps_driver' => 'boolean',
            'ask_reason_if_no' => 'boolean',
            'depends_on_question_id' => 'nullable|exists:feedback_questions,id',
            'depends_on_answer' => 'nullable|string',
            'sort_order' => 'integer',
            'system_field' => 'nullable|string',
        ]);

        $feedbackQuestion->update($validated);

        return response()->json([
            'message' => 'Question updated successfully',
            'data' => $feedbackQuestion
        ]);
    }

    public function destroy(FeedbackQuestion $feedbackQuestion)
    {
        $feedbackQuestion->delete();
        return response()->json(['message' => 'Question deleted successfully']);
    }
}
