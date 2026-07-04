<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Defense-in-depth: membership_no is a customer-facing identifier and must
     * be unique, but nothing enforced that at the database level — a flawed
     * generator (process-static counter, since fixed in
     * OneClickEnrollmentService::buildMembershipIdentifiers) produced 14
     * duplicate pairs before this migration. All existing data was repaired
     * prior to adding this constraint.
     */
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->unique('membership_no');
        });
    }

    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropUnique(['membership_no']);
        });
    }
};
