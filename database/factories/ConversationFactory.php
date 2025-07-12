<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Conversation>
 */
class ConversationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => \App\Models\User::factory(),
            'profile_id' => null, // Can be set when creating factory instances
            'title' => $this->faker->sentence(3),
            'is_active' => true,
            'last_activity_at' => now(),
            'token_usage' => $this->faker->numberBetween(0, 1000),
        ];
    }
}
