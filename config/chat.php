<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Chat System Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration settings for the chat system including AI integration,
    | token optimization, and conversation management.
    |
    */

    'ai' => [
        /*
        |--------------------------------------------------------------------------
        | OpenAI Configuration
        |--------------------------------------------------------------------------
        */
        'api_key' => env('OPENAI_API_KEY', ''),
        'model' => env('OPENAI_MODEL', 'gpt-3.5-turbo'),
        'timeout' => env('OPENAI_TIMEOUT', 30),

        /*
        |--------------------------------------------------------------------------
        | AI Response Configuration
        |--------------------------------------------------------------------------
        */
        'max_tokens' => env('OPENAI_MAX_TOKENS', 1000),
        'temperature' => env('OPENAI_TEMPERATURE', 0.7),
        'top_p' => env('OPENAI_TOP_P', 1),
        'frequency_penalty' => env('OPENAI_FREQUENCY_PENALTY', 0),
        'presence_penalty' => env('OPENAI_PRESENCE_PENALTY', 0),
        'stream' => env('OPENAI_STREAM', false),

        /*
        |--------------------------------------------------------------------------
        | System Prompt
        |--------------------------------------------------------------------------
        */
        'system_prompt' => env('CHAT_SYSTEM_PROMPT',
            'You are a helpful healthcare assistant. Provide accurate, helpful, and professional responses. ' .
            'Always prioritize user safety and recommend consulting healthcare professionals for medical advice. ' .
            'Do not provide specific medical diagnoses or prescribe medications. ' .
            'Focus on general health information and encourage users to consult with qualified healthcare providers.'
        ),
    ],

    /*
    |--------------------------------------------------------------------------
    | Token Optimization
    |--------------------------------------------------------------------------
    */
    'tokens' => [
        'max_conversation_tokens' => env('CHAT_MAX_CONVERSATION_TOKENS', 6000),
        'priority_messages' => env('CHAT_PRIORITY_MESSAGES', 5),
        'compression_ratio' => env('CHAT_COMPRESSION_RATIO', 0.3),
        'enable_compression' => env('CHAT_ENABLE_COMPRESSION', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Conversation Settings
    |--------------------------------------------------------------------------
    */
    'conversations' => [
        'max_per_user' => env('CHAT_MAX_CONVERSATIONS_PER_USER', 50),
        'auto_archive_days' => env('CHAT_AUTO_ARCHIVE_DAYS', 30),
        'max_messages_per_conversation' => env('CHAT_MAX_MESSAGES_PER_CONVERSATION', 200),
        'enable_auto_title_generation' => env('CHAT_AUTO_TITLE_GENERATION', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Context Building
    |--------------------------------------------------------------------------
    */
    'context' => [
        'cache_ttl_minutes' => env('CHAT_CONTEXT_CACHE_TTL', 30),
        'max_keywords' => env('CHAT_MAX_KEYWORDS', 10),
        'enable_user_context' => env('CHAT_ENABLE_USER_CONTEXT', true),
        'enable_conversation_history' => env('CHAT_ENABLE_CONVERSATION_HISTORY', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |--------------------------------------------------------------------------
    */
    'rate_limits' => [
        'messages_per_minute' => env('CHAT_RATE_LIMIT_MESSAGES_PER_MINUTE', 10),
        'messages_per_hour' => env('CHAT_RATE_LIMIT_MESSAGES_PER_HOUR', 100),
        'conversations_per_day' => env('CHAT_RATE_LIMIT_CONVERSATIONS_PER_DAY', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Features
    |--------------------------------------------------------------------------
    */
    'features' => [
        'enable_message_reactions' => env('CHAT_ENABLE_MESSAGE_REACTIONS', false),
        'enable_message_editing' => env('CHAT_ENABLE_MESSAGE_EDITING', false),
        'enable_conversation_sharing' => env('CHAT_ENABLE_CONVERSATION_SHARING', false),
        'enable_message_export' => env('CHAT_ENABLE_MESSAGE_EXPORT', true),
        'enable_conversation_search' => env('CHAT_ENABLE_CONVERSATION_SEARCH', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | UI Configuration
    |--------------------------------------------------------------------------
    */
    'ui' => [
        'messages_per_page' => env('CHAT_MESSAGES_PER_PAGE', 50),
        'auto_scroll' => env('CHAT_AUTO_SCROLL', true),
        'show_token_usage' => env('CHAT_SHOW_TOKEN_USAGE', true),
        'show_timestamps' => env('CHAT_SHOW_TIMESTAMPS', true),
        'enable_markdown' => env('CHAT_ENABLE_MARKDOWN', true),
        'enable_code_highlighting' => env('CHAT_ENABLE_CODE_HIGHLIGHTING', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Security
    |--------------------------------------------------------------------------
    */
    'security' => [
        'max_message_length' => env('CHAT_MAX_MESSAGE_LENGTH', 4000),
        'enable_content_filtering' => env('CHAT_ENABLE_CONTENT_FILTERING', true),
        'blocked_patterns' => [
            // Add patterns to block if needed
        ],
        'enable_spam_detection' => env('CHAT_ENABLE_SPAM_DETECTION', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    */
    'logging' => [
        'log_conversations' => env('CHAT_LOG_CONVERSATIONS', true),
        'log_ai_requests' => env('CHAT_LOG_AI_REQUESTS', true),
        'log_errors' => env('CHAT_LOG_ERRORS', true),
        'log_performance' => env('CHAT_LOG_PERFORMANCE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Performance
    |--------------------------------------------------------------------------
    */
    'performance' => [
        'enable_caching' => env('CHAT_ENABLE_CACHING', true),
        'cache_conversations' => env('CHAT_CACHE_CONVERSATIONS', true),
        'cache_user_context' => env('CHAT_CACHE_USER_CONTEXT', true),
        'enable_pagination' => env('CHAT_ENABLE_PAGINATION', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Backup and Export
    |--------------------------------------------------------------------------
    */
    'backup' => [
        'enable_auto_backup' => env('CHAT_ENABLE_AUTO_BACKUP', false),
        'backup_frequency_days' => env('CHAT_BACKUP_FREQUENCY_DAYS', 7),
        'retention_days' => env('CHAT_BACKUP_RETENTION_DAYS', 90),
        'export_formats' => ['json', 'csv', 'pdf'],
    ],
];
