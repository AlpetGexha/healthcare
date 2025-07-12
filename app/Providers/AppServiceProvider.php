<?php

namespace App\Providers;

use App\Actions\ProcessChatMessage;
use App\Services\TokenOptimizationService;
use App\Services\ContextBuildingService;
use App\Services\OpenAIService;
use App\Services\WebSearchService;
use App\Services\ResponseFormattingService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register chat services as singletons
        $this->app->singleton(TokenOptimizationService::class);
        $this->app->singleton(ContextBuildingService::class);
        $this->app->singleton(OpenAIService::class);
        $this->app->singleton(WebSearchService::class);
        $this->app->singleton(ResponseFormattingService::class);

        // Register the main action class
        $this->app->bind(ProcessChatMessage::class, function ($app) {
            return new ProcessChatMessage(
                $app->make(TokenOptimizationService::class),
                $app->make(ContextBuildingService::class),
                $app->make(OpenAIService::class),
                $app->make(WebSearchService::class),
                $app->make(ResponseFormattingService::class)
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
