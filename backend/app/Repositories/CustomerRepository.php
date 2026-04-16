<?php

namespace App\Repositories;

use App\Models\Customer;

class CustomerRepository
{
    public function findWithRelations(int $id): Customer
    {
        return Customer::query()->with(['kyc'])->findOrFail($id);
    }
}
