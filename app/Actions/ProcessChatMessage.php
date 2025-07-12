<?php

namespace App\Actions;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\TokenOptimizationService;
use App\Services\ContextBuildingService;
use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessChatMessage
{
    protected TokenOptimizationService $tokenService;
    protected ContextBuildingService $contextService;
    protected OpenAIService $aiService;

    public function __construct(
        TokenOptimizationService $tokenService,
        ContextBuildingService $contextService,
        OpenAIService $aiService
    ) {
        $this->tokenService = $tokenService;
        $this->contextService = $contextService;
        $this->aiService = $aiService;
    }

    /**
     * Process a chat message and generate AI response.
     */
    public function handle(Conversation $conversation, string $userMessage): array
    {
        try {
            // 1. Create user message
            $userMsg = $this->createUserMessage($conversation, $userMessage);

            // 2. Check if conversation history needs optimization
            if ($this->tokenService->shouldCompressHistory($conversation)) {
                $this->tokenService->compressOldMessages($conversation);
            }

            // 3. Build context for AI
            $context = $this->contextService->buildContext($userMessage, $conversation);

            // 4. Get optimized conversation history
            $messages = $this->tokenService->optimizeConversationHistory($conversation);

            // 5. Generate AI response
            $aiResponse = $this->aiService->generateResponse($messages, $context);

            // 6. Create assistant message
            $assistantMsg = $this->createAssistantMessage($conversation, $aiResponse);

            // 7. Generate conversation title if needed
            $conversation->generateTitle();

            return [
                'success' => true,
                'user_message' => $userMsg,
                'assistant_message' => $assistantMsg,
                'conversation' => $conversation->fresh(),
                'token_usage' => [
                    'conversation_total' => $conversation->total_tokens,
                    'this_exchange' => $userMsg->token_count + $assistantMsg->token_count,
                ]
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
        $content = is_array($response) ? $response['content'] : $response;
        $metadata = is_array($response) ? $response['metadata'] ?? [] : [];

        return Message::create([
            'conversation_id' => $conversation->id,
            'role' => Message::ROLE_ASSISTANT,
            'content' => $content,
            'token_count' => is_array($response) ? ($response['token_count'] ?? 0) : 0,
            'metadata' => array_merge([
                'timestamp' => now()->toISOString(),
                'model' => config('chat.ai.model'),
            ], $metadata)
        ]);
    }
}
