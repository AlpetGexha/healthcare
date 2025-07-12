import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
    AlertTriangle, 
    Info, 
    ExternalLink, 
    ChevronDown, 
    ChevronUp,
    ShoppingCart,
    Clock,
    Heart,
    AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProductRecommendation {
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
}

interface FormattedResponse {
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
    product_recommendations?: ProductRecommendation[];
    warnings?: string[];
    when_to_seek_help?: string[];
    additional_resources?: {
        title: string;
        description: string;
        contact: string;
        type: string;
    }[];
}

interface EnhancedChatResponseProps {
    response: FormattedResponse;
    enableMarkdown?: boolean;
    className?: string;
}

const getUrgencyIcon = (level: string) => {
    switch (level) {
        case 'critical':
            return <AlertTriangle className="h-4 w-4" />;
        case 'urgent':
            return <AlertCircle className="h-4 w-4" />;
        case 'medium':
            return <Clock className="h-4 w-4" />;
        case 'light':
            return <Heart className="h-4 w-4" />;
        default:
            return <Info className="h-4 w-4" />;
    }
};

const getUrgencyVariant = (level: string) => {
    switch (level) {
        case 'critical':
            return 'destructive';
        case 'urgent':
            return 'destructive';
        case 'medium':
            return 'secondary';
        case 'light':
            return 'outline';
        default:
            return 'secondary';
    }
};

export const EnhancedChatResponse: React.FC<EnhancedChatResponseProps> = ({
    response,
    enableMarkdown = true,
    className = ''
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const [showProducts, setShowProducts] = useState(false);
    const [showResources, setShowResources] = useState(false);

    const renderContent = (content: string) => {
        if (enableMarkdown) {
            return (
                <div className="prose prose-sm max-w-none dark:prose-invert text-[13px] sm:text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>
            );
        }
        return <p className="whitespace-pre-wrap text-[13px] sm:text-sm">{content}</p>;
    };

    return (
        <div className={`space-y-3 sm:space-y-4 ${className}`}>
            {/* Summary with Urgency Badge */}
            <div className="flex items-start gap-2 sm:gap-3">
                <Badge 
                    variant={getUrgencyVariant(response.urgency_level.level)}
                    className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[10px] sm:text-xs"
                >
                    {getUrgencyIcon(response.urgency_level.level)}
                    <span className="hidden xs:inline">{response.urgency_level.level.toUpperCase()}</span>
                </Badge>
                <div className="flex-1">
                    <p className="font-medium text-xs sm:text-sm leading-relaxed">
                        {response.summary}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {response.urgency_level.description}
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-3">
                {renderContent(response.details.main_content)}
            </div>

            {/* Warnings (if any) */}
            {response.warnings && response.warnings.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-orange-800 dark:text-orange-200">
                            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                            Important Warnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                        <ul className="space-y-0.5 sm:space-y-1">
                            {response.warnings.map((warning, index) => (
                                <li key={index} className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                                    • {warning}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Next Steps */}
            {response.next_steps && response.next_steps.length > 0 && (
                <Card className="shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm">Recommended Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                        <div className="space-y-1.5 sm:space-y-2">
                            {response.next_steps.map((step, index) => (
                                <div key={index} className="flex items-center gap-1 sm:gap-2">
                                    <Badge 
                                        variant={step.priority === 'critical' ? 'destructive' : 'secondary'}
                                        className="text-[10px] sm:text-xs px-1.5 py-0 h-5"
                                    >
                                        {step.priority}
                                    </Badge>
                                    <span className="text-xs sm:text-sm">{step.action}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Product Recommendations */}
            {response.product_recommendations && response.product_recommendations.length > 0 && (
                <Collapsible open={showProducts} onOpenChange={setShowProducts}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-xs sm:text-sm py-1.5 sm:py-2 h-auto">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                                Product Recommendations ({response.product_recommendations.length})
                            </div>
                            {showProducts ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                            {response.product_recommendations.map((rec, index) => (
                                <Card key={index} className="shadow-sm">
                                    <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                                        <CardTitle className="text-xs sm:text-sm">{rec.product.name}</CardTitle>
                                        <CardDescription className="text-[10px] sm:text-xs">
                                            Category: {rec.product.category}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                                        <div className="space-y-2">
                                            {rec.links.map((link, linkIndex) => (
                                                <div key={linkIndex} className="flex items-center justify-between p-1.5 sm:p-2 bg-muted rounded-lg">
                                                    <div className="flex-1">
                                                        <h5 className="text-[10px] sm:text-xs font-medium">{link.title}</h5>
                                                        <p className="text-[9px] sm:text-xs text-muted-foreground">{link.description}</p>
                                                        <p className="text-[9px] sm:text-xs text-muted-foreground">Source: {link.source}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(link.url, '_blank')}
                                                        className="ml-1 sm:ml-2 h-6 sm:h-8 px-1.5 sm:px-2"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Key Points */}
            {response.details.key_points && response.details.key_points.length > 0 && (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-xs sm:text-sm py-1.5 sm:py-2 h-auto">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                                Additional Details
                            </div>
                            {showDetails ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                            <Card className="shadow-sm">
                                <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                                    <CardTitle className="text-xs sm:text-sm">Key Points</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                                    <ul className="space-y-0.5 sm:space-y-1">
                                        {response.details.key_points.map((point, index) => (
                                            <li key={index} className="text-xs sm:text-sm">• {point}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Symptoms, Conditions, Treatments */}
                            {(response.details.symptoms_mentioned?.length || 
                              response.details.conditions_mentioned?.length || 
                              response.details.treatments_mentioned?.length) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                    {response.details.symptoms_mentioned && response.details.symptoms_mentioned.length > 0 && (
                                        <Card className="shadow-sm">
                                            <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                                                <CardTitle className="text-xs">Symptoms Mentioned</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                                                <div className="flex flex-wrap gap-1">
                                                    {response.details.symptoms_mentioned.map((symptom, index) => (
                                                        <Badge key={index} variant="outline" className="text-[10px] sm:text-xs px-1 py-0 h-5">
                                                            {symptom}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {response.details.conditions_mentioned && response.details.conditions_mentioned.length > 0 && (
                                        <Card className="shadow-sm">
                                            <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                                                <CardTitle className="text-xs">Conditions Mentioned</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                                                <div className="flex flex-wrap gap-1">
                                                    {response.details.conditions_mentioned.map((condition, index) => (
                                                        <Badge key={index} variant="outline" className="text-[10px] sm:text-xs px-1 py-0 h-5">
                                                            {condition}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {response.details.treatments_mentioned && response.details.treatments_mentioned.length > 0 && (
                                        <Card className="shadow-sm">
                                            <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                                                <CardTitle className="text-xs">Treatments Mentioned</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                                                <div className="flex flex-wrap gap-1">
                                                    {response.details.treatments_mentioned.map((treatment, index) => (
                                                        <Badge key={index} variant="outline" className="text-[10px] sm:text-xs px-1 py-0 h-5">
                                                            {treatment}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* When to Seek Help */}
            {response.when_to_seek_help && response.when_to_seek_help.length > 0 && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 shadow-sm">
                    <CardHeader className="pb-1 sm:pb-2 px-3 py-2 sm:p-4">
                        <CardTitle className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2 text-blue-800 dark:text-blue-200">
                            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                            When to Seek Medical Help
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 pb-2 sm:p-4 sm:pt-0">
                        <ul className="space-y-0.5 sm:space-y-1">
                            {response.when_to_seek_help.map((criteria, index) => (
                                <li key={index} className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                                    • {criteria}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Additional Resources */}
            {response.additional_resources && response.additional_resources.length > 0 && (
                <Collapsible open={showResources} onOpenChange={setShowResources}>
                    <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-xs sm:text-sm py-1.5 sm:py-2 h-auto">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                                Additional Resources
                            </div>
                            {showResources ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="mt-2 sm:mt-3 space-y-2">
                            {response.additional_resources.map((resource, index) => (
                                <Card key={index} className="shadow-sm">
                                    <CardContent className="p-2 sm:p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h5 className="text-xs sm:text-sm font-medium">{resource.title}</h5>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground">{resource.description}</p>
                                                <p className="text-[10px] sm:text-xs font-mono">{resource.contact}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] sm:text-xs ml-1">
                                                {resource.type}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
};
