<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\Rules\Enum;

class Message extends Model
{
    /** @use HasFactory<\Database\Factories\MessageFactory> */
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'token_count',
        'metadata',
    ];

    protected $casts = [
        'token_count' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * The possible roles for a message.
     */
    const ROLE_USER = 'user';
    const ROLE_ASSISTANT = 'assistant';

    /**
     * Get the conversation that owns the message.
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($message) {
            // Auto-estimate token count if not provided
            if (!$message->token_count) {
                $message->token_count = static::estimateTokens($message->content);
            }
        });

        static::created(function ($message) {
            // Update conversation activity and token usage
            $conversation = $message->conversation;
            $conversation->updateActivity();
            $conversation->addTokenUsage($message->token_count);
        });
    }

    /**
     * Estimate token count for given text.
     * Simple estimation: ~4 characters per token
     */
    public static function estimateTokens(string $text): int
    {
        return max(1, (int) ceil(strlen($text) / 4));
    }

    /**
     * Check if this is a user message.
     */
    public function isUserMessage(): bool
    {
        return $this->role === self::ROLE_USER;
    }

    /**
     * Check if this is an assistant message.
     */
    public function isAssistantMessage(): bool
    {
        return $this->role === self::ROLE_ASSISTANT;
    }

    /**
     * Get formatted content with metadata.
     */
    public function getFormattedContentAttribute(): array
    {
        return [
            'content' => $this->content,
            'role' => $this->role,
            'timestamp' => $this->created_at,
            'token_count' => $this->token_count,
            'metadata' => $this->metadata,
        ];
    }
}
