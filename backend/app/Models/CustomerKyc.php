<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerKyc extends Model
{
    protected $fillable = [
        'customer_id',
        'family_head',
        'contact_name_1',
        'contact_name_2',
        'mobile_no_1',
        'mobile_no_2',
        'std_code',
        'phone_no_1',
        'phone_no_2',
        'phone_no_3',
        'phone_no_4',
        'phone_no_5',
        'fax_no_1',
        'fax_no_2',
        'email_1',
        'email_2',
        'reference_1',
        'reference_2',
        'block_no',
        'building_name',
        'aadhaar_number',
        'pan_number',
        'aadhaar_file',
        'pan_file',
        'photo',
        'address',
        'area',
        'city',
        'state',
        'pincode',
        'country',
        'nominee_name',
        'nominee_relation',
        'nominee_mobile_1',
        'nominee_mobile_2',
        'nominee_block_no',
        'nominee_building_name',
        'nominee_street',
        'nominee_area',
        'nominee_city',
        'nominee_zip_code',
        'nominee_state',
        'nominee_country',
        'birth_date',
        'anniversary',
        'spouse_name',
        'child_name_1',
        'child_1_birth_date',
        'child_name_2',
        'child_2_birth_date',
        'driving_licence',
        'election_card',
        'passport_no',
        'it_pan_no',
        'status',
        'remarks',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'birth_date' => 'date',
            'anniversary' => 'date',
            'child_1_birth_date' => 'date',
            'child_2_birth_date' => 'date',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
