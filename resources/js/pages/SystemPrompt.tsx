import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    AlertCircle, 
    CheckCircle2, 
    Save, 
    RefreshCw, 
    Copy,
    User,
    Heart,
    Shield,
    Lightbulb,
    FileText
} from 'lucide-react';

interface Guideline {
    title: string;
    description: string;
    points: string[];
}

interface Guidelines {
    personalization: Guideline;
    tone: Guideline;
    safety: Guideline;
}

interface Config {
    model: string;
    api_configured: boolean;
}

interface SystemPromptProps {
    currentPrompt: string;
    guidelines: Guidelines;
    examplePrompt: string;
    config: Config;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'System Prompt', href: '/system-prompt' },
];

export default function SystemPrompt({ currentPrompt, guidelines, examplePrompt, config }: SystemPromptProps) {
    const [prompt, setPrompt] = useState(currentPrompt);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSave = async () => {
        if (!prompt.trim()) {
            setMessage({ type: 'error', text: 'System prompt cannot be empty.' });
            return;
        }

        if (prompt.length < 50) {
            setMessage({ type: 'error', text: 'System prompt must be at least 50 characters long.' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/system-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
            } else {
                throw new Error(data.error || 'Failed to update system prompt');
            }
        } catch (error) {
            console.error('Failed to update system prompt:', error);
            setMessage({ 
                type: 'error', 
                text: error instanceof Error ? error.message : 'Failed to update system prompt. Please try again.' 
            });
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: 'Copied to clipboard!' });
        setTimeout(() => setMessage(null), 2000);
    };

    const useExamplePrompt = () => {
        setPrompt(examplePrompt);
        setMessage({ type: 'success', text: 'Example prompt loaded. Don\'t forget to save!' });
    };

    const resetPrompt = () => {
        setPrompt(currentPrompt);
        setMessage({ type: 'success', text: 'Prompt reset to current saved version.' });
    };

    const GuidelineCard = ({ guideline, icon: Icon, color }: { guideline: Guideline; icon: any; color: string }) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    {guideline.title}
                </CardTitle>
                <CardDescription>{guideline.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {guideline.points.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{point}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Prompt Management" />
            
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">System Prompt Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Configure the AI assistant's behavior and personality for personalized healthcare conversations.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant={config.api_configured ? "default" : "destructive"}>
                            {config.api_configured ? "API Configured" : "API Not Configured"}
                        </Badge>
                        <Badge variant="outline">Model: {config.model}</Badge>
                    </div>
                </div>

                {message && (
                    <Alert className={message.type === 'error' ? 'border-destructive bg-destructive/10' : 'border-green-500 bg-green-50 dark:bg-green-950'}>
                        {message.type === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-700 dark:text-green-400'}>
                            {message.text}
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="editor" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="editor" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Prompt Editor
                        </TabsTrigger>
                        <TabsTrigger value="guidelines" className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Guidelines
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    System Prompt Editor
                                </CardTitle>
                                <CardDescription>
                                    Define how the AI assistant should behave, what information to use, and safety guidelines to follow.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="prompt" className="text-sm font-medium">
                                        System Prompt (minimum 50 characters)
                                    </label>
                                    <Textarea
                                        id="prompt"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Enter the system prompt that will guide the AI assistant's behavior..."
                                        className="min-h-[200px] font-mono text-sm"
                                    />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Characters: {prompt.length} / 5000</span>
                                        <span className={prompt.length < 50 ? 'text-destructive' : 'text-green-600'}>
                                            {prompt.length < 50 ? `Need ${50 - prompt.length} more characters` : 'Length OK'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving || prompt.length < 50}
                                        className="flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {saving ? 'Saving...' : 'Save Prompt'}
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        onClick={useExamplePrompt}
                                        className="flex items-center gap-2"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Use Example Prompt
                                    </Button>
                                    
                                    <Button 
                                        variant="outline" 
                                        onClick={resetPrompt}
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Reset to Saved
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Example Healthcare System Prompt</CardTitle>
                                <CardDescription>
                                    A recommended system prompt that follows best practices for healthcare chatbots
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative">
                                    <Textarea
                                        value={examplePrompt}
                                        readOnly
                                        className="min-h-[120px] font-mono text-sm bg-muted"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="absolute top-2 right-2"
                                        onClick={() => copyToClipboard(examplePrompt)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="guidelines" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                            <GuidelineCard 
                                guideline={guidelines.personalization} 
                                icon={User} 
                                color="text-blue-500" 
                            />
                            <GuidelineCard 
                                guideline={guidelines.tone} 
                                icon={Heart} 
                                color="text-pink-500" 
                            />
                            <GuidelineCard 
                                guideline={guidelines.safety} 
                                icon={Shield} 
                                color="text-green-500" 
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Implementation Checklist</CardTitle>
                                <CardDescription>
                                    Ensure your system prompt includes these essential elements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm">Core Requirements</h4>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Incorporate patient profile details
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Use clear, empathetic language
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Include safety disclaimers
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Avoid medical diagnosis
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm">Safety Protocols</h4>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Emergency situation recognition
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Professional consultation reminders
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Privacy and data protection
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Clear AI limitations
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
