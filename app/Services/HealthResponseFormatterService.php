<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class HealthResponseFormatterService
{
    protected WebSearchService $webSearchService;

    public function __construct(WebSearchService $webSearchService)
    {
        $this->webSearchService = $webSearchService;
    }

    /**
     * Health status levels with their characteristics
     */
    protected array $statusLevels = [
        'critical' => [
            'label' => 'Critical',
            'color' => 'red',
            'description' => 'Immediate emergency care required',
            'action' => 'Call 911 or go to emergency room immediately',
            'urgency' => 'Emergency - Act Now'
        ],
        'urgent' => [
            'label' => 'Urgent',
            'color' => 'orange', 
            'description' => 'Medical attention needed within 24 hours',
            'action' => 'Contact your doctor or urgent care today',
            'urgency' => 'See Doctor Today'
        ],
        'medium' => [
            'label' => 'Medium',
            'color' => 'yellow',
            'description' => 'Should be evaluated by healthcare provider',
            'action' => 'Schedule appointment within 1-2 weeks',
            'urgency' => 'Schedule Appointment'
        ],
        'light' => [
            'label' => 'Light',
            'color' => 'blue',
            'description' => 'Monitor symptoms and consider medical advice',
            'action' => 'Watch symptoms, see doctor if worsens',
            'urgency' => 'Monitor & Consider Care'
        ],
        'normal' => [
            'label' => 'Normal',
            'color' => 'green',
            'description' => 'General health information and advice',
            'action' => 'Continue healthy practices',
            'urgency' => 'Informational'
        ]
    ];

    /**
     * Format a health response with structure and product search
     */
    public function formatHealthResponse(string $aiResponse, string $userMessage, array $userProfile = []): array
    {
        try {
            // Parse the AI response to extract components
            $parsedResponse = $this->parseAIResponse($aiResponse);
            
            // Determine health status level
            $statusLevel = $this->determineStatusLevel($aiResponse, $userMessage);
            
            // Extract product recommendations
            $recommendations = $this->extractRecommendations($aiResponse);
            
            // Search for product links if recommendations exist
            $productLinks = [];
            if (!empty($recommendations)) {
                $searchResults = $this->webSearchService->searchProducts($recommendations);
                $productLinks = $searchResults;
            }

            // Generate summary and details
            $summary = $this->generateSummary($parsedResponse, $statusLevel);
            $details = $this->generateDetails($parsedResponse, $userProfile);

            return [
                'status' => [
                    'level' => $statusLevel,
                    'info' => $this->statusLevels[$statusLevel],
                    'timestamp' => now()->toISOString()
                ],
                'summary' => $summary,
                'details' => $details,
                'recommendations' => [
                    'general' => $recommendations,
                    'products' => $productLinks
                ],
                'action_items' => $this->generateActionItems($statusLevel, $recommendations),
                'disclaimers' => $this->getDisclaimers($statusLevel),
                'original_response' => $aiResponse
            ];
        } catch (\Exception $e) {
            Log::error('Health response formatting error: ' . $e->getMessage());
            
            return [
                'status' => [
                    'level' => 'normal',
                    'info' => $this->statusLevels['normal']
                ],
                'summary' => 'General health information provided.',
                'details' => $aiResponse,
                'recommendations' => ['general' => [], 'products' => []],
                'action_items' => ['Consult healthcare provider for personalized advice'],
                'disclaimers' => $this->getDisclaimers('normal'),
                'original_response' => $aiResponse
            ];
        }
    }

    /**
     * Parse AI response to extract structured information
     */
    protected function parseAIResponse(string $response): array
    {
        // Look for structured sections in the response
        $sections = [
            'main_content' => $response,
            'recommendations' => [],
            'warnings' => [],
            'follow_up' => []
        ];

        // Extract recommendations (looking for bullet points or numbered lists)
        if (preg_match_all('/(?:recommend|suggest|try|consider).*?([^\n\r.]+)/i', $response, $matches)) {
            $sections['recommendations'] = array_unique($matches[1]);
        }

        // Extract warnings (looking for warning keywords)
        if (preg_match_all('/(?:warning|caution|important|urgent|emergency|serious).*?([^\n\r.]+)/i', $response, $matches)) {
            $sections['warnings'] = array_unique($matches[1]);
        }

        return $sections;
    }

    /**
     * Determine health status level based on keywords and context
     */
    protected function determineStatusLevel(string $response, string $userMessage): string
    {
        $response = strtolower($response . ' ' . $userMessage);

        // Critical keywords
        $criticalKeywords = [
            'emergency', 'call 911', 'life threatening', 'severe chest pain',
            'difficulty breathing', 'unconscious', 'severe bleeding', 'stroke',
            'heart attack', 'suicidal', 'overdose', 'anaphylaxis'
        ];

        // Urgent keywords  
        $urgentKeywords = [
            'urgent', 'immediate', 'see doctor today', 'high fever', 'severe pain',
            'persistent vomiting', 'dehydration', 'infection', 'concerning symptoms'
        ];

        // Medium keywords
        $mediumKeywords = [
            'schedule appointment', 'see doctor', 'medical evaluation', 'persistent',
            'recurring', 'ongoing', 'chronic', 'monitor closely'
        ];

        // Light keywords
        $lightKeywords = [
            'monitor', 'watch', 'mild', 'minor', 'self-care', 'home remedy',
            'rest', 'over-the-counter'
        ];

        foreach ($criticalKeywords as $keyword) {
            if (str_contains($response, $keyword)) {
                return 'critical';
            }
        }

        foreach ($urgentKeywords as $keyword) {
            if (str_contains($response, $keyword)) {
                return 'urgent';
            }
        }

        foreach ($mediumKeywords as $keyword) {
            if (str_contains($response, $keyword)) {
                return 'medium';
            }
        }

        foreach ($lightKeywords as $keyword) {
            if (str_contains($response, $keyword)) {
                return 'light';
            }
        }

        return 'normal';
    }

    /**
     * Extract product/treatment recommendations from response
     */
    protected function extractRecommendations(string $response): array
    {
        $recommendations = [];

        // Common health product patterns
        $patterns = [
            '/(?:take|use|try|consider|recommend).*?(vitamin [A-Z0-9]+)/i',
            '/(?:take|use|try|consider|recommend).*?(pain reliever|ibuprofen|acetaminophen|aspirin)/i',
            '/(?:take|use|try|consider|recommend).*?(thermometer)/i',
            '/(?:take|use|try|consider|recommend).*?(blood pressure monitor)/i',
            '/(?:take|use|try|consider|recommend).*?(first aid kit)/i',
            '/(?:take|use|try|consider|recommend).*?(heating pad|ice pack)/i',
            '/(?:take|use|try|consider|recommend).*?(humidifier)/i',
            '/(?:take|use|try|consider|recommend).*?(supplement)/i'
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $response, $matches)) {
                $recommendations = array_merge($recommendations, $matches[1]);
            }
        }

        return array_unique($recommendations);
    }

    /**
     * Generate concise summary
     */
    protected function generateSummary(array $parsedResponse, string $statusLevel): string
    {
        $statusInfo = $this->statusLevels[$statusLevel];
        
        // Extract first sentence or main point
        $mainContent = $parsedResponse['main_content'];
        $sentences = preg_split('/[.!?]+/', $mainContent);
        $firstSentence = trim($sentences[0] ?? '');

        return sprintf(
            "[%s] %s. %s",
            $statusInfo['label'],
            $firstSentence,
            $statusInfo['action']
        );
    }

    /**
     * Generate detailed explanation
     */
    protected function generateDetails(array $parsedResponse, array $userProfile): string
    {
        $details = $parsedResponse['main_content'];

        // Add personalization based on user profile
        if (!empty($userProfile)) {
            $personalizations = [];
            
            if (isset($userProfile['age'])) {
                $personalizations[] = "Given your age ({$userProfile['age']}), ";
            }
            
            if (isset($userProfile['chronic_conditions']) && $userProfile['chronic_conditions']) {
                $personalizations[] = "Considering your medical history ({$userProfile['chronic_conditions']}), ";
            }
            
            if (isset($userProfile['allergies']) && $userProfile['allergies']) {
                $personalizations[] = "Please note your allergies to {$userProfile['allergies']} when selecting treatments. ";
            }

            if (!empty($personalizations)) {
                $details = implode('', $personalizations) . $details;
            }
        }

        return $details;
    }

    /**
     * Generate action items based on status and recommendations
     */
    protected function generateActionItems(string $statusLevel, array $recommendations): array
    {
        $actions = [];
        $statusInfo = $this->statusLevels[$statusLevel];

        // Primary action based on status
        $actions[] = $statusInfo['action'];

        // Add recommendation-specific actions
        if (!empty($recommendations)) {
            $actions[] = "Consider the recommended products/treatments mentioned above";
        }

        // Always add consultation reminder
        if ($statusLevel !== 'critical') {
            $actions[] = "Consult with your healthcare provider for personalized medical advice";
        }

        return array_unique($actions);
    }

    /**
     * Get appropriate disclaimers based on status level
     */
    protected function getDisclaimers(string $statusLevel): array
    {
        $disclaimers = [
            "This AI assistant provides general health information only",
            "Always consult qualified healthcare professionals for medical decisions",
            "Information provided is not a substitute for professional medical advice"
        ];

        if ($statusLevel === 'critical') {
            array_unshift($disclaimers, "If this is a medical emergency, call 911 or seek immediate emergency care");
        }

        return $disclaimers;
    }
}
