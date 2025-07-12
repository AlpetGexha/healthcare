import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    User, 
    MoreVertical, 
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

interface FamilyMemberSelectorProps {
    familyMembers: (FamilyMember & { id: number })[];
    activeMemberId: number | null;
    onMemberSelect: (memberId: number | null) => void;
    onMemberAdd: (member: FamilyMember) => void;
    onMemberUpdate: (member: FamilyMember & { id: number }) => void;
    onMemberDelete: (memberId: number) => void;
    className?: string;
}

export function FamilyMemberSelector({
    familyMembers,
    activeMemberId,
    onMemberSelect,
    onMemberAdd,
    onMemberUpdate,
    onMemberDelete,
    className
}: FamilyMemberSelectorProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<(FamilyMember & { id: number }) | null>(null);

    // Helper function to get initials
    const getInitials = (name: string): string => {
        if (!name) return 'FM';
        const words = name.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Helper function to get health summary
    const getHealthSummary = (member: FamilyMember): string => {
        const summary = [];
        if (member.chronic_conditions) summary.push('Chronic conditions');
        if (member.allergies) summary.push('Allergies');
        if (member.medications) summary.push('Medications');
        if (member.is_pregnant) summary.push('Pregnant');
        
        return summary.length > 0 ? summary.join(', ') : 'No health issues recorded';
    };

    const handleAddMember = () => {
        setEditingMember(null);
        setIsModalOpen(true);
    };

    const handleEditMember = (member: FamilyMember & { id: number }) => {
        setEditingMember(member);
        setIsModalOpen(true);
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
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">Family Members</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddMember}
                    className="h-8 w-8 p-0"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Current User Option */}
            <Card 
                className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    activeMemberId === null && "bg-accent border-primary"
                )}
                onClick={() => onMemberSelect(null)}
            >
                <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <User className="h-5 w-5" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
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
                </CardContent>
            </Card>

            {/* Family Members */}
            <div className="space-y-2">
                {familyMembers.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No family members added yet</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddMember}
                            className="mt-2"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Family Member
                        </Button>
                    </div>
                ) : (
                    familyMembers.map((member) => (
                        <Card
                            key={member.id}
                            className={cn(
                                "cursor-pointer transition-colors hover:bg-accent",
                                activeMemberId === member.id && "bg-accent border-primary"
                            )}
                            onClick={() => onMemberSelect(member.id)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center space-x-3">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="h-10 w-10">
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
                                            <TooltipContent>
                                                <div className="space-y-1 text-xs">
                                                    <p><strong>{member.name}</strong></p>
                                                    <p>Age: {member.age}</p>
                                                    <p>Gender: {member.gender ? 'Male' : 'Female'}</p>
                                                    {member.blood_type && <p>Blood Type: {member.blood_type}</p>}
                                                    <p className="text-muted-foreground mt-2">
                                                        {getHealthSummary(member)}
                                                    </p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <p className="font-medium text-sm truncate">
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
                                    </div>

                                    <div className="flex items-center space-x-1">
                                        {activeMemberId === member.id && (
                                            <Badge variant="default" className="text-xs">
                                                Active
                                            </Badge>
                                        )}
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
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
                                                        handleDeleteMember(member.id);
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

                                {/* Health indicators */}
                                {(member.chronic_conditions || member.allergies || member.medications) && (
                                    <div className="mt-2 flex flex-wrap gap-1">
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
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

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
