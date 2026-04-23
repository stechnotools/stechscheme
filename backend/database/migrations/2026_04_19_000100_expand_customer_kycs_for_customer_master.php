<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customer_kycs', function (Blueprint $table) {
            $table->string('family_head')->nullable()->after('customer_id');
            $table->string('contact_name_1')->nullable()->after('family_head');
            $table->string('contact_name_2')->nullable()->after('contact_name_1');
            $table->string('mobile_no_1')->nullable()->after('contact_name_2');
            $table->string('mobile_no_2')->nullable()->after('mobile_no_1');
            $table->string('std_code')->nullable()->after('mobile_no_2');
            $table->string('phone_no_1')->nullable()->after('std_code');
            $table->string('phone_no_2')->nullable()->after('phone_no_1');
            $table->string('phone_no_3')->nullable()->after('phone_no_2');
            $table->string('phone_no_4')->nullable()->after('phone_no_3');
            $table->string('phone_no_5')->nullable()->after('phone_no_4');
            $table->string('fax_no_1')->nullable()->after('phone_no_5');
            $table->string('fax_no_2')->nullable()->after('fax_no_1');
            $table->string('email_1')->nullable()->after('fax_no_2');
            $table->string('email_2')->nullable()->after('email_1');
            $table->string('reference_1')->nullable()->after('email_2');
            $table->string('reference_2')->nullable()->after('reference_1');
            $table->string('block_no')->nullable()->after('reference_2');
            $table->string('building_name')->nullable()->after('block_no');
            $table->string('area')->nullable()->after('building_name');
            $table->string('country')->nullable()->after('pincode');
            $table->string('nominee_name')->nullable()->after('country');
            $table->string('nominee_relation')->nullable()->after('nominee_name');
            $table->string('nominee_mobile_1')->nullable()->after('nominee_relation');
            $table->string('nominee_mobile_2')->nullable()->after('nominee_mobile_1');
            $table->string('nominee_block_no')->nullable()->after('nominee_mobile_2');
            $table->string('nominee_building_name')->nullable()->after('nominee_block_no');
            $table->text('nominee_street')->nullable()->after('nominee_building_name');
            $table->string('nominee_area')->nullable()->after('nominee_street');
            $table->string('nominee_city')->nullable()->after('nominee_area');
            $table->string('nominee_zip_code')->nullable()->after('nominee_city');
            $table->string('nominee_state')->nullable()->after('nominee_zip_code');
            $table->string('nominee_country')->nullable()->after('nominee_state');
            $table->date('birth_date')->nullable()->after('nominee_country');
            $table->date('anniversary')->nullable()->after('birth_date');
            $table->string('spouse_name')->nullable()->after('anniversary');
            $table->string('child_name_1')->nullable()->after('spouse_name');
            $table->date('child_1_birth_date')->nullable()->after('child_name_1');
            $table->string('child_name_2')->nullable()->after('child_1_birth_date');
            $table->date('child_2_birth_date')->nullable()->after('child_name_2');
            $table->string('driving_licence')->nullable()->after('child_2_birth_date');
            $table->string('election_card')->nullable()->after('driving_licence');
            $table->string('passport_no')->nullable()->after('election_card');
            $table->string('it_pan_no')->nullable()->after('passport_no');
        });
    }

    public function down(): void
    {
        Schema::table('customer_kycs', function (Blueprint $table) {
            $table->dropColumn([
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
                'area',
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
            ]);
        });
    }
};
