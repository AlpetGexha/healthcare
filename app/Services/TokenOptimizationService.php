<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class TokenOptimizationService
{
    const MAX_CONVERSATION_TOKENS = 6000;
    const PRIORITY_MESSAGES = 5; // Always keep last 5 messages
    const COMPRESSION_RATIO = 0.3; // Compress to 30% of original

    /**
     * Check if conversation history needs compression.
     */
    public function shouldCompressHistory(Conversation $conversation): bool
    {
        $totalTokens = $conversation->messages()->sum('token_count');
        return $totalTokens > self::MAX_CONVERSATION_TOKENS;
    }

    /**
     * Optimize conversation history for AI context.
     */
    public function optimizeConversationHistory(Conversation $conversation): array
    {
        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get();

        if ($messages->count() <= self::PRIORITY_MESSAGES) {
            return $this->formatMessagesForAI($messages);
        }

        // Always keep the last PRIORITY_MESSAGES
        $priorityMessages = $messages->slice(-self::PRIORITY_MESSAGES);
        $olderMessages = $messages->slice(0, -self::PRIORITY_MESSAGES);

        $optimizedMessages = collect();

        // If we have older messages, decide how to handle them
        if ($olderMessages->isNotEmpty()) {
            $totalOlderTokens = $olderMessages->sum('token_count');

            if ($totalOlderTokens > 1000) {
                // Compress older messages into a summary
                $summary = $this->createConversationSummary($olderMessages);
                $optimizedMessages->push([
                    'role' => 'system',
                    'content' => "Previous conversation summary: " . $summary
                ]);
            } else {
                // Include all older messages if token count is reasonable
                $optimizedMessages = $optimizedMessages->merge(
                    $this->formatMessagesForAI($olderMessages)
                );
            }
        }

        // Add priority messages
        $optimizedMessages = $optimizedMessages->merge(
            $this->formatMessagesForAI($priorityMessages)
        );

        return $optimizedMessages->toArray();
    }

    /**
     * Compress old messages by creating summaries.
     */
    public function compressOldMessages(Conversation $conversation): void
    {
        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->get();

        if ($messages->count() <= self::PRIORITY_MESSAGES) {
            return;
        }

        $messagesToCompress = $messages->slice(0, -self::PRIORITY_MESSAGES);
        $summary = $this->createConversationSummary($messagesToCompress);

        // Create a summary message
        Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'system',
            'content' => "Summary of previous messages: " . $summary,
            'token_count' => $this->estimateTokens($summary),
            'metadata' => [
                'type' => 'compression_summary',
                'compressed_messages_count' => $messagesToCompress->count(),
                'created_at' => now()->toISOString(),
            ]
        ]);

        // Mark old messages as compressed (soft delete or flag)
        Message::whereIn('id', $messagesToCompress->pluck('id'))
            ->update(['metadata->compressed' => true]);
    }

    /**
     * Create a summary of conversation messages.
     */
    protected function createConversationSummary(Collection $messages): string
    {
        $userMessages = $messages->where('role', 'user');
        $assistantMessages = $messages->where('role', 'assistant');

        $topics = $this->extractTopics($userMessages->pluck('content')->implode(' '));

        $summary = sprintf(
            "The conversation covered %d user queries and %d responses. Main topics discussed: %s. ",
            $userMessages->count(),
            $assistantMessages->count(),
            implode(', ', $topics)
        );

        // Add key insights from recent messages
        $recentInsights = $messages->slice(-3)->map(function ($message) {
            return substr($message->content, 0, 100) . '...';
        })->implode(' ');

        return $summary . "Recent context: " . $recentInsights;
    }

    /**
     * Extract key topics from text.
     */
    protected function extractTopics(string $text): array
    {
        // Simple keyword extraction - in production, use NLP libraries
        $commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'];

        $words = str_word_count(strtolower($text), 1);
        $words = array_filter($words, function($word) use ($commonWords) {
            return strlen($word) > 3 && !in_array($word, $commonWords);
        });

        $wordCounts = array_count_values($words);
        arsort($wordCounts);

        return array_keys(array_slice($wordCounts, 0, 5));
    }

    /**
     * Format messages for AI API.
     */
    protected function formatMessagesForAI(Collection $messages): array
    {
        return $messages->map(function ($message) {
            return [
                'role' => $message->role === 'assistant' ? 'assistant' : 'user',
                'content' => $message->content
            ];
        })->toArray();
    }

    /**
     * Estimate token count for text.
     */
    public function estimateTokens(string $text): int
    {
        return max(1, (int) ceil(strlen($text) / 4));
    }

    /**
     * Get conversation token statistics.
     */
    public function getTokenStats(Conversation $conversation): array
    {
        $messages = $conversation->messages;

        return [
            'total_messages' => $messages->count(),
            'total_tokens' => $messages->sum('token_count'),
            'user_tokens' => $messages->where('role', 'user')->sum('token_count'),
            'assistant_tokens' => $messages->where('role', 'assistant')->sum('token_count'),
            'average_tokens_per_message' => $messages->count() > 0 ?
                round($messages->sum('token_count') / $messages->count()) : 0,
            'compression_needed' => $messages->sum('token_count') > self::MAX_CONVERSATION_TOKENS,
        ];
    }
}
