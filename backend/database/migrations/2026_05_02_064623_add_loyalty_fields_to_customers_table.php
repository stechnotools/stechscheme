<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('loyalty_card_no')->nullable()->after('email');
            $table->string('old_card_no')->nullable()->after('loyalty_card_no');
            $table->date('join_date')->nullable()->after('old_card_no');
            $table->string('card_status')->default('active')->after('join_date');
            $table->string('category')->nullable()->after('card_status');
            $table->date('card_issue_date')->nullable()->after('category');
            $table->date('card_expiry_date')->nullable()->after('card_issue_date');
            $table->string('introducer_card_no')->nullable()->after('card_expiry_date');
            $table->string('introducer_name')->nullable()->after('introducer_card_no');
            
            // Relationships
            $table->string('spouse_name')->nullable()->after('introducer_name');
            $table->date('spouse_dob')->nullable()->after('spouse_name');
            $table->string('child1_name')->nullable()->after('spouse_dob');
            $table->date('child1_dob')->nullable()->after('child1_name');
            $table->string('child2_name')->nullable()->after('child1_dob');
            $table->date('child2_dob')->nullable()->after('child2_name');
            
            $table->string('image')->nullable()->after('child2_dob');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'loyalty_card_no',
                'old_card_no',
                'join_date',
                'card_status',
                'category',
                'card_issue_date',
                'card_expiry_date',
                'introducer_card_no',
                'introducer_name',
                'spouse_name',
                'spouse_dob',
                'child1_name',
                'child1_dob',
                'child2_name',
                'child2_dob',
                'image',
            ]);
        });
    }
};
