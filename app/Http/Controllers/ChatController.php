<?php

namespace App\Http\Controllers;

use App\Actions\ProcessChatMessage;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\TokenOptimizationService;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    use AuthorizesRequests;

    protected ProcessChatMessage $processChatMessage;
    protected TokenOptimizationService $tokenService;
    protected OpenAIService $openAIService;

    public function __construct(
        ProcessChatMessage $processChatMessage,
        TokenOptimizationService $tokenService,
        OpenAIService $openAIService
    ) {
        $this->processChatMessage = $processChatMessage;
        $this->tokenService = $tokenService;
        $this->openAIService = $openAIService;
    }

    /**
     * Display the chat interface.
     */
    public function index(): Response
    {
        $conversations = Auth::user()
            ->conversations()
            ->active()
            ->recent()
            ->with(['messages' => function ($query) {
                $query->latest()->limit(1);
            }])
            ->paginate(20);

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
            'config' => [
                'max_message_length' => config('chat.security.max_message_length'),
                'show_token_usage' => config('chat.ui.show_token_usage'),
                'enable_markdown' => config('chat.ui.enable_markdown'),
                'auto_scroll' => config('chat.ui.auto_scroll'),
            ]
        ]);
    }

    /**
     * Show a specific conversation.
     */
    public function show(Conversation $conversation): Response
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->orderBy('created_at')
            ->paginate(config('chat.ui.messages_per_page', 50));

        $tokenStats = $this->tokenService->getTokenStats($conversation);

        return Inertia::render('Chat/Show', [
            'conversation' => $conversation->load('user'),
            'messages' => $messages,
            'token_stats' => $tokenStats,
            'config' => [
                'max_message_length' => config('chat.security.max_message_length'),
                'show_token_usage' => config('chat.ui.show_token_usage'),
                'enable_markdown' => config('chat.ui.enable_markdown'),
            ]
        ]);
    }

    /**
     * Create a new conversation.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:' . config('chat.security.max_message_length', 4000),
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check rate limits
            $rateLimitKey = 'chat_conversation:' . Auth::id();
            if (RateLimiter::tooManyAttempts($rateLimitKey, config('chat.rate_limits.conversations_per_day', 20))) {
                return response()->json([
                    'success' => false,
                    'error' => 'Too many conversations created today. Please try again tomorrow.'
                ], 429);
            }

            RateLimiter::hit($rateLimitKey, 86400); // 24 hours

            // Create new conversation
            $conversation = Conversation::create([
                'user_id' => Auth::id(),
                'title' => 'New Conversation',
                'is_active' => true,
                'last_activity_at' => now(),
            ]);

            // Process the first message
            $result = $this->processChatMessage->handle($conversation, $request->message);

            return response()->json([
                'success' => true,
                'conversation' => $conversation->fresh(['user']),
                'message_result' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Chat store error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create conversation. Please try again.'
            ], 500);
        }
    }

    /**
     * Send a message to an existing conversation.
     */
    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        try {
            $this->authorize('update', $conversation);

            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:' . config('chat.security.max_message_length', 4000),
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check rate limits
            $rateLimitKey = 'chat_message:' . Auth::id();
            if (RateLimiter::tooManyAttempts($rateLimitKey, config('chat.rate_limits.messages_per_minute', 10))) {
                return response()->json([
                    'success' => false,
                    'error' => 'Too many messages sent. Please wait a moment before sending another message.'
                ], 429);
            }

            RateLimiter::hit($rateLimitKey, 60); // 1 minute

            // Process the message
            $result = $this->processChatMessage->handle($conversation, $request->message);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Chat sendMessage error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'conversation_id' => $conversation->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to send message. Please try again.'
            ], 500);
        }
    }

    /**
     * Get messages for a conversation with pagination.
     */
    public function getMessages(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->orderBy('created_at', $request->get('order', 'asc'))
            ->paginate($request->get('per_page', 50));

        return response()->json([
            'success' => true,
            'messages' => $messages,
        ]);
    }

    /**
     * Update conversation settings.
     */
    public function update(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $conversation->update($validator->validated());

        return response()->json([
            'success' => true,
            'conversation' => $conversation->fresh(),
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Conversation $conversation): JsonResponse
    {
        $this->authorize('delete', $conversation);

        $conversation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conversation deleted successfully.',
        ]);
    }

    /**
     * Archive/deactivate a conversation.
     */
    public function archive(Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        $conversation->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Conversation archived successfully.',
            'conversation' => $conversation->fresh(),
        ]);
    }

    /**
     * Search conversations.
     */
    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:2|max:100',
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $query = $request->get('query');
        $perPage = $request->get('per_page', 20);

        $conversations = Auth::user()
            ->conversations()
            ->where(function ($q) use ($query) {
                $q->where('title', 'LIKE', "%{$query}%")
                  ->orWhereHas('messages', function ($messageQuery) use ($query) {
                      $messageQuery->where('content', 'LIKE', "%{$query}%");
                  });
            })
            ->with(['messages' => function ($q) {
                $q->latest()->limit(1);
            }])
            ->recent()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'conversations' => $conversations,
            'query' => $query,
        ]);
    }

    /**
     * Get conversation statistics.
     */
    public function stats(Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $stats = $this->tokenService->getTokenStats($conversation);

        $additionalStats = [
            'message_count' => $conversation->messages()->count(),
            'user_messages' => $conversation->messages()->where('role', 'user')->count(),
            'assistant_messages' => $conversation->messages()->where('role', 'assistant')->count(),
            'created_at' => $conversation->created_at,
            'last_activity' => $conversation->last_activity_at,
            'duration_minutes' => $conversation->last_activity_at
                ? $conversation->created_at->diffInMinutes($conversation->last_activity_at)
                : 0,
        ];

        return response()->json([
            'success' => true,
            'stats' => array_merge($stats, $additionalStats),
        ]);
    }

    /**
     * Export conversation data.
     */
    public function export(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        $format = $request->get('format', 'json');

        if (!in_array($format, config('chat.backup.export_formats', ['json']))) {
            return response()->json([
                'success' => false,
                'error' => 'Unsupported export format.'
            ], 400);
        }

        $data = [
            'conversation' => $conversation->toArray(),
            'messages' => $conversation->messages()->orderBy('created_at')->get()->toArray(),
            'exported_at' => now()->toISOString(),
            'export_format' => $format,
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'filename' => "conversation_{$conversation->id}_{now()->format('Y-m-d_H-i-s')}.{$format}",
        ]);
    }

    /**
     * Test AI connectivity.
     */
    public function testAI(): Response
    {
        try {
            // Test the OpenAI connection
            $testResult = $this->openAIService->testConnection();

            return Inertia::render('TestAI', [
                'testResult' => $testResult,
                'config' => [
                    'model' => env('OPENAI_MODEL', 'gpt-3.5-turbo'),
                    'api_configured' => !empty(config('openai.api_key')),
                ]
            ]);
        } catch (\Exception $e) {
            return Inertia::render('TestAI', [
                'testResult' => [
                    'success' => false,
                    'error' => $e->getMessage(),
                ],
                'config' => [
                    'model' => env('OPENAI_MODEL', 'gpt-3.5-turbo'),
                    'api_configured' => !empty(config('openai.api_key')),
                ]
            ]);
        }
    }
}
