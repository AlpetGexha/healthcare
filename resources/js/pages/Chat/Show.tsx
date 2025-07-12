import React, { useState, useEffect, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bot, User, Send, ArrowLeft, RefreshCw, Settings,
    BarChart3, Download, Archive, Trash2, AlertCircle
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    token_count: number;
    metadata?: any;
    created_at: string;
}

interface Conversation {
    id: number;
    title: string;
    last_activity_at: string;
    token_usage: number;
    is_active: boolean;
    created_at: string;
    user: any;
}

interface TokenStats {
    total_messages: number;
    total_tokens: number;
    user_tokens: number;
    assistant_tokens: number;
    average_tokens_per_message: number;
    compression_needed: boolean;
    message_count: number;
    duration_minutes: number;
}

interface ChatConfig {
    max_message_length: number;
    show_token_usage: boolean;
    enable_markdown: boolean;
}

interface ChatShowProps {
    conversation: Conversation;
    messages: {
        data: Message[];
        links: any;
        meta: any;
    };
    token_stats: TokenStats;
    config: ChatConfig;
}

export default function ChatShow({ conversation, messages: messagesData, token_stats, config }: ChatShowProps) {
    const [messages, setMessages] = useState<Message[]>(messagesData.data || []);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [showTokenUsage, setShowTokenUsage] = useState(config.show_token_usage);
    const [tokenStats, setTokenStats] = useState<TokenStats>(token_stats);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);

    const breadcrumbs = [
        { title: 'Chat', href: '/chat' },
        { title: conversation.title || 'Conversation', href: `/chat/${conversation.id}` },
    ];

    useEffect(() => {
        scrollToBottom();
        messageInputRef.current?.focus();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getCSRFToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        // Add user message to UI immediately
        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: messageText,
            token_count: Math.ceil(messageText.length / 4),
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await fetch(`/chat/${conversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ message: messageText })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Replace the temporary user message with the actual ones
                setMessages(prev => {
                    const filtered = prev.filter(msg => msg.id !== userMessage.id);
                    return [...filtered, data.user_message, data.assistant_message];
                });

                // Update token stats
                if (data.token_usage) {
                    loadTokenStats();
                }
            } else {
                throw new Error(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
            alert(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
            setNewMessage(messageText); // Restore message
        } finally {
            setSending(false);
        }
    };

    const loadTokenStats = async () => {
        try {
            const response = await fetch(`/chat/${conversation.id}/stats`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setTokenStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load token stats:', error);
        }
    };

    const exportConversation = async (format: string = 'json') => {
        try {
            const response = await fetch(`/chat/${conversation.id}/export?format=${format}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data.data, null, 2)],
                    { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export conversation:', error);
        }
    };

    const archiveConversation = async () => {
        try {
            const response = await fetch(`/chat/${conversation.id}/archive`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                router.visit('/chat');
            }
        } catch (error) {
            console.error('Failed to archive conversation:', error);
            alert('Failed to archive conversation. Please try again.');
        }
    };

    const deleteConversation = async () => {
        if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/chat/${conversation.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                router.visit('/chat');
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            alert('Failed to delete conversation. Please try again.');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={conversation.title || 'Conversation'} />

            <div className="flex flex-col h-[calc(100vh-120px)]">
                {/* Header */}
                <div className="p-4 border-b bg-card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.visit('/chat')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Chat
                            </Button>

                            <div>
                                <h1 className="font-semibold text-lg">
                                    {conversation.title || 'Untitled Conversation'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Started {formatTimestamp(conversation.created_at)}
                                    {tokenStats.duration_minutes > 0 && (
                                        <> • {tokenStats.duration_minutes} minutes</>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {showTokenUsage && (
                                <Card className="px-3 py-2">
                                    <div className="flex items-center space-x-4 text-sm">
                                        <div className="flex items-center">
                                            <BarChart3 className="h-4 w-4 mr-1" />
                                            <span className="font-medium">{tokenStats.total_tokens}</span>
                                            <span className="text-muted-foreground ml-1">tokens</span>
                                        </div>
                                        <div className="text-muted-foreground">
                                            {tokenStats.message_count} messages
                                        </div>
                                        {tokenStats.compression_needed && (
                                            <Badge variant="destructive" className="text-xs">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Compression needed
                                            </Badge>
                                        )}
                                    </div>
                                </Card>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Options
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => setShowTokenUsage(!showTokenUsage)}
                                    >
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        {showTokenUsage ? 'Hide' : 'Show'} Token Usage
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportConversation()}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export Conversation
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={archiveConversation}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive Conversation
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={deleteConversation}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Conversation
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="max-w-4xl mx-auto">
                        {messages.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No messages yet. Start the conversation below.
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`mb-6 flex ${
                                        message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    <div className={`flex max-w-[80%] ${
                                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}>
                                        <Avatar className="w-8 h-8 mt-1">
                                            <AvatarFallback>
                                                {message.role === 'user' ? (
                                                    <User className="h-4 w-4" />
                                                ) : (
                                                    <Bot className="h-4 w-4" />
                                                )}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className={`mx-3 ${
                                            message.role === 'user' ? 'text-right' : 'text-left'
                                        }`}>
                                            <div className={`rounded-lg p-4 ${
                                                message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                            }`}>
                                                {config.enable_markdown ? (
                                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                                <span>{formatTimestamp(message.created_at)}</span>
                                                {showTokenUsage && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {message.token_count} tokens
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-card">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={sendMessage} className="space-y-3">
                            <Textarea
                                ref={messageInputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Continue the conversation..."
                                className="min-h-[80px] resize-none"
                                maxLength={config.max_message_length}
                                disabled={sending}
                            />

                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                    {newMessage.length}/{config.max_message_length} characters
                                </div>

                                <Button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="min-w-[100px]"
                                >
                                    {sending ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send Message
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
