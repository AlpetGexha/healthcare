<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Conversation extends Model
{
    /** @use HasFactory<\Database\Factories\ConversationFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'profile_id',
        'title',
        'is_active',
        'last_activity_at',
        'token_usage',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_activity_at' => 'datetime',
        'token_usage' => 'integer',
    ];

    /**
     * Get the user that owns the conversation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the family member profile associated with the conversation.
     */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    /**
     * Get the messages for the conversation.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    /**
     * Scope a query to only include active conversations.
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Scope a query to only include conversations for a specific user.
     */
    public function scopeForUser(Builder $query, int $userId): void
    {
        $query->where('user_id', $userId);
    }

    /**
     * Update the last activity timestamp.
     */
    public function updateActivity(): void
    {
        $this->update(['last_activity_at' => now()]);
    }

    /**
     * Add token usage to the conversation.
     */
    public function addTokenUsage(int $tokens): void
    {
        $this->increment('token_usage', $tokens);
    }

    /**
     * Generate a title for the conversation based on the first message.
     */
    public function generateTitle(): void
    {
        if ($this->title) {
            return;
        }

        $firstMessage = $this->messages()->where('role', 'user')->first();

        if ($firstMessage) {
            // Take first 50 characters of the message as title
            $title = substr($firstMessage->content, 0, 50);
            if (strlen($firstMessage->content) > 50) {
                $title .= '...';
            }

            $this->update(['title' => $title]);
        }
    }

    /**
     * Get the total token count for all messages in this conversation.
     */
    public function getTotalTokensAttribute(): int
    {
        return $this->messages()->sum('token_count');
    }

    /**
     * Get recent conversations ordered by last activity.
     */
    public function scopeRecent(Builder $query): void
    {
        $query->orderBy('last_activity_at', 'desc');
    }
}
