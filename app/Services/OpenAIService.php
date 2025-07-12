<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;
use Illuminate\Support\Facades\Log;
use Exception;

class OpenAIService
{
    protected HealthResponseFormatterService $healthFormatter;

    public function __construct(HealthResponseFormatterService $healthFormatter)
    {
        $this->healthFormatter = $healthFormatter;
    }
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
        $basePrompt = env('CHAT_SYSTEM_PROMPT', 
            'You are a friendly, professional healthcare assistant. In every response, use the patient\'s profile (age, gender, medical history, allergies, medications, lifestyle factors, etc.) to tailor your guidance. Speak in a supportive and empathetic tone, using clear, simple language. Never give a medical diagnosis or offer dangerous advice. Emphasize that you are **not a doctor** and that any information you provide is general in nature. Encourage the user to consult a qualified healthcare professional for any serious or specific concerns. If the user\'s symptoms or situation seem urgent or beyond general advice, advise them to seek medical attention right away. Always keep the conversation patient-focused, positive, and safe.'
        );

        $enhancedInstructions = "\n\nStructured Response Guidelines:\n" .
            "- If recommending products (vitamins, pain relievers, medical devices, etc.), be specific about the type\n" .
            "- Use clear urgency indicators (urgent, emergency, monitor, etc.) when appropriate\n" .
            "- Provide both immediate advice and follow-up recommendations\n" .
            "- Consider the user's profile when making recommendations\n" .
            "- Always include appropriate disclaimers about professional medical advice";

        $contextualInfo = [];

        // Add user profile context
        if (isset($context['user_profile'])) {
            $profile = $context['user_profile'];
            $profileItems = [];
            
            if (isset($profile['age'])) $profileItems[] = "Age: {$profile['age']}";
            if (isset($profile['gender'])) $profileItems[] = "Gender: " . ($profile['gender'] ? 'Male' : 'Female');
            if (isset($profile['chronic_conditions']) && $profile['chronic_conditions']) 
                $profileItems[] = "Chronic conditions: {$profile['chronic_conditions']}";
            if (isset($profile['allergies']) && $profile['allergies']) 
                $profileItems[] = "Allergies: {$profile['allergies']}";
            if (isset($profile['medications']) && $profile['medications']) 
                $profileItems[] = "Current medications: {$profile['medications']}";
            if (isset($profile['is_pregnant']) && $profile['is_pregnant']) 
                $profileItems[] = "Currently pregnant";
            if (isset($profile['is_smoker']) && $profile['is_smoker']) 
                $profileItems[] = "Smoker";
            if (isset($profile['is_drinker']) && $profile['is_drinker']) 
                $profileItems[] = "Regular alcohol consumption";

            if (!empty($profileItems)) {
                $contextualInfo[] = "Patient Profile: " . implode(', ', $profileItems);
            }
        }

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
                $contextualInfo[] = "Previous topics: " . implode(', ', array_slice($convContext['conversation_topics'], 0, 5));
            }
        }

        // Add safety guidelines
        if (isset($context['relevant_data'])) {
            $relevantData = $context['relevant_data'];
            if (!empty($relevantData['safety_guidelines'])) {
                $contextualInfo[] = "Safety considerations: " . implode(' ', $relevantData['safety_guidelines']);
            }
        }

        $fullPrompt = $basePrompt . $enhancedInstructions;

        if (!empty($contextualInfo)) {
            $fullPrompt .= "\n\nPatient Context:\n" . implode("\n", $contextualInfo);
        }

        $fullPrompt .= "\n\nRemember: Personalize your response based on the patient profile, provide clear guidance with appropriate urgency level, and include specific product recommendations when helpful. Always prioritize safety and encourage professional medical consultation.";

        return $fullPrompt;
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

    /**
     * Generate enhanced health response with structured format, status levels, and product recommendations.
     */
    public function generateEnhancedHealthResponse(array $messages, array $context = [], array $userProfile = []): array
    {
        try {
            // First get the basic AI response
            $basicResponse = $this->generateResponse($messages, $context);
            
            if (!$basicResponse['success'] ?? true) {
                return $basicResponse;
            }

            // Extract the user's message for context
            $userMessage = '';
            if (!empty($messages)) {
                $lastMessage = end($messages);
                $userMessage = $lastMessage['content'] ?? '';
            }

            // Format the response using the health formatter
            $enhancedResponse = $this->healthFormatter->formatHealthResponse(
                $basicResponse['content'] ?? '',
                $userMessage,
                $userProfile
            );

            // Merge with basic response data
            return array_merge($basicResponse, [
                'enhanced' => true,
                'structured_response' => $enhancedResponse,
                'raw_content' => $basicResponse['content'] ?? ''
            ]);

        } catch (Exception $e) {
            Log::error('Enhanced health response generation error', [
                'error' => $e->getMessage(),
                'context' => $context,
                'user_profile' => $userProfile
            ]);

            // Fallback to basic response
            return $this->generateResponse($messages, $context);
        }
    }
}
