<?php

namespace App\Http\Controllers\API;

use App\Models\Membership;
use App\Models\User;
use App\Services\MembershipService;
use App\Services\OneClickEnrollmentService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MembershipController extends CrudController
{
    public function __construct(
        private readonly MembershipService $membershipService,
        private readonly OneClickEnrollmentService $oneClickEnrollmentService
    )
    {
    }

    protected string $modelClass = Membership::class;

    protected array $relations = ['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment'];

    protected array $filterable = ['customer_id', 'user_id', 'scheme_id', 'status'];

    protected array $sortable = ['id', 'start_date', 'maturity_date', 'total_paid', 'created_at', 'updated_at'];

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->membershipService->paginate($request->all()));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        return response()->json([
            'message' => 'Membership created successfully.',
            'data' => $this->membershipService->create($this->mutateValidatedData($validated, null)),
        ], 201);
    }

    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer.name' => ['nullable', 'string', 'max:255'],
            'customer.mobile' => ['required', 'string', 'max:20'],
            'customer.email' => ['nullable', 'email', 'max:255'],
            'customer.status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'customer.portal_password' => ['nullable', 'string', 'min:6'],
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'start_date' => ['required', 'date'],
            'payment.amount' => ['nullable', 'numeric', 'min:0'],
            'payment.gateway' => ['nullable', 'string', 'max:100'],
            'payment.transaction_id' => ['nullable', 'string', 'max:255'],
            'payment.payment_date' => ['nullable', 'date'],
            'payment.status' => ['nullable', Rule::in(['pending', 'success', 'failed', 'refunded'])],
        ]);

        return response()->json([
            'message' => 'Customer enrolled successfully.',
            'data' => $this->oneClickEnrollmentService->enroll($validated, $request->user()),
        ], 201);
    }

    protected function rules(?Model $model = null): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'start_date' => ['required', 'date'],
            'maturity_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'total_paid' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'completed', 'cancelled', 'redeemed'])],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (! isset($validated['user_id']) || empty($validated['user_id'])) {
            $validated['user_id'] = $this->resolveUserId((int) $validated['customer_id']);
        }

        return $validated;
    }

    private function resolveUserId(int $customerId): ?int
    {
        /** @var \App\Models\Customer|null $customer */
        $customer = \App\Models\Customer::query()->with('user')->find($customerId);

        if (! $customer) {
            return null;
        }

        if ($customer->user_id) {
            return $customer->user_id;
        }

        $query = User::query()->where(function ($builder) use ($customer) {
            if (! empty($customer->mobile)) {
                $builder->where('mobile', $customer->mobile);
            }

            if (! empty($customer->email)) {
                $builder->orWhere('email', $customer->email);
            }
        });

        return $query->value('id');
    }
}
