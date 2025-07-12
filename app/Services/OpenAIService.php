<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;
use Illuminate\Support\Facades\Log;
use Exception;

class OpenAIService
{
    /**
     * Check if OpenAI is properly configured.
     */
    public function isConfigured(): bool
    {
        $apiKey = config('openai.api_key');
        return !empty($apiKey) && $apiKey !== 'your_openai_api_key_here';
    }

    /**
     * Generate AI response from conversation messages and context.
     */
    public function generateResponse(array $messages, array $context = []): array
    {
        try {
            // Check if OpenAI is configured
            if (!$this->isConfigured()) {
                return [
                    'success' => false,
                    'error' => 'OpenAI API is not configured. Please set your API key in the environment variables.',
                    'content' => 'I apologize, but the AI service is not configured properly. Please contact the administrator to set up the OpenAI API key.',
                    'tokens_used' => 0
                ];
            }

            // Build messages array with system prompt
            $systemMessage = [
                'role' => 'system',
                'content' => $this->buildSystemPrompt($context)
            ];

            $fullMessages = array_merge([$systemMessage], $messages);

            // Make the API call using the official OpenAI package
            $response = OpenAI::chat()->create([
                'model' => env('OPENAI_MODEL', 'gpt-3.5-turbo'),
                'messages' => $fullMessages,
                'max_tokens' => (int) env('OPENAI_MAX_TOKENS', 1000),
                'temperature' => (float) env('OPENAI_TEMPERATURE', 0.7),
            ]);

            return $this->processResponse($response->toArray());

        } catch (Exception $e) {
            Log::error('OpenAI API error', [
                'error' => $e->getMessage(),
                'context' => $context,
                'messages_count' => count($messages)
            ]);

            return $this->getFallbackResponse();
        }
    }

    /**
     * Build system prompt with context.
     */
    protected function buildSystemPrompt(array $context): string
    {
        $systemPrompt = env('CHAT_SYSTEM_PROMPT', 
            'You are a helpful healthcare assistant. Provide accurate, helpful, and professional responses. ' .
            'Always prioritize user safety and recommend consulting healthcare professionals for medical advice. ' .
            'Do not provide specific medical diagnoses or prescribe medications. ' .
            'Focus on general health information and encourage users to consult with qualified healthcare providers.'
        );

        $contextualInfo = [];

        // Add user context
        if (isset($context['user_context'])) {
            $userContext = $context['user_context'];
            if (isset($userContext['user_name'])) {
                $contextualInfo[] = "User: {$userContext['user_name']}";
            }
        }

        // Add conversation context
        if (isset($context['conversation_context'])) {
            $convContext = $context['conversation_context'];
            if (!empty($convContext['conversation_topics'])) {
                $contextualInfo[] = "Conversation topics: " . implode(', ', array_slice($convContext['conversation_topics'], 0, 5));
            }
        }

        // Add relevant data
        if (isset($context['relevant_data'])) {
            $relevantData = $context['relevant_data'];
            if (!empty($relevantData['safety_guidelines'])) {
                $contextualInfo[] = "Safety guidelines: " . implode(' ', $relevantData['safety_guidelines']);
            }
        }

        // Add keywords for context
        if (isset($context['keywords']) && !empty($context['keywords'])) {
            $contextualInfo[] = "Key topics mentioned: " . implode(', ', array_slice($context['keywords'], 0, 5));
        }

        if (!empty($contextualInfo)) {
            $systemPrompt .= "\n\nAdditional context:\n" . implode("\n", $contextualInfo);
        }

        $systemPrompt .= "\n\nImportant: Always prioritize user safety and recommend consulting healthcare professionals for medical advice. If asked about specific medical conditions or treatments, remind users to consult with their healthcare provider.";

        return $systemPrompt;
    }

    /**
     * Process the API response.
     */
    protected function processResponse(array $responseData): array
    {
        $choice = $responseData['choices'][0] ?? null;

        if (!$choice) {
            throw new Exception('Invalid response format from OpenAI API');
        }

        $content = $choice['message']['content'] ?? '';
        $finishReason = $choice['finish_reason'] ?? 'unknown';

        // Extract usage information
        $usage = $responseData['usage'] ?? [];
        $tokenCount = $usage['completion_tokens'] ?? $this->estimateTokens($content);

        return [
            'content' => trim($content),
            'token_count' => $tokenCount,
            'metadata' => [
                'model' => $responseData['model'] ?? config('chat.ai.model'),
                'finish_reason' => $finishReason,
                'usage' => $usage,
                'response_id' => $responseData['id'] ?? null,
                'created_at' => now()->toISOString(),
            ]
        ];
    }

    /**
     * Get fallback response when AI service fails.
     */
    protected function getFallbackResponse(): array
    {
        $fallbackMessages = [
            "I apologize, but I'm experiencing technical difficulties at the moment. Please try again in a few minutes.",
            "I'm currently unable to process your request due to a temporary issue. Please try again shortly.",
            "There seems to be a technical problem on my end. Please try your question again in a moment.",
        ];

        $content = $fallbackMessages[array_rand($fallbackMessages)];

        return [
            'content' => $content,
            'token_count' => $this->estimateTokens($content),
            'metadata' => [
                'model' => 'fallback',
                'finish_reason' => 'error',
                'is_fallback' => true,
                'created_at' => now()->toISOString(),
            ]
        ];
    }

    /**
     * Estimate token count for text.
     */
    protected function estimateTokens(string $text): int
    {
        return max(1, (int) ceil(strlen($text) / 4));
    }

    /**
     * Test the API connection.
     */
    public function testConnection(): array
    {
        try {
            if (!$this->isConfigured()) {
                return [
                    'success' => false,
                    'message' => 'OpenAI API key is not configured',
                    'error' => 'Please set OPENAI_API_KEY in your environment variables'
                ];
            }

            $response = $this->generateResponse([
                ['role' => 'user', 'content' => 'Hello, this is a test message. Please respond with "Test successful!"']
            ]);

            if (isset($response['error'])) {
                return [
                    'success' => false,
                    'message' => 'API connection failed',
                    'error' => $response['error']
                ];
            }

            return [
                'success' => true,
                'message' => 'API connection successful',
                'response' => $response
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'API connection failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get available models.
     */
    public function getAvailableModels(): array
    {
        try {
            if (!$this->isConfigured()) {
                return [];
            }

            $response = OpenAI::models()->list();
            $models = $response->toArray();

            // Filter for GPT models only
            return array_filter($models['data'], function($model) {
                return strpos($model['id'], 'gpt') !== false;
            });

        } catch (Exception $e) {
            Log::error('Failed to fetch OpenAI models', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Calculate cost estimate for tokens.
     */
    public function calculateCostEstimate(int $inputTokens, int $outputTokens, string $model = null): array
    {
        $model = $model ?: config('chat.ai.model', 'gpt-3.5-turbo');

        // Pricing per 1K tokens (as of current pricing - should be updated regularly)
        $pricing = [
            'gpt-3.5-turbo' => ['input' => 0.0015, 'output' => 0.002],
            'gpt-4' => ['input' => 0.03, 'output' => 0.06],
            'gpt-4-turbo' => ['input' => 0.01, 'output' => 0.03],
            'gpt-4o' => ['input' => 0.005, 'output' => 0.015],
            'gpt-4o-mini' => ['input' => 0.00015, 'output' => 0.0006],
        ];

        $modelPricing = $pricing[$model] ?? $pricing['gpt-3.5-turbo'];

        $inputCost = ($inputTokens / 1000) * $modelPricing['input'];
        $outputCost = ($outputTokens / 1000) * $modelPricing['output'];

        return [
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'input_cost' => round($inputCost, 6),
            'output_cost' => round($outputCost, 6),
            'total_cost' => round($inputCost + $outputCost, 6),
            'model' => $model,
        ];
    }

    /**
     * Stream response (for future implementation).
     */
    public function streamResponse(array $messages, array $context = []): \Generator
    {
        if (!$this->isConfigured()) {
            yield ['error' => 'OpenAI API is not configured'];
            return;
        }

        try {
            $systemMessage = [
                'role' => 'system',
                'content' => $this->buildSystemPrompt($context)
            ];

            $fullMessages = array_merge([$systemMessage], $messages);

            $stream = OpenAI::chat()->createStreamed([
                'model' => config('chat.ai.model', 'gpt-3.5-turbo'),
                'messages' => $fullMessages,
                'max_tokens' => config('chat.ai.max_tokens', 1000),
                'temperature' => config('chat.ai.temperature', 0.7),
            ]);

            foreach ($stream as $response) {
                $delta = $response->choices[0]->delta ?? null;
                if ($delta && isset($delta->content)) {
                    yield ['content' => $delta->content];
                }
            }

        } catch (Exception $e) {
            Log::error('OpenAI streaming error', ['error' => $e->getMessage()]);
            yield ['error' => $e->getMessage()];
        }
    }
}
