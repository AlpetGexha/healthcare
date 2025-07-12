import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface FamilyMember {
    id?: number;
    name: string;
    age: string;
    gender: boolean;
    address: string;
    weight: string;
    height: string;
    chronic_conditions: string;
    allergies: string;
    medications: string;
    is_pregnant: boolean;
    blood_type: string;
    is_smoker: boolean;
    is_drinker: boolean;
    extra_info: any;
}

type SavedFamilyMember = FamilyMember & { id: number };

export function useFamilyMembers(initialActiveMemberId?: number | null) {
    const [familyMembers, setFamilyMembers] = useState<SavedFamilyMember[]>([]);
    const [activeMemberId, setActiveMemberIdState] = useState<number | null>(initialActiveMemberId || null);
    const [loading, setLoading] = useState(false);

    const getCSRFToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    };

    // Custom setter that also updates the URL and refreshes conversations
    const setActiveMemberId = (memberId: number | null, updateUrl: boolean = true) => {
        setActiveMemberIdState(memberId);
        
        if (!updateUrl) return;
        
        // Update URL with profile_id parameter to filter conversations
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);
        
        if (memberId === null) {
            params.set('profile_id', '0'); // Use '0' to represent primary user
        } else {
            params.set('profile_id', memberId.toString());
        }
        
        // Use Inertia router to navigate with the new profile filter
        router.visit(`${currentUrl.pathname}?${params.toString()}`, {
            preserveState: true,
            preserveScroll: true,
            only: ['conversations'], // Only reload conversations data
        });
    };

    // Load family members from API
    const loadFamilyMembers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/profiles', {
                headers: {
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                setFamilyMembers(data.profiles || []);
            } else {
                console.error('Failed to load family members');
            }
        } catch (error) {
            console.error('Error loading family members:', error);
        } finally {
            setLoading(false);
        }
    };

    // Add a new family member
    const addFamilyMember = async (memberData: FamilyMember): Promise<boolean> => {
        try {
            const response = await fetch('/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(memberData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFamilyMembers(prev => [...prev, data.profile]);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error adding family member:', error);
            return false;
        }
    };

    // Update an existing family member
    const updateFamilyMember = async (memberData: SavedFamilyMember): Promise<boolean> => {
        try {
            const response = await fetch(`/profiles/${memberData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(memberData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setFamilyMembers(prev => 
                        prev.map(member => 
                            member.id === memberData.id ? data.profile : member
                        )
                    );
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error updating family member:', error);
            return false;
        }
    };

    // Delete a family member
    const deleteFamilyMember = async (memberId: number): Promise<boolean> => {
        try {
            const response = await fetch(`/profiles/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': getCSRFToken() || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                setFamilyMembers(prev => prev.filter(member => member.id !== memberId));
                if (activeMemberId === memberId) {
                    setActiveMemberId(null);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting family member:', error);
            return false;
        }
    };

    // Get active member details
    const getActiveMember = (): SavedFamilyMember | null => {
        if (!activeMemberId) return null;
        return familyMembers.find(member => member.id === activeMemberId) || null;
    };

    // Get health context for AI (formatted for the current active member)
    const getHealthContext = (): string => {
        const activeMember = getActiveMember();
        
        if (!activeMember) {
            return "No specific family member health profile selected. Provide general healthcare information.";
        }

        const context = [];
        context.push(`Patient: ${activeMember.name}, Age: ${activeMember.age}, Gender: ${activeMember.gender ? 'Male' : 'Female'}`);
        
        if (activeMember.weight) context.push(`Weight: ${activeMember.weight}`);
        if (activeMember.height) context.push(`Height: ${activeMember.height}`);
        if (activeMember.blood_type) context.push(`Blood Type: ${activeMember.blood_type}`);
        
        if (activeMember.chronic_conditions) {
            context.push(`Chronic Conditions: ${activeMember.chronic_conditions}`);
        }
        
        if (activeMember.allergies) {
            context.push(`Allergies: ${activeMember.allergies}`);
        }
        
        if (activeMember.medications) {
            context.push(`Current Medications: ${activeMember.medications}`);
        }
        
        if (activeMember.is_pregnant) context.push('Currently pregnant');
        if (activeMember.is_smoker) context.push('Smoker');
        if (activeMember.is_drinker) context.push('Regular alcohol consumption');
        
        return context.join('; ');
    };

    // Load family members on mount
    useEffect(() => {
        loadFamilyMembers();
    }, []);

    return {
        familyMembers,
        activeMemberId,
        setActiveMemberId,
        loading,
        addFamilyMember,
        updateFamilyMember,
        deleteFamilyMember,
        getActiveMember,
        getHealthContext,
        refreshFamilyMembers: loadFamilyMembers,
    };
}
