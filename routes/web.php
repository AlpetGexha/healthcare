<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // OpenAI Test Route
    Route::get('/test-ai', [ChatController::class, 'testAI'])->name('test-ai');

    // System Prompt Management
    Route::get('/system-prompt', [ChatController::class, 'systemPrompt'])->name('system-prompt');
    Route::post('/system-prompt', [ChatController::class, 'updateSystemPrompt'])->name('update-system-prompt');

    // Chat routes
    Route::prefix('chat')->name('chat.')->group(function () {
        Route::get('/', [ChatController::class, 'index'])->name('index');
        Route::post('/', [ChatController::class, 'store'])->name('store');
        Route::get('/search', [ChatController::class, 'search'])->name('search');

        Route::prefix('{conversation}')->group(function () {
            Route::get('/', [ChatController::class, 'show'])->name('show');
            Route::post('/messages', [ChatController::class, 'sendMessage'])->name('send-message');
            Route::get('/messages', [ChatController::class, 'getMessages'])->name('get-messages');
            Route::put('/', [ChatController::class, 'update'])->name('update');
            Route::delete('/', [ChatController::class, 'destroy'])->name('destroy');
            Route::patch('/archive', [ChatController::class, 'archive'])->name('archive');
            Route::get('/stats', [ChatController::class, 'stats'])->name('stats');
            Route::get('/export', [ChatController::class, 'export'])->name('export');
        });
    });

    // Family member profile routes
    Route::prefix('profiles')->name('profiles.')->group(function () {
        Route::get('/', [ProfileController::class, 'index'])->name('index');
        Route::post('/', [ProfileController::class, 'store'])->name('store');
        Route::put('/{profile}', [ProfileController::class, 'update'])->name('update');
        Route::delete('/{profile}', [ProfileController::class, 'destroy'])->name('destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
