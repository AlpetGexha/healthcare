<?php

namespace App\Actions;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\TokenOptimizationService;
use App\Services\ContextBuildingService;
use App\Services\OpenAIService;
use App\Services\WebSearchService;
use App\Services\ResponseFormattingService;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessChatMessage
{
    protected TokenOptimizationService $tokenService;
    protected ContextBuildingService $contextService;
    protected OpenAIService $aiService;
    protected WebSearchService $webSearchService;
    protected ResponseFormattingService $responseFormattingService;

    public function __construct(
        TokenOptimizationService $tokenService,
        ContextBuildingService $contextService,
        OpenAIService $aiService,
        WebSearchService $webSearchService,
        ResponseFormattingService $responseFormattingService
    ) {
        $this->tokenService = $tokenService;
        $this->contextService = $contextService;
        $this->aiService = $aiService;
        $this->webSearchService = $webSearchService;
        $this->responseFormattingService = $responseFormattingService;
    }

    /**
     * Process a chat message and generate AI response.
     */
    public function handle(Conversation $conversation, string $userMessage, ?string $healthContext = null): array
    {
        try {
            // 1. Create user message
            $userMsg = $this->createUserMessage($conversation, $userMessage);

            // 2. Check if conversation history needs optimization
            if ($this->tokenService->shouldCompressHistory($conversation)) {
                $this->tokenService->compressOldMessages($conversation);
            }

            $context = $this->contextService->buildContext($userMessage, $conversation, $healthContext);
      
            // Add user profile to context for personalization
            $userProfile = $conversation->user->profile ?? [];
            if ($userProfile) {
                $context['user_profile'] = $userProfile->toArray();
            }

            // 4. Get optimized conversation history
            $messages = $this->tokenService->optimizeConversationHistory($conversation);

            // 5. Generate AI response
            $aiResponse = $this->aiService->generateResponse($messages, $context);
            
            // 6. Extract product recommendations and search for links
            $products = $this->webSearchService->extractProducts($aiResponse['content'] ?? $aiResponse);
            $productSearchResults = [];
            
            if (!empty($products)) {
                $productSearchResults = $this->webSearchService->searchProducts($products);
            }

            // 7. Format the response with enhanced structure
            $formattedResponse = $this->responseFormattingService->formatResponse(
                $aiResponse['content'] ?? $aiResponse,
                $productSearchResults,
                $context['user_profile'] ?? []
            );

            // 8. Create assistant message with enhanced metadata
            $assistantMsg = $this->createAssistantMessage($conversation, $formattedResponse);

            // 9. Generate conversation title if needed
            $conversation->generateTitle();

            return [
                'success' => true,
                'user_message' => $userMsg,
                'assistant_message' => $assistantMsg,
                'formatted_response' => $formattedResponse['formatted_response'],
                'conversation' => $conversation->fresh(),
                'token_usage' => [
                    'conversation_total' => $conversation->total_tokens,
                    'this_exchange' => $userMsg->token_count + $assistantMsg->token_count,
                ],
                'response_metadata' => $formattedResponse['response_metadata'] ?? []
            ];

        } catch (Exception $e) {
            Log::error('Chat processing failed', [
                'conversation_id' => $conversation->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Create error response
            $errorMsg = $this->createAssistantMessage(
                $conversation,
                "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
            );

            return [
                'success' => false,
                'error' => 'Failed to process message',
                'user_message' => $this->createUserMessage($conversation, $userMessage),
                'assistant_message' => $errorMsg,
                'conversation' => $conversation->fresh(),
            ];
        }
    }

    /**
     * Create a user message.
     */
    protected function createUserMessage(Conversation $conversation, string $content): Message
    {
        return Message::create([
            'conversation_id' => $conversation->id,
            'role' => Message::ROLE_USER,
            'content' => $content,
            'metadata' => [
                'timestamp' => now()->toISOString(),
                'source' => 'web_interface',
            ]
        ]);
    }

    /**
     * Create an assistant message.
     */
    protected function createAssistantMessage(Conversation $conversation, array|string $response): Message
    {
        // Handle both formatted responses and simple strings
        if (is_array($response) && isset($response['formatted_response'])) {
            $content = $response['original_response'] ?? $response['formatted_response']['details']['main_content'] ?? 'AI Response';
            $metadata = [
                'timestamp' => now()->toISOString(),
                'model' => config('openai.default_model'),
                'formatted_response' => $response['formatted_response'],
                'response_metadata' => $response['response_metadata'] ?? []
            ];
            $tokenCount = $response['response_metadata']['token_count'] ?? 0;
        } else {
            $content = is_array($response) ? ($response['content'] ?? json_encode($response)) : $response;
            $metadata = is_array($response) ? ($response['metadata'] ?? []) : [];
            $tokenCount = is_array($response) ? ($response['token_count'] ?? 0) : 0;
            
            $metadata = array_merge([
                'timestamp' => now()->toISOString(),
                'model' => config('openai.default_model'),
            ], $metadata);
        }

        return Message::create([
            'conversation_id' => $conversation->id,
            'role' => Message::ROLE_ASSISTANT,
            'content' => $content,
            'token_count' => $tokenCount,
            'metadata' => $metadata
        ]);
    }
}
