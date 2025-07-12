<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Message>
 */
class MessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => \App\Models\Conversation::factory(),
            'content' => $this->faker->paragraph(),
            'is_from_user' => $this->faker->boolean(),
            'tokens_used' => $this->faker->numberBetween(10, 200),
            'metadata' => null,
        ];
    }
}
