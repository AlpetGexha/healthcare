<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * Get all family members for the authenticated user.
     */
    public function index(): JsonResponse
    {
        $profiles = Auth::user()->familyMembers()->latest()->get();

        return response()->json([
            'success' => true,
            'profiles' => $profiles,
        ]);
    }

    /**
     * Store a new family member profile.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            // Step 1: Basic Information
            'name' => 'required|string|max:255',
            'age' => 'required|string|max:10',
            'gender' => 'required|boolean',
            'address' => 'nullable|string|max:500',
            
            // Step 2: Health Metrics
            'weight' => 'nullable|string|max:50',
            'height' => 'nullable|string|max:50',
            'blood_type' => 'nullable|string|max:10',
            'is_pregnant' => 'nullable|boolean',
            'is_smoker' => 'nullable|boolean',
            'is_drinker' => 'nullable|boolean',
            
            // Step 3: Medical Information
            'chronic_conditions' => 'nullable|string|max:1000',
            'allergies' => 'nullable|string|max:1000',
            'medications' => 'nullable|string|max:1000',
            'extra_info' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $profile = Auth::user()->familyMembers()->create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Family member added successfully.',
            'profile' => $profile,
        ]);
    }

    /**
     * Update a family member profile.
     */
    public function update(Request $request, Profile $profile): JsonResponse
    {
        // Check if the profile belongs to the authenticated user
        if ($profile->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'age' => 'sometimes|string|max:10',
            'gender' => 'sometimes|boolean',
            'address' => 'nullable|string|max:500',
            'weight' => 'nullable|string|max:50',
            'height' => 'nullable|string|max:50',
            'blood_type' => 'nullable|string|max:10',
            'is_pregnant' => 'nullable|boolean',
            'is_smoker' => 'nullable|boolean',
            'is_drinker' => 'nullable|boolean',
            'chronic_conditions' => 'nullable|string|max:1000',
            'allergies' => 'nullable|string|max:1000',
            'medications' => 'nullable|string|max:1000',
            'extra_info' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $profile->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Family member updated successfully.',
            'profile' => $profile->fresh(),
        ]);
    }

    /**
     * Delete a family member profile.
     */
    public function destroy(Profile $profile): JsonResponse
    {
        // Check if the profile belongs to the authenticated user
        if ($profile->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized.'
            ], 403);
        }

        $profile->delete();

        return response()->json([
            'success' => true,
            'message' => 'Family member deleted successfully.',
        ]);
    }
}
