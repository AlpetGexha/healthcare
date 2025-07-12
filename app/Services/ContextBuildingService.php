<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

class ContextBuildingService
{
    /**
     * Build context for AI based on user query and conversation.
     */
    public function buildContext(string $userMessage, Conversation $conversation): array
    {
        $context = [
            'system_prompt' => $this->getSystemPrompt(),
            'user_context' => $this->getUserContext($conversation->user()->first()),
            'conversation_context' => $this->getConversationContext($conversation),
            'relevant_data' => $this->getRelevantData($userMessage),
            'keywords' => $this->extractKeywords($userMessage),
        ];

        return $context;
    }

    /**
     * Get the system prompt for the AI.
     */
    protected function getSystemPrompt(): string
    {
        return config('chat.ai.system_prompt',
            'You are a helpful healthcare assistant. Provide accurate, helpful, and professional responses. ' .
            'Always prioritize user safety and recommend consulting healthcare professionals for medical advice.'
        );
    }

    /**
     * Get user-specific context.
     */
    protected function getUserContext(User $user): array
    {
        return [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_preferences' => $this->getUserPreferences($user),
            'conversation_history_summary' => $this->getUserConversationSummary($user),
        ];
    }

    /**
     * Get conversation-specific context.
     */
    protected function getConversationContext(Conversation $conversation): array
    {
        $recentMessages = $conversation->messages()
            ->latest()
            ->limit(3)
            ->get();

        return [
            'conversation_id' => $conversation->id,
            'conversation_title' => $conversation->title,
            'total_messages' => $conversation->messages()->count(),
            'conversation_topics' => $this->extractConversationTopics($conversation),
            'recent_context' => $recentMessages->map(function ($message) {
                return [
                    'role' => $message->role,
                    'content' => substr($message->content, 0, 200),
                    'timestamp' => $message->created_at,
                ];
            })->toArray(),
        ];
    }

    /**
     * Get relevant data based on user query.
     */
    protected function getRelevantData(string $query): array
    {
        $keywords = $this->extractKeywords($query);

        // Cache key for this specific query context
        $cacheKey = 'context_' . md5($query);

        return Cache::remember($cacheKey, now()->addMinutes(30), function () use ($keywords, $query) {
            return [
                'healthcare_topics' => $this->getHealthcareTopics($keywords),
                'common_conditions' => $this->getCommonConditions($keywords),
                'safety_guidelines' => $this->getSafetyGuidelines($keywords),
                'statistical_data' => $this->getStatisticalData($keywords),
            ];
        });
    }

    /**
     * Extract keywords from user message.
     */
    public function extractKeywords(string $text): array
    {
        // Convert to lowercase and remove punctuation
        $cleanText = preg_replace('/[^\w\s]/', '', strtolower($text));

        // Common stop words to filter out
        $stopWords = [
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
            'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
            'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
            'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
            'while', 'of', 'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after',
            'above', 'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
            'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
            'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
            'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just',
            'should', 'now'
        ];

        $words = explode(' ', $cleanText);
        $keywords = array_filter($words, function($word) use ($stopWords) {
            return strlen($word) > 2 && !in_array($word, $stopWords);
        });

        // Return unique keywords with frequency
        $keywordCounts = array_count_values($keywords);
        arsort($keywordCounts);

        return array_keys(array_slice($keywordCounts, 0, 10));
    }

    /**
     * Get healthcare topics relevant to keywords.
     */
    protected function getHealthcareTopics(array $keywords): array
    {
        $healthcareTopics = [
            'symptoms' => ['fever', 'pain', 'headache', 'fatigue', 'nausea', 'cough', 'cold'],
            'conditions' => ['diabetes', 'hypertension', 'anxiety', 'depression', 'arthritis'],
            'treatments' => ['medication', 'therapy', 'exercise', 'diet', 'surgery'],
            'prevention' => ['vaccination', 'screening', 'lifestyle', 'nutrition', 'wellness'],
        ];

        $relevantTopics = [];
        foreach ($healthcareTopics as $category => $topics) {
            $matches = array_intersect($keywords, $topics);
            if (!empty($matches)) {
                $relevantTopics[$category] = $matches;
            }
        }

        return $relevantTopics;
    }

    /**
     * Get common conditions related to keywords.
     */
    protected function getCommonConditions(array $keywords): array
    {
        // This would typically query a medical database
        // For now, returning static data based on common patterns
        $conditions = [];

        foreach ($keywords as $keyword) {
            switch (strtolower($keyword)) {
                case 'chest':
                case 'heart':
                    $conditions[] = 'Cardiovascular conditions require immediate medical attention if experiencing chest pain.';
                    break;
                case 'blood':
                case 'pressure':
                    $conditions[] = 'Blood pressure monitoring is important for cardiovascular health.';
                    break;
                case 'sugar':
                case 'diabetes':
                    $conditions[] = 'Blood sugar management is crucial for diabetes care.';
                    break;
                default:
                    // Generic health advice
                    break;
            }
        }

        return array_unique($conditions);
    }

    /**
     * Get safety guidelines related to query.
     */
    protected function getSafetyGuidelines(array $keywords): array
    {
        return [
            'emergency' => 'For medical emergencies, call emergency services immediately.',
            'consultation' => 'Always consult with a healthcare professional for medical advice.',
            'medication' => 'Never start or stop medications without consulting your doctor.',
            'symptoms' => 'Persistent or severe symptoms require medical evaluation.',
        ];
    }

    /**
     * Get statistical data relevant to query.
     */
    protected function getStatisticalData(array $keywords): array
    {
        // This would typically query health statistics databases
        return [
            'disclaimer' => 'Statistical data provided for educational purposes only.',
            'source' => 'Healthcare statistics from reputable medical sources.',
        ];
    }

    /**
     * Get user preferences.
     */
    protected function getUserPreferences(User $user): array
    {
        // This would typically come from user settings
        return [
            'language' => 'en',
            'medical_history_considered' => false,
            'communication_style' => 'professional',
        ];
    }

    /**
     * Get user conversation history summary.
     */
    protected function getUserConversationSummary(User $user): string
    {
        $recentConversations = $user->conversations()
            ->where('is_active', true)
            ->latest('last_activity_at')
            ->limit(5)
            ->get();

        if ($recentConversations->isEmpty()) {
            return 'No previous conversation history.';
        }

        $topicCounts = [];
        foreach ($recentConversations as $conversation) {
            $topics = $this->extractConversationTopics($conversation);
            foreach ($topics as $topic) {
                $topicCounts[$topic] = ($topicCounts[$topic] ?? 0) + 1;
            }
        }

        $commonTopics = array_keys(array_slice($topicCounts, 0, 3));

        return sprintf(
            'User has %d recent conversations. Common topics: %s',
            $recentConversations->count(),
            implode(', ', $commonTopics)
        );
    }

    /**
     * Extract topics from conversation.
     */
    protected function extractConversationTopics(Conversation $conversation): array
    {
        $allContent = $conversation->messages()
            ->pluck('content')
            ->implode(' ');

        return $this->extractKeywords($allContent);
    }
}
