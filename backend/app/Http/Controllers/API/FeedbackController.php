<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        $feedbacks = \App\Models\CustomerFeedback::with(['customer', 'staff', 'campaign', 'actions', 'answers.question'])
            ->when($request->status, function($q, $status) {
                return $q->where('status', $status);
            })
            ->when($request->follow_up_required, function($q, $followUp) {
                return $q->where('follow_up_required', filter_var($followUp, FILTER_VALIDATE_BOOLEAN));
            })
            ->latest()
            ->paginate(15);
            
        return response()->json($feedbacks);
    }

    public function stats()
    {
        $total = \App\Models\CustomerFeedback::count();
        $pendingFollowUps = \App\Models\CustomerFeedback::where('follow_up_required', true)
            ->whereIn('status', ['new', 'reviewed'])
            ->count();
            
        // Calculate NPS from dynamic answers where question is_nps_driver = true
        // Assuming nps_0_to_10 or rating_1_to_5
        $npsQuestions = \App\Models\FeedbackQuestion::where('is_nps_driver', true)->pluck('id');
        
        $promoters = 0;
        $detractors = 0;
        $totalNpsAnswers = 0;
        $sumOverall = 0;

        if ($npsQuestions->count() > 0) {
            $answers = \App\Models\FeedbackAnswer::whereIn('question_id', $npsQuestions)->get();
            $totalNpsAnswers = $answers->count();
            
            foreach($answers as $answer) {
                $val = floatval($answer->answer_value);
                $sumOverall += $val;
                
                // If 1-5 scale: 5=Promoter, 1-3=Detractor
                // If 0-10 scale: 9-10=Promoter, 0-6=Detractor
                // We'll guess scale based on value. If val > 5, assume 10 scale.
                $isTenScale = ($val > 5 || $answer->question->question_type === 'nps_0_to_10');
                
                if ($isTenScale) {
                    if ($val >= 9) $promoters++;
                    elseif ($val <= 6) $detractors++;
                } else {
                    if ($val == 5) $promoters++;
                    elseif ($val <= 3) $detractors++;
                }
            }
        }
        
        $avgOverall = $totalNpsAnswers > 0 ? ($sumOverall / $totalNpsAnswers) : 0;
        $nps = $totalNpsAnswers > 0 ? round((($promoters / $totalNpsAnswers) - ($detractors / $totalNpsAnswers)) * 100) : 0;

        return response()->json([
            'total' => $total,
            'avg_overall' => round($avgOverall, 1),
            'pending_follow_ups' => $pendingFollowUps,
            'nps' => $nps
        ]);
    }

    public function staffPerformance()
    {
        // Staff performance is tricky without a specific staff rating column.
        // We will just return the count of feedback attached to a staff member for now,
        // or we could look for a specific question text like 'staff' but that's brittle.
        $staffStats = \App\Models\CustomerFeedback::whereNotNull('staff_id')
            ->selectRaw('staff_id, count(*) as total_feedback')
            ->with('staff:id,name')
            ->groupBy('staff_id')
            ->get();
            
        return response()->json($staffStats);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'invoice_id' => 'nullable|integer',
            'staff_id' => 'nullable|exists:users,id',
            'campaign_id' => 'nullable|exists:feedback_campaigns,id',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:feedback_questions,id',
            'answers.*.answer_value' => 'nullable', 
            'answers.*.reason' => 'nullable|string',
        ]);
        
        $mobile = null;
        $name = null;
        $comments = null;
        
        // Fetch all questions for the answers to avoid N+1 queries and get system mappings
        $questionIds = collect($validated['answers'])->pluck('question_id');
        $questions = \App\Models\FeedbackQuestion::whereIn('id', $questionIds)->get()->keyBy('id');
        
        // Extract system fields from answers
        foreach ($validated['answers'] as $ans) {
            $question = $questions->get($ans['question_id']);
            if ($question && $question->system_field) {
                $val = $ans['answer_value'];
                if (is_array($val)) $val = implode(', ', $val);
                
                if ($question->system_field === 'Customer Mobile') $mobile = $val;
                if ($question->system_field === 'Customer Name') $name = $val;
                if ($question->system_field === 'Additional Comments') $comments = $val;
            }
        }
        
        // Fallbacks for backward compatibility (if sent in root)
        if (!$mobile) $mobile = $request->input('mobile');
        if (!$name) $name = $request->input('name');
        if (!$comments) $comments = $request->input('comments');

        if (!$mobile) {
            return response()->json([
                'message' => 'Mobile number is required. Please ensure a question is mapped to "Customer Mobile" in Question Setup and is filled in.'
            ], 422);
        }
        
        // Find or create customer
        $customer = \App\Models\Customer::firstOrCreate(
            ['mobile' => $mobile],
            ['name' => $name ?: 'Guest Customer', 'status' => 'active']
        );

        $feedback = \App\Models\CustomerFeedback::create([
            'customer_id' => $customer->id,
            'invoice_id' => $validated['invoice_id'] ?? null,
            'staff_id' => $validated['staff_id'] ?? null,
            'campaign_id' => $validated['campaign_id'] ?? null,
            'comments' => $comments,
            'status' => 'new',
            'follow_up_required' => false,
        ]);
        
        $followUpRequired = false;

        foreach ($validated['answers'] as $ans) {
            $val = is_array($ans['answer_value']) ? json_encode($ans['answer_value']) : $ans['answer_value'];
            
            \App\Models\FeedbackAnswer::create([
                'feedback_id' => $feedback->id,
                'question_id' => $ans['question_id'],
                'answer_value' => $val,
                'reason' => $ans['reason'] ?? null,
            ]);
            
            // Check if we need follow up
            $question = $questions->get($ans['question_id']);
            if ($question && $question->is_nps_driver && $val !== null) {
                $numVal = floatval($val);
                if (($question->question_type === 'nps_0_to_10' && $numVal <= 6) || 
                    ($question->question_type === 'rating_1_to_5' && $numVal <= 3)) {
                    $followUpRequired = true;
                }
            }
        }
        
        if ($followUpRequired) {
            $feedback->update(['follow_up_required' => true]);
        }
        
        // Auto send SMS and WhatsApp message
        try {
            $whatsappService = new \App\Services\WhatsAppService();
            $smsService = new \App\Services\SmsService();
            $msg = "Dear {$customer->name},\nThank you for visiting us! We appreciate your valuable feedback.";
            $whatsappService->sendMessage($mobile, $msg);
            $smsService->sendMessage($mobile, $msg);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send feedback thank you message: ' . $e->getMessage());
        }
        
        return response()->json(['message' => 'Feedback submitted successfully', 'data' => $feedback], 201);
    }

    public function addAction(Request $request, $id)
    {
        $validated = $request->validate([
            'action_type' => 'required|in:called_customer,offered_discount,apologized,rewarded,other',
            'notes' => 'nullable|string',
            'status' => 'required|in:new,reviewed,action_taken,resolved',
        ]);

        $feedback = \App\Models\CustomerFeedback::findOrFail($id);
        
        $action = $feedback->actions()->create([
            'action_taken_by' => $request->user() ? $request->user()->id : 1, // Fallback for dev if no auth
            'action_type' => $validated['action_type'],
            'notes' => $validated['notes'],
        ]);
        
        $feedback->update([
            'status' => $validated['status'],
            'follow_up_required' => $validated['status'] === 'resolved' ? false : $feedback->follow_up_required
        ]);
        
        return response()->json(['message' => 'Action logged successfully', 'data' => $action]);
    }
}
