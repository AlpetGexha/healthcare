<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    /** @use HasFactory<\Database\Factories\ProfileFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'age',
        'gender',
        'address',
        'weight',
        'height',
        'chronic_conditions',
        'allergies',
        'medications',
        'is_pregnant',
        'blood_type',
        'is_smoker',
        'is_drinker',
        'extra_info',
        'ai_summary',
    ];

    protected $casts = [
        'gender' => 'boolean',
        'is_pregnant' => 'boolean',
        'is_smoker' => 'boolean',
        'is_drinker' => 'boolean',
        'extra_info' => 'array',
    ];

    /**
     * Get the user that owns the profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the display name for the profile.
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->name ?: 'Family Member';
    }

    /**
     * Get the initials for the profile.
     */
    public function getInitialsAttribute(): string
    {
        $name = $this->name ?: 'FM';
        $words = explode(' ', $name);
        
        if (count($words) >= 2) {
            return strtoupper(substr($words[0], 0, 1) . substr($words[1], 0, 1));
        }
        
        return strtoupper(substr($name, 0, 2));
    }

    /**
     * Get a summary of health conditions for AI context.
     */
    public function getHealthSummaryAttribute(): string
    {
        $summary = [];
        
        if ($this->age) $summary[] = "Age: {$this->age}";
        if ($this->gender !== null) $summary[] = "Gender: " . ($this->gender ? 'Male' : 'Female');
        if ($this->chronic_conditions) $summary[] = "Chronic conditions: {$this->chronic_conditions}";
        if ($this->allergies) $summary[] = "Allergies: {$this->allergies}";
        if ($this->medications) $summary[] = "Current medications: {$this->medications}";
        if ($this->is_pregnant) $summary[] = "Currently pregnant";
        if ($this->blood_type) $summary[] = "Blood type: {$this->blood_type}";
        if ($this->is_smoker) $summary[] = "Smoker";
        if ($this->is_drinker) $summary[] = "Regular alcohol consumption";
        
        return implode('; ', $summary);
    }
}
