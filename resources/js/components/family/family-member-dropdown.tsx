import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    User, 
    ChevronDown,
    Edit, 
    Trash2,
    Users,
    Heart
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { FamilyMemberModal } from './family-member-modal';
import { cn } from '@/lib/utils';

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

interface FamilyMemberDropdownProps {
    familyMembers: (FamilyMember & { id: number })[];
    activeMemberId: number | null;
    onMemberSelect: (memberId: number | null) => void;
    onMemberAdd: (member: FamilyMember) => void;
    onMemberUpdate: (member: FamilyMember & { id: number }) => void;
    onMemberDelete: (memberId: number) => void;
    className?: string;
}

export function FamilyMemberDropdown({
    familyMembers,
    activeMemberId,
    onMemberSelect,
    onMemberAdd,
    onMemberUpdate,
    onMemberDelete,
    className
}: FamilyMemberDropdownProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<(FamilyMember & { id: number }) | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Helper function to get initials
    const getInitials = (name: string): string => {
        if (!name) return 'FM';
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get the currently active member or default to "You"
    const getActiveMemberDisplay = () => {
        if (activeMemberId === null) {
            return {
                name: 'You (Primary)',
                initials: 'YO',
                description: 'Personal health profile',
                isPrimary: true
            };
        }
        
        const activeMember = familyMembers.find(member => member.id === activeMemberId);
        if (activeMember) {
            return {
                name: activeMember.name,
                initials: getInitials(activeMember.name),
                description: `Age ${activeMember.age} • ${activeMember.gender ? 'Male' : 'Female'}`,
                isPrimary: false,
                member: activeMember
            };
        }
        
        return {
            name: 'You (Primary)',
            initials: 'YO',
            description: 'Personal health profile',
            isPrimary: true
        };
    };

    const handleAddMember = () => {
        setEditingMember(null);
        setIsModalOpen(true);
        setIsDropdownOpen(false);
    };

    const handleEditMember = (member: FamilyMember & { id: number }) => {
        setEditingMember(member);
        setIsModalOpen(true);
        setIsDropdownOpen(false);
    };

    const handleSaveMember = (member: FamilyMember) => {
        if (editingMember) {
            onMemberUpdate({ ...member, id: editingMember.id });
        } else {
            onMemberAdd(member);
        }
        setIsModalOpen(false);
        setEditingMember(null);
    };

    const handleDeleteMember = (memberId: number) => {
        onMemberDelete(memberId);
        if (activeMemberId === memberId) {
            onMemberSelect(null);
        }
        setIsDropdownOpen(false);
    };

    const activeDisplay = getActiveMemberDisplay();

    return (
        <div className={cn("w-full", className)}>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between h-auto p-3"
                    >
                        <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback 
                                    className={cn(
                                        activeDisplay.isPrimary 
                                            ? "bg-primary text-primary-foreground"
                                            : activeDisplay.member?.gender 
                                                ? "bg-blue-100 text-blue-700" 
                                                : "bg-pink-100 text-pink-700"
                                    )}
                                >
                                    {activeDisplay.isPrimary ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        activeDisplay.initials
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                                <div className="flex items-center space-x-2">
                                    <p className="font-medium text-sm">
                                        {activeDisplay.name}
                                    </p>
                                    {activeDisplay.member?.is_pregnant && (
                                        <Badge variant="secondary" className="text-xs">
                                            Pregnant
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {activeDisplay.description}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-80" align="start">
                    <DropdownMenuLabel className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Family Members</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Primary User Option */}
                    <DropdownMenuItem
                        onClick={() => {
                            onMemberSelect(null);
                            setIsDropdownOpen(false);
                        }}
                        className={cn(
                            "p-3 cursor-pointer",
                            activeMemberId === null && "bg-accent"
                        )}
                    >
                        <div className="flex items-center space-x-3 w-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-medium text-sm">You (Primary)</p>
                                <p className="text-xs text-muted-foreground">
                                    Personal health profile
                                </p>
                            </div>
                            {activeMemberId === null && (
                                <Badge variant="default" className="text-xs">
                                    Active
                                </Badge>
                            )}
                        </div>
                    </DropdownMenuItem>

                    {/* Family Members */}
                    {familyMembers.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                {familyMembers.map((member) => (
                                    <div key={member.id} className="relative group">
                                        <DropdownMenuItem
                                            onClick={() => {
                                                onMemberSelect(member.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "p-3 cursor-pointer pr-12",
                                                activeMemberId === member.id && "bg-accent"
                                            )}
                                        >
                                            <div className="flex items-center space-x-3 w-full">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback 
                                                                    className={cn(
                                                                        member.gender 
                                                                            ? "bg-blue-100 text-blue-700" 
                                                                            : "bg-pink-100 text-pink-700"
                                                                    )}
                                                                >
                                                                    {getInitials(member.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right">
                                                            <div className="space-y-1 text-xs">
                                                                <p><strong>{member.name}</strong></p>
                                                                <p>Age: {member.age}</p>
                                                                <p>Gender: {member.gender ? 'Male' : 'Female'}</p>
                                                                {member.blood_type && <p>Blood Type: {member.blood_type}</p>}
                                                                {member.chronic_conditions && (
                                                                    <p className="text-muted-foreground mt-1">
                                                                        Conditions: {member.chronic_conditions}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-sm">
                                                            {member.name}
                                                        </p>
                                                        {member.is_pregnant && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Pregnant
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Age {member.age} • {member.gender ? 'Male' : 'Female'}
                                                    </p>
                                                    {/* Health indicators */}
                                                    {(member.chronic_conditions || member.allergies || member.medications) && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {member.chronic_conditions && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Conditions
                                                                </Badge>
                                                            )}
                                                            {member.allergies && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Allergies
                                                                </Badge>
                                                            )}
                                                            {member.medications && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Medications
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {activeMemberId === member.id && (
                                                    <Badge variant="default" className="text-xs">
                                                        Active
                                                    </Badge>
                                                )}
                                            </div>
                                        </DropdownMenuItem>

                                        {/* Edit/Delete buttons for each member */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" side="left">
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditMember(member);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Are you sure you want to delete ${member.name}?`)) {
                                                                handleDeleteMember(member.id);
                                                            }
                                                        }}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </DropdownMenuGroup>
                        </>
                    )}

                    {/* Add Family Member Option */}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleAddMember}
                        className="p-3 cursor-pointer"
                    >
                        <div className="flex items-center space-x-3 w-full">
                            <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm text-muted-foreground">
                                    Add Family Member
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Create a new health profile
                                </p>
                            </div>
                        </div>
                    </DropdownMenuItem>

                    {familyMembers.length === 0 && (
                        <div className="p-3 text-center text-muted-foreground">
                            <Heart className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No family members added yet</p>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Family Member Modal */}
            <FamilyMemberModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingMember(null);
                }}
                onSave={handleSaveMember}
                familyMember={editingMember}
            />
        </div>
    );
}
