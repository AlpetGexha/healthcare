<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a test user
        $this->user = User::factory()->create();
    }

    public function test_chat_index_page_loads_successfully()
    {
        $response = $this->actingAs($this->user)
            ->get(route('chat.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Chat/Index')
            ->has('conversations')
        );
    }

    public function test_can_create_new_conversation()
    {
        $response = $this->actingAs($this->user)
            ->post(route('chat.store'), [
                'title' => 'Test Conversation',
                'description' => 'A test conversation'
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('conversations', [
            'user_id' => $this->user->id,
            'title' => 'Test Conversation',
            'description' => 'A test conversation',
        ]);
    }

    public function test_can_view_conversation()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('chat.show', $conversation));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Chat/Show')
            ->has('conversation')
            ->has('messages')
        );
    }

    public function test_can_send_message_to_conversation()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('chat.send-message', $conversation), [
                'content' => 'Hello, this is a test message'
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'ai_response'
        ]);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'content' => 'Hello, this is a test message',
            'is_from_user' => true,
        ]);
    }

    public function test_can_search_conversations()
    {
        $conversation1 = Conversation::factory()->create([
            'user_id' => $this->user->id,
            'title' => 'Health Discussion',
        ]);

        $conversation2 = Conversation::factory()->create([
            'user_id' => $this->user->id,
            'title' => 'General Chat',
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('chat.search', ['q' => 'Health']));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'title',
                    'description',
                    'created_at'
                ]
            ]
        ]);
    }

    public function test_can_update_conversation()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
            'title' => 'Original Title',
        ]);

        $response = $this->actingAs($this->user)
            ->put(route('chat.update', $conversation), [
                'title' => 'Updated Title',
                'description' => 'Updated description'
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('conversations', [
            'id' => $conversation->id,
            'title' => 'Updated Title',
            'description' => 'Updated description',
        ]);
    }

    public function test_can_archive_conversation()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
            'is_archived' => false,
        ]);

        $response = $this->actingAs($this->user)
            ->patch(route('chat.archive', $conversation));

        $response->assertRedirect();

        $this->assertDatabaseHas('conversations', [
            'id' => $conversation->id,
            'is_archived' => true,
        ]);
    }

    public function test_can_delete_conversation()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('chat.destroy', $conversation));

        $response->assertRedirect();

        $this->assertDatabaseMissing('conversations', [
            'id' => $conversation->id,
        ]);
    }

    public function test_openai_test_page_loads()
    {
        $response = $this->actingAs($this->user)
            ->get(route('test-ai'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('TestAI')
            ->has('testResult')
            ->has('config')
        );
    }

    public function test_unauthorized_user_cannot_access_chat()
    {
        $response = $this->get(route('chat.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_user_cannot_access_other_users_conversation()
    {
        $otherUser = User::factory()->create();
        $conversation = Conversation::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('chat.show', $conversation));

        $response->assertStatus(403);
    }

    public function test_conversation_stats_loads_correctly()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
        ]);

        // Create some messages
        Message::factory()->count(5)->create([
            'conversation_id' => $conversation->id,
            'is_from_user' => true,
        ]);

        Message::factory()->count(5)->create([
            'conversation_id' => $conversation->id,
            'is_from_user' => false,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('chat.stats', $conversation));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'total_messages',
            'user_messages',
            'ai_messages',
            'total_tokens_used',
            'created_at',
            'last_activity'
        ]);
    }

    public function test_conversation_export_works()
    {
        $conversation = Conversation::factory()->create([
            'user_id' => $this->user->id,
        ]);

        Message::factory()->count(3)->create([
            'conversation_id' => $conversation->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('chat.export', $conversation));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/json');
    }
}
