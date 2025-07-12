<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ResponseFormattingService
{
    protected $urgencyKeywords = [
        'critical' => [
            'emergency', 'urgent', 'immediately', 'call 911', 'seek immediate medical attention',
            'life-threatening', 'severe pain', 'difficulty breathing', 'chest pain',
            'stroke', 'heart attack', 'bleeding', 'unconscious', 'seizure', 'overdose',
            'anaphylaxis', 'allergic reaction', 'poisoning', 'serious injury'
        ],
        'urgent' => [
            'doctor immediately', 'see a doctor soon', 'medical attention needed',
            'worsening symptoms', 'persistent pain', 'high fever', 'severe symptoms',
            'concerning symptoms', 'unusual symptoms', 'get medical help',
            'healthcare provider soon', 'don\'t delay', 'prompt medical care'
        ],
        'medium' => [
            'monitor symptoms', 'keep an eye on', 'watch for changes',
            'schedule appointment', 'consult doctor', 'see healthcare provider',
            'if symptoms persist', 'follow up', 'routine check', 'discuss with doctor',
            'consider seeing', 'may need', 'should see'
        ],
        'light' => [
            'general information', 'lifestyle changes', 'preventive measures',
            'self-care', 'home remedies', 'healthy habits', 'wellness tips',
            'maintenance', 'routine care', 'general advice', 'suggestions',
            'recommendations for', 'consider trying', 'you might'
        ]
    ];

    protected $actionKeywords = [
        'immediate' => ['call 911', 'emergency room', 'immediate medical attention', 'urgent care'],
        'schedule' => ['make appointment', 'schedule visit', 'see doctor', 'consult healthcare provider'],
        'monitor' => ['monitor symptoms', 'watch for', 'keep track of', 'observe'],
        'lifestyle' => ['exercise', 'diet', 'sleep', 'stress management', 'hydration'],
        'medication' => ['take medication', 'prescription', 'dosage', 'side effects']
    ];

    /**
     * Format AI response into structured output
     */
    public function formatResponse(string $aiResponse, array $productSearchResults = [], array $userProfile = []): array
    {
        // Analyze urgency level
        $urgencyLevel = $this->analyzeUrgency($aiResponse);
        
        // Generate summary
        $summary = $this->generateSummary($aiResponse, $urgencyLevel);
        
        // Extract key information
        $details = $this->extractDetails($aiResponse);
        
        // Identify next steps
        $nextSteps = $this->extractNextSteps($aiResponse);
        
        // Get personalized recommendations
        $personalizedInfo = $this->getPersonalizedInfo($aiResponse, $userProfile);
        
        // Format final response
        return [
            'formatted_response' => [
                'summary' => $summary,
                'urgency_level' => $urgencyLevel,
                'details' => $details,
                'next_steps' => $nextSteps,
                'personalized_info' => $personalizedInfo,
                'product_recommendations' => $productSearchResults,
                'warnings' => $this->extractWarnings($aiResponse),
                'when_to_seek_help' => $this->extractSeekHelpCriteria($aiResponse),
                'additional_resources' => $this->generateAdditionalResources($aiResponse),
                'timestamp' => now()->toISOString()
            ],
            'original_response' => $aiResponse,
            'response_metadata' => [
                'urgency_score' => $this->calculateUrgencyScore($aiResponse),
                'confidence_level' => $this->calculateConfidenceLevel($aiResponse),
                'response_type' => $this->classifyResponseType($aiResponse),
                'contains_recommendations' => !empty($productSearchResults)
            ]
        ];
    }

    /**
     * Analyze urgency level of the response
     */
    protected function analyzeUrgency(string $response): array
    {
        $response = strtolower($response);
        $scores = [
            'critical' => 0,
            'urgent' => 0,
            'medium' => 0,
            'light' => 0
        ];

        foreach ($this->urgencyKeywords as $level => $keywords) {
            foreach ($keywords as $keyword) {
                if (stripos($response, $keyword) !== false) {
                    $scores[$level]++;
                }
            }
        }

        // Determine primary level
        $primaryLevel = array_keys($scores, max($scores))[0];
        $confidence = max($scores) > 0 ? min(max($scores) * 20, 100) : 50;

        return [
            'level' => $primaryLevel,
            'confidence' => $confidence,
            'scores' => $scores,
            'badge_color' => $this->getUrgencyColor($primaryLevel),
            'description' => $this->getUrgencyDescription($primaryLevel)
        ];
    }

    /**
     * Generate a concise summary
     */
    protected function generateSummary(string $response, array $urgencyLevel): string
    {
        // Extract first meaningful sentence
        $sentences = preg_split('/[.!?]+/', $response);
        $summary = '';

        foreach ($sentences as $sentence) {
            $sentence = trim($sentence);
            if (strlen($sentence) > 20 && strlen($sentence) < 150) {
                $summary = $sentence;
                break;
            }
        }

        if (empty($summary)) {
            $summary = substr($response, 0, 100) . '...';
        }

        // Add urgency prefix if needed
        if ($urgencyLevel['level'] === 'critical') {
            $summary = "⚠️ URGENT: " . $summary;
        } elseif ($urgencyLevel['level'] === 'urgent') {
            $summary = "🚨 Important: " . $summary;
        }

        return $summary;
    }

    /**
     * Extract detailed information
     */
    protected function extractDetails(string $response): array
    {
        $details = [
            'main_content' => $response,
            'key_points' => $this->extractKeyPoints($response),
            'symptoms_mentioned' => $this->extractSymptoms($response),
            'conditions_mentioned' => $this->extractConditions($response),
            'treatments_mentioned' => $this->extractTreatments($response)
        ];

        return array_filter($details);
    }

    /**
     * Extract next steps from response
     */
    protected function extractNextSteps(string $response): array
    {
        $steps = [];
        $response = strtolower($response);

        foreach ($this->actionKeywords as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (stripos($response, $keyword) !== false) {
                    $steps[] = [
                        'category' => $category,
                        'action' => $this->getActionDescription($category),
                        'priority' => $this->getActionPriority($category)
                    ];
                    break;
                }
            }
        }

        // Add default steps if none found
        if (empty($steps)) {
            $steps[] = [
                'category' => 'general',
                'action' => 'Continue monitoring your health and consult with healthcare providers as needed',
                'priority' => 'low'
            ];
        }

        return $steps;
    }

    /**
     * Get personalized information based on user profile
     */
    protected function getPersonalizedInfo(string $response, array $userProfile): array
    {
        $personalizedInfo = [];

        if (!empty($userProfile)) {
            // Age-specific recommendations
            if (isset($userProfile['age'])) {
                $personalizedInfo['age_considerations'] = $this->getAgeSpecificInfo($userProfile['age'], $response);
            }

            // Condition-specific considerations
            if (isset($userProfile['chronic_conditions']) && !empty($userProfile['chronic_conditions'])) {
                $personalizedInfo['condition_considerations'] = $this->getConditionSpecificInfo($userProfile['chronic_conditions'], $response);
            }

            // Allergy considerations
            if (isset($userProfile['allergies']) && !empty($userProfile['allergies'])) {
                $personalizedInfo['allergy_warnings'] = $this->getAllergyWarnings($userProfile['allergies'], $response);
            }

            // Medication interactions
            if (isset($userProfile['medications']) && !empty($userProfile['medications'])) {
                $personalizedInfo['medication_considerations'] = $this->getMedicationConsiderations($userProfile['medications'], $response);
            }

            // Pregnancy considerations
            if (isset($userProfile['is_pregnant']) && $userProfile['is_pregnant']) {
                $personalizedInfo['pregnancy_considerations'] = $this->getPregnancyConsiderations($response);
            }
        }

        return $personalizedInfo;
    }

    /**
     * Extract key points from response
     */
    protected function extractKeyPoints(string $response): array
    {
        $points = [];
        
        // Look for bullet points or numbered lists
        if (preg_match_all('/(?:^|\n)(?:\d+\.|\-|\*)\s*(.+)$/m', $response, $matches)) {
            $points = array_map('trim', $matches[1]);
        } else {
            // Split by sentences and take meaningful ones
            $sentences = preg_split('/[.!?]+/', $response);
            foreach ($sentences as $sentence) {
                $sentence = trim($sentence);
                if (strlen($sentence) > 30 && strlen($sentence) < 200) {
                    $points[] = $sentence;
                }
            }
            $points = array_slice($points, 0, 5); // Limit to 5 points
        }

        return $points;
    }

    /**
     * Calculate urgency score (0-100)
     */
    protected function calculateUrgencyScore(string $response): int
    {
        $score = 0;
        $response = strtolower($response);

        foreach ($this->urgencyKeywords as $level => $keywords) {
            $multiplier = match($level) {
                'critical' => 25,
                'urgent' => 15,
                'medium' => 8,
                'light' => 3,
                default => 1
            };

            foreach ($keywords as $keyword) {
                if (stripos($response, $keyword) !== false) {
                    $score += $multiplier;
                }
            }
        }

        return min($score, 100);
    }

    /**
     * Get urgency color for UI display
     */
    protected function getUrgencyColor(string $level): string
    {
        return match($level) {
            'critical' => 'red',
            'urgent' => 'orange',
            'medium' => 'yellow',
            'light' => 'green',
            default => 'gray'
        };
    }

    /**
     * Get urgency description
     */
    protected function getUrgencyDescription(string $level): string
    {
        return match($level) {
            'critical' => 'Requires immediate medical attention',
            'urgent' => 'Should be addressed promptly by healthcare provider',
            'medium' => 'Monitor and consider scheduling appointment',
            'light' => 'General information and lifestyle recommendations',
            default => 'General health information'
        };
    }

    /**
     * Extract warnings from response
     */
    protected function extractWarnings(string $response): array
    {
        $warnings = [];
        $warningPhrases = [
            'do not', 'avoid', 'never', 'stop taking', 'discontinue',
            'dangerous', 'harmful', 'warning', 'caution', 'risk',
            'side effect', 'contraindication', 'interaction'
        ];

        foreach ($warningPhrases as $phrase) {
            if (stripos($response, $phrase) !== false) {
                // Extract sentence containing the warning
                $sentences = preg_split('/[.!?]+/', $response);
                foreach ($sentences as $sentence) {
                    if (stripos($sentence, $phrase) !== false) {
                        $warnings[] = trim($sentence);
                        break;
                    }
                }
            }
        }

        return array_unique($warnings);
    }

    /**
     * Extract when to seek help criteria
     */
    protected function extractSeekHelpCriteria(string $response): array
    {
        $criteria = [];
        $seekHelpPhrases = [
            'seek medical attention if', 'contact doctor if', 'call if',
            'see healthcare provider if', 'emergency if', 'urgent if'
        ];

        foreach ($seekHelpPhrases as $phrase) {
            if (stripos($response, $phrase) !== false) {
                // Extract the condition following the phrase
                $pattern = '/' . preg_quote($phrase, '/') . '\s*([^.!?]+)/i';
                if (preg_match($pattern, $response, $matches)) {
                    $criteria[] = trim($matches[1]);
                }
            }
        }

        return $criteria;
    }

    /**
     * Generate additional resources
     */
    protected function generateAdditionalResources(string $response): array
    {
        $resources = [
            [
                'title' => 'Emergency Services',
                'description' => 'Call 911 for life-threatening emergencies',
                'contact' => '911',
                'type' => 'emergency'
            ],
            [
                'title' => 'Telehealth Consultation',
                'description' => 'Speak with a healthcare provider online',
                'contact' => 'Contact your healthcare provider',
                'type' => 'consultation'
            ],
            [
                'title' => 'Health Information',
                'description' => 'Reliable medical information and resources',
                'contact' => 'https://www.mayoclinic.org',
                'type' => 'information'
            ]
        ];

        return $resources;
    }

    // Helper methods for personalized information
    protected function getAgeSpecificInfo(int $age, string $response): array
    {
        if ($age >= 65) {
            return [
                'message' => 'As a senior, consider discussing any new symptoms with your healthcare provider promptly.',
                'considerations' => ['Medication interactions', 'Fall risk', 'Slower healing']
            ];
        } elseif ($age <= 18) {
            return [
                'message' => 'For minors, always involve a parent/guardian in healthcare decisions.',
                'considerations' => ['Growth and development', 'Age-appropriate treatments']
            ];
        }

        return [];
    }

    protected function getConditionSpecificInfo(string $conditions, string $response): array
    {
        return [
            'message' => "Given your existing conditions ({$conditions}), discuss any new symptoms with your healthcare provider.",
            'considerations' => ['Potential interactions', 'Condition management', 'Specialized care needs']
        ];
    }

    protected function getAllergyWarnings(string $allergies, string $response): array
    {
        return [
            'message' => "Be aware of your allergies ({$allergies}) when considering any treatments or medications.",
            'warning' => 'Always inform healthcare providers about your allergies'
        ];
    }

    protected function getMedicationConsiderations(string $medications, string $response): array
    {
        return [
            'message' => "Current medications ({$medications}) may interact with new treatments.",
            'advice' => 'Consult pharmacist or doctor before adding new medications'
        ];
    }

    protected function getPregnancyConsiderations(string $response): array
    {
        return [
            'message' => 'During pregnancy, always consult your obstetrician before taking any medications or treatments.',
            'warning' => 'Some treatments may not be safe during pregnancy'
        ];
    }

    // Additional helper methods
    protected function extractSymptoms(string $response): array
    {
        $symptoms = [];
        $symptomKeywords = [
            'pain', 'fever', 'headache', 'nausea', 'fatigue', 'dizziness',
            'shortness of breath', 'cough', 'swelling', 'rash', 'itching'
        ];

        foreach ($symptomKeywords as $symptom) {
            if (stripos($response, $symptom) !== false) {
                $symptoms[] = $symptom;
            }
        }

        return $symptoms;
    }

    protected function extractConditions(string $response): array
    {
        $conditions = [];
        $conditionKeywords = [
            'diabetes', 'hypertension', 'asthma', 'arthritis', 'depression',
            'anxiety', 'migraine', 'allergies', 'infection', 'inflammation'
        ];

        foreach ($conditionKeywords as $condition) {
            if (stripos($response, $condition) !== false) {
                $conditions[] = $condition;
            }
        }

        return $conditions;
    }

    protected function extractTreatments(string $response): array
    {
        $treatments = [];
        $treatmentKeywords = [
            'medication', 'exercise', 'therapy', 'surgery', 'rest',
            'ice', 'heat', 'massage', 'stretching', 'diet'
        ];

        foreach ($treatmentKeywords as $treatment) {
            if (stripos($response, $treatment) !== false) {
                $treatments[] = $treatment;
            }
        }

        return $treatments;
    }

    protected function getActionDescription(string $category): string
    {
        return match($category) {
            'immediate' => 'Seek emergency medical care immediately',
            'schedule' => 'Schedule an appointment with your healthcare provider',
            'monitor' => 'Monitor symptoms and track changes',
            'lifestyle' => 'Implement recommended lifestyle changes',
            'medication' => 'Follow medication instructions carefully',
            default => 'Follow general health recommendations'
        };
    }

    protected function getActionPriority(string $category): string
    {
        return match($category) {
            'immediate' => 'critical',
            'schedule' => 'high',
            'monitor' => 'medium',
            'lifestyle' => 'low',
            'medication' => 'high',
            default => 'low'
        };
    }

    protected function calculateConfidenceLevel(string $response): int
    {
        // Simple confidence calculation based on response length and specificity
        $length = strlen($response);
        $specificTerms = ['should', 'recommend', 'suggest', 'consider', 'may', 'might'];
        $specificityScore = 0;

        foreach ($specificTerms as $term) {
            if (stripos($response, $term) !== false) {
                $specificityScore++;
            }
        }

        $confidence = min(($length / 10) + ($specificityScore * 10), 100);
        return (int) $confidence;
    }

    protected function classifyResponseType(string $response): string
    {
        $response = strtolower($response);

        if (stripos($response, 'emergency') !== false || stripos($response, '911') !== false) {
            return 'emergency';
        } elseif (stripos($response, 'appointment') !== false || stripos($response, 'doctor') !== false) {
            return 'consultation';
        } elseif (stripos($response, 'lifestyle') !== false || stripos($response, 'exercise') !== false) {
            return 'lifestyle';
        } elseif (stripos($response, 'medication') !== false || stripos($response, 'treatment') !== false) {
            return 'treatment';
        }

        return 'general';
    }
}
