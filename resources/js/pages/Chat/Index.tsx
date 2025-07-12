import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Add extra-small screen utility class
import { cn } from '@/lib/utils';
// Apply the following Tailwind CSS utility classes in your project
// xs: '@media (min-width: 475px)';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FamilyMemberDropdown } from '@/components/family/family-member-dropdown';
import { useFamilyMembers } from '@/hooks/use-family-members';

import { EnhancedChatResponse } from '@/components/ui/enhanced-chat-response';
import {
    Bot, User, Send, Plus, Trash2, Search, MessageSquare,
    Archive, MoreVertical, Download, BarChart3, Clock,
    Settings, RefreshCw, AlertCircle, ArrowLeft, Menu
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Enhanced Types
interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    token_count: number;
    metadata?: any;
    created_at: string;
    formatted_response?: {
        summary: string;
        urgency_level: {
            level: string;
            confidence: number;
            badge_color: string;
            description: string;
        };
        details: {
            main_content: string;
            key_points?: string[];
            symptoms_mentioned?: string[];
            conditions_mentioned?: string[];
            treatments_mentioned?: string[];
        };
        next_steps?: {
            category: string;
            action: string;
            priority: string;
        }[];
        personalized_info?: any;
        product_recommendations?: {
            product: {
                name: string;
                context: string;
                category: string;
            };
            links: {
                title: string;
                url: string;
                description: string;
                source: string;
            }[];
            search_query: string;
        }[];
        warnings?: string[];
        when_to_seek_help?: string[];
        additional_resources?: {
            title: string;
            description: string;
            contact: string;
            type: string;
        }[];
    };
}

interface Conversation {
    id: number;
    title: string;
    last_activity_at: string;
    token_usage: number;
    is_active: boolean;
    created_at: string;
    messages?: Message[];
    profile?: {
        id: number;
        name: string;
        age: string;
        gender: boolean;
        chronic_conditions?: string;
        allergies?: string;
        medications?: string;
    };
}

interface TokenStats {
    total_messages: number;
    total_tokens: number;
    user_tokens: number;
    assistant_tokens: number;
    average_tokens_per_message: number;
    compression_needed: boolean;
}

interface ChatConfig {
    max_message_length: number;
    show_token_usage: boolean;
    enable_markdown: boolean;
    auto_scroll: boolean;
}

interface ChatIndexProps {
    conversations: {
        data: Conversation[];
        links: any;
        meta: any;
    };
    config: ChatConfig;
    active_profile_id?: string | null;
}

const breadcrumbs = [
    {
        title: 'Healthcare AI Assistant',
        href: '/chat',
    },
];

export default function ChatIndex({ conversations: conversationsData, config, active_profile_id }: ChatIndexProps) {
    const { props } = usePage();
    const [conversations, setConversations] = useState<Conversation[]>(conversationsData.data || []);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
    const [showTokenUsage, setShowTokenUsage] = useState(config.show_token_usage);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);

    // Parse the initial active member ID from props
    const initialActiveMemberId = useMemo(() => {
        if (active_profile_id === undefined || active_profile_id === null) return null;
        return active_profile_id === '0' || active_profile_id === 'null' 
            ? null 
            : parseInt(active_profile_id);
    }, [active_profile_id]);

    // Family members functionality
    const {
        familyMembers,
        activeMemberId,
        setActiveMemberId,
        addFamilyMember,
        updateFamilyMember,
        deleteFamilyMember,
        getHealthContext,
        getActiveMember
    } = useFamilyMembers(initialActiveMemberId);

    // Update conversations when they change from props
    useEffect(() => {
        setConversations(conversationsData.data || []);
    }, [conversationsData]);

    const scrollToBottom = () => {
        if (config.auto_scroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getCSRFToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    };

    const createNewConversation = async () => {
        if (!newMessage.trim()) {
            messageInputRef.current?.focus();
            return;
        }

        setSending(true);
        const messageText = newMessage.trim();
        setNewMessage('');

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ 
                    message: messageText,
                    profile_id: activeMemberId,
                    health_context: getHealthContext()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                const newConv = data.conversation;
                setConversations(prev => [newConv, ...prev]);
                setCurrentConversation(newConv);

                // Set initial messages
                if (data.message_result) {
                    setMessages([
                        data.message_result.user_message,
                        data.message_result.assistant_message
                    ]);

                    // Load token stats
                    loadTokenStats(newConv.id);
                }
            } else {
                throw new Error(data.error || 'Failed to create conversation');
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
            alert(error instanceof Error ? error.message : 'Failed to create conversation. Please try again.');
            setNewMessage(messageText); // Restore message
        } finally {
            setSending(false);
        }
    };

    const loadConversation = async (conversation: Conversation) => {
        if (currentConversation?.id === conversation.id) return;

        setLoading(true);
        setCurrentConversation(conversation);

        try {
            // Use the getMessages endpoint which returns JSON
            const response = await fetch(`/chat/${conversation.id}/messages`, {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setMessages(data.messages.data || []);
            } else {
                throw new Error(data.error || 'Failed to load messages');
            }

            // Load token stats separately
            loadTokenStats(conversation.id);
        } catch (error) {
            console.error('Failed to load conversation:', error);
            alert('Failed to load conversation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadTokenStats = async (conversationId: number) => {
        try {
            const response = await fetch(`/chat/${conversationId}/stats`, {
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

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentConversation || sending) return;

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
            const response = await fetch(`/chat/${currentConversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ 
                    message: messageText,
                    health_context: getHealthContext()
                })
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
                    
                    // Add formatted_response to assistant message if available
                    const assistantMessage = {
                        ...data.assistant_message,
                        formatted_response: data.formatted_response || null
                    };
                    
                    return [...filtered, data.user_message, assistantMessage];
                });

                // Update conversation in sidebar
                setConversations(prev =>
                    prev.map(conv =>
                        conv.id === currentConversation.id
                            ? { ...conv, last_activity_at: new Date().toISOString() }
                            : conv
                    )
                );

                // Update token stats
                if (data.token_usage) {
                    loadTokenStats(currentConversation.id);
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

    const deleteConversation = async (conversationId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/chat/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            if (currentConversation?.id === conversationId) {
                setCurrentConversation(null);
                setMessages([]);
                setTokenStats(null);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            alert('Failed to delete conversation. Please try again.');
        }
    };

    const archiveConversation = async (conversationId: number, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const response = await fetch(`/chat/${conversationId}/archive`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            if (currentConversation?.id === conversationId) {
                setCurrentConversation(null);
                setMessages([]);
                setTokenStats(null);
            }
        } catch (error) {
            console.error('Failed to archive conversation:', error);
            alert('Failed to archive conversation. Please try again.');
        }
    };

    const searchConversations = async () => {
        if (!searchQuery.trim()) {
            // Reset to original conversations
            setConversations(conversationsData.data || []);
            return;
        }

        try {
            const response = await fetch(`/chat/search?query=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations.data || []);
            }
        } catch (error) {
            console.error('Failed to search conversations:', error);
        }
    };

    const exportConversation = async (conversationId: number, format: string = 'json') => {
        try {
            const response = await fetch(`/chat/${conversationId}/export?format=${format}`, {
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

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (currentConversation) {
                sendMessage(e);
            } else {
                createNewConversation();
            }
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const filteredConversations = conversations.filter(conv =>
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery === ''
    );

    // State for controlling sidebar visibility on mobile
    const [showSidebar, setShowSidebar] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    
    // Effect to handle sidebar visibility and detect screen size
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            // Only auto-change sidebar visibility on initial load or when going from mobile to desktop
            if (mobile && !currentConversation) {
                setShowSidebar(false);
            } else if (!mobile) {
                setShowSidebar(true);
            }
        };
        
        // Set initial state
        handleResize();
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [currentConversation]);
    
    // Close sidebar when selecting a conversation on mobile
    useEffect(() => {
        if (currentConversation && isMobile) {
            setShowSidebar(false);
        }
    }, [currentConversation, isMobile]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Healthcare AI Assistant" />

            <div className="flex h-[calc(100vh-120px)] bg-background relative">
                {/* Mobile Menu Button */}
                <button 
                    className="md:hidden fixed top-4 left-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg"
                    onClick={() => setShowSidebar(!showSidebar)}
                    aria-label={showSidebar ? "Close sidebar" : "Open chats"}
                >
                    {showSidebar ? 
                        <ArrowLeft className="h-5 w-5" /> :
                        <Menu className="h-5 w-5" />
                    }
                </button>

                {/* Sidebar - conditionally shown on mobile */}
                <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-full md:w-80 border-r bg-card flex flex-col fixed md:relative z-40 h-full shadow-lg md:shadow-none`}>
                    {/* Family Member Dropdown */}
                    <div className="p-4 border-b">
                        <FamilyMemberDropdown
                            familyMembers={familyMembers}
                            activeMemberId={activeMemberId}
                            onMemberSelect={setActiveMemberId}
                            onMemberAdd={async (member) => {
                                const success = await addFamilyMember(member);
                                if (!success) {
                                    alert('Failed to add family member. Please try again.');
                                }
                            }}
                            onMemberUpdate={async (member) => {
                                const success = await updateFamilyMember(member);
                                if (!success) {
                                    alert('Failed to update family member. Please try again.');
                                }
                            }}
                            onMemberDelete={async (memberId) => {
                                if (confirm('Are you sure you want to delete this family member?')) {
                                    const success = await deleteFamilyMember(memberId);
                                    if (!success) {
                                        alert('Failed to delete family member. Please try again.');
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Conversations Section */}
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-lg">Conversations</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setCurrentConversation(null);
                                    setMessages([]);
                                    setTokenStats(null);
                                    messageInputRef.current?.focus();
                                }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Search */}
                        <div className="flex space-x-2">
                            <Input
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && searchConversations()}
                                className="flex-1"
                            />
                            <Button variant="outline" size="sm" onClick={searchConversations}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Conversations List */}
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            {filteredConversations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                                </div>
                            ) : (
                                filteredConversations.map((conversation) => (
                                    <Card
                                        key={conversation.id}
                                        className={`mb-1 cursor-pointer transition-colors hover:bg-accent ${
                                            currentConversation?.id === conversation.id ? 'bg-accent' : ''
                                        }`}
                                        onClick={() => loadConversation(conversation)}
                                    >
                                        <CardContent className="p-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium text-sm truncate">
                                                            {conversation.title || 'New Conversation'}
                                                        </h4>
                                                        {conversation.profile && (
                                                            <Badge 
                                                                variant="outline" 
                                                                className="text-xs flex items-center space-x-1"
                                                            >
                                                                <User className="h-3 w-3" />
                                                                <span>{conversation.profile.name}</span>
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatTimestamp(conversation.last_activity_at)}
                                                        </p>
                                                        {showTokenUsage && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {conversation.token_usage} tokens
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={(e) => exportConversation(conversation.id)}
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Export
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={(e) => archiveConversation(conversation.id, e)}
                                                        >
                                                            <Archive className="h-4 w-4 mr-2" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={(e) => deleteConversation(conversation.id, e)}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {currentConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b bg-card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="font-semibold text-lg">
                                            {currentConversation.title || 'Conversation'}
                                        </h1>
                                        <p className="text-sm text-muted-foreground">
                                            Started {formatTimestamp(currentConversation.created_at)}
                                        </p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        {showTokenUsage && tokenStats && (
                                            <Badge variant="outline" className="text-xs">
                                                <BarChart3 className="h-3 w-3 mr-1" />
                                                {tokenStats.total_tokens} tokens
                                                {tokenStats.compression_needed && (
                                                    <AlertCircle className="h-3 w-3 ml-1 text-yellow-500" />
                                                )}
                                            </Badge>
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
                                                <DropdownMenuItem
                                                    onClick={() => exportConversation(currentConversation.id)}
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Export Conversation
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => archiveConversation(currentConversation.id, e)}
                                                >
                                                    <Archive className="h-4 w-4 mr-2" />
                                                    Archive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`mb-6 flex ${
                                                message.role === 'user' ? 'justify-end' : 'justify-start'
                                            }`}
                                        >
                                            {message.role === 'user' ? (
                                                // User message (mobile optimized)
                                                <div className="flex max-w-[85%] sm:max-w-[80%] flex-row-reverse">
                                                    <Avatar className="hidden sm:flex w-8 h-8 mt-1">
                                                        <AvatarFallback>
                                                            <User className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="mx-0 sm:mx-3 text-right w-full">
                                                        <div className="rounded-lg p-2 sm:p-3 bg-primary text-primary-foreground">
                                                            {config.enable_markdown ? (
                                                                <div className="prose prose-sm max-w-none dark:prose-invert text-sm sm:text-base">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm]}
                                                                    >
                                                                        {message.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            ) : (
                                                                <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                                            <span className="text-[10px] sm:text-xs">{formatTimestamp(message.created_at)}</span>
                                                            {showTokenUsage && (
                                                                <span>{message.token_count} tokens</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Assistant message (mobile optimized)
                                                <div className="flex max-w-[85%] sm:max-w-[90%] flex-row">
                                                    <Avatar className="hidden sm:flex w-8 h-8 mt-1">
                                                        <AvatarFallback>
                                                            <Bot className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="mx-0 sm:mx-3 text-left w-full">
                                                        {message.formatted_response ? (
                                                            <div className="rounded-lg p-2 sm:p-3 bg-muted">
                                                                <EnhancedChatResponse 
                                                                    response={message.formatted_response}
                                                                    enableMarkdown={config.enable_markdown}
                                                                    className="text-sm sm:text-base"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-lg p-2 sm:p-3 bg-muted">
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
                                                        )}

                                                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                                            <span className="text-[10px] sm:text-xs">{formatTimestamp(message.created_at)}</span>
                                                            {showTokenUsage && (
                                                                <span className="text-[10px] sm:text-xs">{message.token_count} tokens</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </ScrollArea>

                            {/* Message Input - Mobile optimized */}
                            <div className="p-2 sm:p-4 border-t">
                                <form onSubmit={sendMessage} className="space-y-2">
                                    <Textarea
                                        ref={messageInputRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your healthcare question..."
                                        className="min-h-[60px] max-h-[150px] resize-none text-sm sm:text-base"
                                        maxLength={config.max_message_length}
                                        disabled={sending}
                                    />

                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                                            {newMessage.length}/{config.max_message_length} characters
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className="min-w-[60px] sm:min-w-[80px]"
                                            size="sm"
                                        >
                                            {sending ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline ml-1">Send</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="text-center max-w-md">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bot className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">
                                    Welcome to Healthcare AI Assistant
                                </h3>
                                <p className="text-muted-foreground mb-6 text-sm sm:text-base px-2">
                                    {activeMemberId && getActiveMember() 
                                        ? `Get healthcare information for ${getActiveMember()?.name}. New chats will use their health profile.`
                                        : 'Get healthcare information for yourself. Ask any health-related question to begin.'
                                    }
                                    <br className="hidden xs:block" />
                                    <span className="text-xs sm:text-sm block mt-2">
                                        Always consult with qualified healthcare providers for medical advice.
                                    </span>
                                </p>

                                <div className="space-y-4 px-2 sm:px-0">
                                    <Textarea
                                        ref={messageInputRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Ask about symptoms, conditions, treatments..."
                                        className="min-h-[80px] max-h-[150px] text-sm sm:text-base"
                                        maxLength={config.max_message_length}
                                        disabled={sending}
                                    />

                                    <div className="flex flex-col xs:flex-row gap-2 justify-end">
                                        <div className="text-[10px] sm:text-xs text-muted-foreground self-start xs:self-center">
                                            {newMessage.length}/{config.max_message_length} characters
                                        </div>
                                        
                                        <Button
                                            onClick={createNewConversation}
                                            disabled={!newMessage.trim() || sending}
                                            className="w-full xs:w-auto"
                                        >
                                            {sending ? (
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <MessageSquare className="h-4 w-4 mr-2" />
                                            )}
                                            <span className="text-sm sm:text-base">Start New Conversation</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
