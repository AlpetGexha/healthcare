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
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            $table->string('name')->nullable();
            $table->string('age');
            $table->boolean('gender')->default(true);
            $table->string('address')->nullable();

            $table->string('weight')->nullable();
            $table->string('height')->nullable();

            $table->string('chronic_conditions')->nullable();
            $table->string('allergies')->nullable();
            $table->string('medications')->nullable();
            $table->timestamps();

            $table->boolean('is_pregnant')->nullable();
            $table->string('blood_type')->nullable();
            $table->boolean('is_smoker')->default(false);
            $table->boolean('is_drinker')->default(false);

            $table->json('extra_info')->nullable();
            $table->text('ai_summary')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
