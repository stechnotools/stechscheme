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
        Schema::create('customer_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->unsignedBigInteger('invoice_id')->nullable();
            $table->foreignId('staff_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('campaign_id')->nullable()->constrained('feedback_campaigns')->onDelete('set null');
            $table->tinyInteger('rating_overall')->comment('1-5 scale');
            $table->tinyInteger('rating_staff')->nullable()->comment('1-5 scale');
            $table->tinyInteger('rating_transparency')->nullable()->comment('1-5 scale');
            $table->text('comments')->nullable();
            $table->decimal('sentiment_score', 5, 2)->nullable();
            $table->enum('status', ['new', 'reviewed', 'action_taken', 'resolved'])->default('new');
            $table->boolean('follow_up_required')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_feedback');
    }
};
