<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class WebSearchService
{
    protected $searchProviders = [
        'duckduckgo' => [
            'url' => 'https://api.duckduckgo.com/',
            'enabled' => true,
        ],
        'serper' => [
            'url' => 'https://google.serper.dev/search',
            'enabled' => false, // Requires API key
        ]
    ];

    protected $healthcareKeywords = [
        'blood pressure monitor',
        'pulse oximeter',
        'thermometer',
        'glucose meter',
        'stethoscope',
        'heating pad',
        'compression socks',
        'vitamins',
        'supplements',
        'protein powder',
        'exercise equipment',
        'yoga mat',
        'resistance bands',
        'walking aids',
        'mobility scooter',
        'wheelchair',
        'crutches',
        'back support',
        'ergonomic chair',
        'air purifier',
        'humidifier',
        'cpap machine',
        'nebulizer',
        'ice pack',
        'massage device',
        'tens unit',
        'scale',
        'fitness tracker',
        'smartwatch',
        'medication organizer',
        'pill dispenser',
    ];

    /**
     * Extract product recommendations from AI response
     */
    public function extractProducts(string $response): array
    {
        $products = [];
        $response = strtolower($response);

        // Look for recommendation patterns
        $recommendationPatterns = [
            '/(?:recommend|suggest|consider|try|use|get|buy)\s+(?:a\s+|an\s+|some\s+)?([^.!?]+)/i',
            '/(?:you might want to|you could|it would be good to)\s+(?:get|buy|use|try)\s+(?:a\s+|an\s+|some\s+)?([^.!?]+)/i',
            '/(?:consider purchasing|look into|invest in)\s+(?:a\s+|an\s+|some\s+)?([^.!?]+)/i'
        ];

        foreach ($recommendationPatterns as $pattern) {
            preg_match_all($pattern, $response, $matches);
            if (!empty($matches[1])) {
                foreach ($matches[1] as $match) {
                    $cleanMatch = trim($match);
                    // Check if it matches healthcare keywords
                    foreach ($this->healthcareKeywords as $keyword) {
                        if (stripos($cleanMatch, $keyword) !== false) {
                            $products[] = [
                                'name' => $keyword,
                                'context' => $cleanMatch,
                                'category' => $this->categorizeProduct($keyword)
                            ];
                        }
                    }
                }
            }
        }

        return array_unique($products, SORT_REGULAR);
    }

    /**
     * Search for product links
     */
    public function searchProducts(array $products): array
    {
        $results = [];

        foreach ($products as $product) {
            $cacheKey = 'product_search:' . md5($product['name']);
            
            $links = Cache::remember($cacheKey, 3600, function () use ($product) {
                return $this->performSearch($product['name'] . ' healthcare medical');
            });

            if (!empty($links)) {
                $results[] = [
                    'product' => $product,
                    'links' => $links,
                    'search_query' => $product['name'] . ' healthcare medical'
                ];
            }
        }

        return $results;
    }

    /**
     * Perform actual web search
     */
    protected function performSearch(string $query): array
    {
        try {
            // Try DuckDuckGo first (free)
            $results = $this->searchDuckDuckGo($query);
            
            if (empty($results) && $this->searchProviders['serper']['enabled']) {
                $results = $this->searchSerper($query);
            }

            return $results;
        } catch (\Exception $e) {
            Log::error('Web search failed: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Search using DuckDuckGo Instant Answer API
     */
    protected function searchDuckDuckGo(string $query): array
    {
        try {
            $response = Http::timeout(10)->get('https://api.duckduckgo.com/', [
                'q' => $query,
                'format' => 'json',
                'no_html' => 1,
                'skip_disambig' => 1
            ]);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            $results = [];

            // Extract related topics and results
            if (isset($data['RelatedTopics'])) {
                $count = 0;
                foreach ($data['RelatedTopics'] as $topic) {
                    if ($count >= 3) break; // Limit to 3 results
                    
                    if (isset($topic['FirstURL'])) {
                        $results[] = [
                            'title' => strip_tags($topic['Text'] ?? 'Related Product'),
                            'url' => $topic['FirstURL'],
                            'description' => $this->cleanDescription($topic['Text'] ?? ''),
                            'source' => 'DuckDuckGo'
                        ];
                        $count++;
                    }
                }
            }

            // If no related topics, try to generate generic search URLs
            if (empty($results)) {
                $results = $this->generateGenericSearchUrls($query);
            }

            return $results;
        } catch (\Exception $e) {
            Log::error('DuckDuckGo search failed: ' . $e->getMessage());
            return $this->generateGenericSearchUrls($query);
        }
    }

    /**
     * Search using Serper API (requires API key)
     */
    protected function searchSerper(string $query): array
    {
        $apiKey = env('SERPER_API_KEY');
        if (!$apiKey) {
            return [];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-API-KEY' => $apiKey])
                ->post('https://google.serper.dev/search', [
                    'q' => $query,
                    'num' => 5
                ]);

            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            $results = [];

            if (isset($data['organic'])) {
                foreach (array_slice($data['organic'], 0, 3) as $item) {
                    $results[] = [
                        'title' => $item['title'],
                        'url' => $item['link'],
                        'description' => $item['snippet'] ?? '',
                        'source' => 'Google'
                    ];
                }
            }

            return $results;
        } catch (\Exception $e) {
            Log::error('Serper search failed: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Generate generic search URLs when API search fails
     */
    protected function generateGenericSearchUrls(string $query): array
    {
        $encodedQuery = urlencode($query);
        
        return [
            [
                'title' => "Search for '{$query}' on Amazon",
                'url' => "https://www.amazon.com/s?k={$encodedQuery}",
                'description' => "Find {$query} products on Amazon with customer reviews and ratings",
                'source' => 'Amazon'
            ],
            [
                'title' => "Search for '{$query}' on Google",
                'url' => "https://www.google.com/search?q={$encodedQuery}",
                'description' => "Search Google for {$query} information and products",
                'source' => 'Google'
            ],
            [
                'title' => "Search for '{$query}' on WebMD",
                'url' => "https://www.webmd.com/search/search_results/default.aspx?query={$encodedQuery}",
                'description' => "Find medical information about {$query} on WebMD",
                'source' => 'WebMD'
            ]
        ];
    }

    /**
     * Categorize product type
     */
    protected function categorizeProduct(string $product): string
    {
        $categories = [
            'monitoring' => ['blood pressure monitor', 'pulse oximeter', 'thermometer', 'glucose meter', 'scale'],
            'mobility' => ['walking aids', 'mobility scooter', 'wheelchair', 'crutches'],
            'exercise' => ['yoga mat', 'resistance bands', 'exercise equipment', 'fitness tracker'],
            'therapy' => ['heating pad', 'ice pack', 'massage device', 'tens unit'],
            'respiratory' => ['cpap machine', 'nebulizer', 'air purifier', 'humidifier'],
            'supplements' => ['vitamins', 'supplements', 'protein powder'],
            'comfort' => ['compression socks', 'back support', 'ergonomic chair'],
            'medication' => ['medication organizer', 'pill dispenser'],
        ];

        foreach ($categories as $category => $items) {
            if (in_array(strtolower($product), $items)) {
                return $category;
            }
        }

        return 'general';
    }

    /**
     * Clean description text
     */
    protected function cleanDescription(string $text): string
    {
        // Remove HTML tags
        $text = strip_tags($text);
        
        // Limit length
        if (strlen($text) > 150) {
            $text = substr($text, 0, 147) . '...';
        }

        return trim($text);
    }

    /**
     * Get shopping recommendations based on product category
     */
    public function getShoppingRecommendations(string $category): array
    {
        $recommendations = [
            'monitoring' => [
                'tips' => [
                    'Look for FDA-approved devices',
                    'Check customer reviews and ratings',
                    'Consider warranty and customer support',
                    'Compare accuracy specifications'
                ],
                'trusted_brands' => ['Omron', 'Braun', 'ReliOn', 'Greater Goods']
            ],
            'mobility' => [
                'tips' => [
                    'Consult with healthcare provider first',
                    'Consider your specific mobility needs',
                    'Check weight capacity and adjustability',
                    'Look for safety certifications'
                ],
                'trusted_brands' => ['Drive Medical', 'Medline', 'Invacare', 'Pride Mobility']
            ],
            'supplements' => [
                'tips' => [
                    'Consult with doctor before starting',
                    'Look for third-party testing',
                    'Check for USP or NSF certification',
                    'Verify ingredient quality and purity'
                ],
                'trusted_brands' => ['Nature Made', 'Garden of Life', 'Thorne', 'NOW Foods']
            ]
        ];

        return $recommendations[$category] ?? [
            'tips' => [
                'Research product thoroughly before purchasing',
                'Read customer reviews and ratings',
                'Compare prices across multiple retailers',
                'Check return policy and warranty'
            ],
            'trusted_brands' => []
        ];
    }
}
