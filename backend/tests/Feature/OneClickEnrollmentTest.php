<?php

namespace Tests\Feature;

use App\Models\Scheme;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OneClickEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_complete_one_click_enrollment_and_customer_can_login(): void
    {
        $staff = User::factory()->create([
            'mobile' => '9000000001',
            'status' => 'active',
        ]);

        Sanctum::actingAs($staff);

        $scheme = Scheme::query()->create([
            'name' => 'Akshaya Gold 11M',
            'code' => 'AK11',
            'installment_value' => 1000,
            'total_installments' => 11,
            'scheme_type' => 'gold',
            'grace_days' => 5,
            'allow_overdue' => true,
        ]);

        $response = $this->postJson('/api/memberships/enroll', [
            'customer' => [
                'name' => 'Portal Customer',
                'mobile' => '9876543210',
                'email' => 'portal.customer@example.com',
                'portal_password' => 'secret123',
                'status' => 'active',
            ],
            'scheme_id' => $scheme->id,
            'start_date' => '2026-04-13',
            'payment' => [
                'amount' => 1000,
                'gateway' => 'cash',
                'payment_date' => '2026-04-13',
                'status' => 'success',
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.customer.mobile', '9876543210')
            ->assertJsonPath('data.summary.total_installments', 11)
            ->assertJsonPath('data.summary.paid_installments', 1);

        $loginResponse = $this->postJson('/api/customer-auth/login', [
            'mobile' => '9876543210',
            'password' => 'secret123',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonPath('data.customer.mobile', '9876543210');
    }
}
