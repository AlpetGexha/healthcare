import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Bot, RefreshCw, Send } from 'lucide-react';

interface TestResult {
    success: boolean;
    message?: string;
    response?: any;
    error?: string;
}

interface Config {
    model: string;
    api_configured: boolean;
}

interface TestAIProps {
    testResult: TestResult;
    config: Config;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'AI Test', href: '/test-ai' },
];

export default function TestAI({ testResult, config }: TestAIProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentResult, setCurrentResult] = useState<TestResult>(testResult);
    const [testMessage, setTestMessage] = useState('Hello AI! Please say hi back to confirm you are working correctly.');

    const runTest = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/test-ai', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                // Reload the page to get fresh test results
                window.location.reload();
            } else {
                setCurrentResult({
                    success: false,
                    error: 'Failed to run test. Please try again.'
                });
            }
        } catch (error) {
            setCurrentResult({
                success: false,
                error: 'Network error occurred. Please check your connection.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const testCustomMessage = async () => {
        if (!testMessage.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ message: testMessage.trim() })
            });

            const data = await response.json();

            if (data.success) {
                setCurrentResult({
                    success: true,
                    message: 'Custom message test successful!',
                    response: {
                        user_message: data.message_result.user_message.content,
                        assistant_message: data.message_result.assistant_message.content,
                    }
                });
            } else {
                setCurrentResult({
                    success: false,
                    error: data.error || 'Failed to send test message'
                });
            }
        } catch (error) {
            setCurrentResult({
                success: false,
                error: 'Failed to send custom test message'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI Test" />

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">AI System Test</h1>
                        <p className="text-muted-foreground">
                            Test the OpenAI integration to ensure everything is working correctly
                        </p>
                    </div>
                    <Button
                        onClick={runTest}
                        disabled={isLoading}
                        className="min-w-[120px]"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Bot className="h-4 w-4 mr-2" />
                        )}
                        {isLoading ? 'Testing...' : 'Run Test'}
                    </Button>
                </div>

                {/* Configuration Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Bot className="h-5 w-5 mr-2" />
                            Configuration Status
                        </CardTitle>
                        <CardDescription>
                            Current AI system configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="font-medium">API Key</span>
                                <Badge variant={config.api_configured ? "default" : "destructive"}>
                                    {config.api_configured ? 'Configured' : 'Not Configured'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="font-medium">Model</span>
                                <Badge variant="outline">
                                    {config.model}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Results */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            {currentResult.success ? (
                                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
                            )}
                            Connection Test Results
                        </CardTitle>
                        <CardDescription>
                            Basic connectivity test to OpenAI API
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg border ${
                                currentResult.success
                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                            }`}>
                                <div className="flex items-center mb-2">
                                    {currentResult.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                    )}
                                    <span className="font-medium">
                                        {currentResult.success ? 'Test Passed' : 'Test Failed'}
                                    </span>
                                </div>

                                {currentResult.message && (
                                    <p className="text-sm mb-2">{currentResult.message}</p>
                                )}

                                {currentResult.error && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        Error: {currentResult.error}
                                    </p>
                                )}

                                {currentResult.response && (
                                    <div className="mt-3 space-y-2">
                                        {currentResult.response.user_message && (
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded text-sm">
                                                <strong>You:</strong> {currentResult.response.user_message}
                                            </div>
                                        )}
                                        {currentResult.response.assistant_message && (
                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                                <strong>AI:</strong> {currentResult.response.assistant_message}
                                            </div>
                                        )}
                                        {currentResult.response.content && (
                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                                <strong>AI Response:</strong> {currentResult.response.content}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Custom Message Test */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Send className="h-5 w-5 mr-2" />
                            Custom Message Test
                        </CardTitle>
                        <CardDescription>
                            Send a custom message to test the full chat functionality
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Textarea
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                placeholder="Enter a test message..."
                                className="min-h-[80px]"
                                maxLength={500}
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {testMessage.length}/500 characters
                                </span>
                                <Button
                                    onClick={testCustomMessage}
                                    disabled={isLoading || !testMessage.trim() || !config.api_configured}
                                    className="min-w-[140px]"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    {isLoading ? 'Sending...' : 'Send Test Message'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Setup Instructions</CardTitle>
                        <CardDescription>
                            How to configure the AI system if tests are failing
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-medium mb-2">1. Configure OpenAI API Key</h4>
                                <p className="text-muted-foreground mb-2">
                                    Add your OpenAI API key to the .env file:
                                </p>
                                <code className="block p-2 bg-muted rounded text-xs">
                                    OPENAI_API_KEY=sk-your-actual-api-key-here
                                </code>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">2. Choose AI Model</h4>
                                <p className="text-muted-foreground mb-2">
                                    Set the desired OpenAI model in your .env file:
                                </p>
                                <code className="block p-2 bg-muted rounded text-xs">
                                    OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4
                                </code>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">3. Test the Configuration</h4>
                                <p className="text-muted-foreground">
                                    After making changes, restart your server and run the test again.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
