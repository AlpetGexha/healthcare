import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, User, Heart, Activity, AlertCircle } from 'lucide-react';
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

interface FamilyMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (familyMember: FamilyMember) => void;
    familyMember?: FamilyMember | null;
    trigger?: React.ReactNode;
}

const initialFamilyMember: FamilyMember = {
    name: '',
    age: '',
    gender: true,
    address: '',
    weight: '',
    height: '',
    chronic_conditions: '',
    allergies: '',
    medications: '',
    is_pregnant: false,
    blood_type: '',
    is_smoker: false,
    is_drinker: false,
    extra_info: {},
};

const steps = [
    { id: 1, title: 'Basic Info', icon: User },
    { id: 2, title: 'Health Info', icon: Heart },
    { id: 3, title: 'Medical Details', icon: Activity },
];

export function FamilyMemberModal({ 
    isOpen, 
    onClose, 
    onSave, 
    familyMember = null, 
    trigger 
}: FamilyMemberModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FamilyMember>(initialFamilyMember);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (familyMember) {
            setFormData(familyMember);
        } else {
            setFormData(initialFamilyMember);
        }
        setCurrentStep(1);
        setErrors({});
    }, [familyMember, isOpen]);

    const updateFormData = (field: keyof FamilyMember, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!formData.name.trim()) newErrors.name = 'Name is required';
            if (!formData.age.trim()) newErrors.age = 'Age is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSave = () => {
        if (validateStep(currentStep)) {
            onSave(formData);
            onClose();
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => updateFormData('name', e.target.value)}
                                    placeholder="Enter full name"
                                    className={cn(errors.name && "border-red-500")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="age">Age *</Label>
                                <Input
                                    id="age"
                                    value={formData.age}
                                    onChange={(e) => updateFormData('age', e.target.value)}
                                    placeholder="Enter age"
                                    className={cn(errors.age && "border-red-500")}
                                />
                                {errors.age && (
                                    <p className="text-sm text-red-500 flex items-center">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        {errors.age}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <Select 
                                value={formData.gender.toString()} 
                                onValueChange={(value) => updateFormData('gender', value === 'true')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Male</SelectItem>
                                    <SelectItem value="false">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                                id="address"
                                value={formData.address}
                                onChange={(e) => updateFormData('address', e.target.value)}
                                placeholder="Enter home address"
                                rows={3}
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight">Weight</Label>
                                <Input
                                    id="weight"
                                    value={formData.weight}
                                    onChange={(e) => updateFormData('weight', e.target.value)}
                                    placeholder="e.g., 70kg or 154lbs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">Height</Label>
                                <Input
                                    id="height"
                                    value={formData.height}
                                    onChange={(e) => updateFormData('height', e.target.value)}
                                    placeholder="e.g., 175cm or 5'9&quot;"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="blood_type">Blood Type</Label>
                            <Select 
                                value={formData.blood_type || ''} 
                                onValueChange={(value) => updateFormData('blood_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select blood type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A+">A+</SelectItem>
                                    <SelectItem value="A-">A-</SelectItem>
                                    <SelectItem value="B+">B+</SelectItem>
                                    <SelectItem value="B-">B-</SelectItem>
                                    <SelectItem value="AB+">AB+</SelectItem>
                                    <SelectItem value="AB-">AB-</SelectItem>
                                    <SelectItem value="O+">O+</SelectItem>
                                    <SelectItem value="O-">O-</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_smoker">Smoker</Label>
                                <Switch
                                    id="is_smoker"
                                    checked={formData.is_smoker}
                                    onCheckedChange={(checked) => updateFormData('is_smoker', checked)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_drinker">Regular Alcohol Consumption</Label>
                                <Switch
                                    id="is_drinker"
                                    checked={formData.is_drinker}
                                    onCheckedChange={(checked) => updateFormData('is_drinker', checked)}
                                />
                            </div>

                            {!formData.gender && (
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="is_pregnant">Currently Pregnant</Label>
                                    <Switch
                                        id="is_pregnant"
                                        checked={formData.is_pregnant}
                                        onCheckedChange={(checked) => updateFormData('is_pregnant', checked)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="chronic_conditions">Chronic Conditions</Label>
                            <Textarea
                                id="chronic_conditions"
                                value={formData.chronic_conditions}
                                onChange={(e) => updateFormData('chronic_conditions', e.target.value)}
                                placeholder="List any chronic conditions (e.g., diabetes, hypertension, asthma...)"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="allergies">Allergies</Label>
                            <Textarea
                                id="allergies"
                                value={formData.allergies}
                                onChange={(e) => updateFormData('allergies', e.target.value)}
                                placeholder="List any allergies (food, medication, environmental...)"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="medications">Current Medications</Label>
                            <Textarea
                                id="medications"
                                value={formData.medications}
                                onChange={(e) => updateFormData('medications', e.target.value)}
                                placeholder="List current medications and dosages..."
                                rows={3}
                            />
                        </div>

                        {/* Health Summary Preview */}
                        {(formData.chronic_conditions || formData.allergies || formData.medications) && (
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle className="text-sm">Health Summary Preview</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        {formData.chronic_conditions && (
                                            <div>
                                                <Badge variant="outline" className="mr-2">Conditions</Badge>
                                                {formData.chronic_conditions}
                                            </div>
                                        )}
                                        {formData.allergies && (
                                            <div>
                                                <Badge variant="outline" className="mr-2">Allergies</Badge>
                                                {formData.allergies}
                                            </div>
                                        )}
                                        {formData.medications && (
                                            <div>
                                                <Badge variant="outline" className="mr-2">Medications</Badge>
                                                {formData.medications}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {familyMember ? 'Edit Family Member' : 'Add Family Member'}
                    </DialogTitle>
                </DialogHeader>

                {/* Step Progress */}
                <div className="flex items-center justify-between mb-6">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                                    currentStep >= step.id
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-muted text-muted-foreground"
                                )}
                            >
                                <step.icon className="h-4 w-4" />
                            </div>
                            <div className="ml-2 hidden sm:block">
                                <p className={cn(
                                    "text-sm font-medium",
                                    currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {step.title}
                                </p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={cn(
                                    "w-12 h-0.5 mx-4",
                                    currentStep > step.id ? "bg-primary" : "bg-muted"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[300px]">
                    {renderStepContent()}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    <div className="flex space-x-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        
                        {currentStep === steps.length ? (
                            <Button onClick={handleSave}>
                                {familyMember ? 'Update' : 'Add'} Family Member
                            </Button>
                        ) : (
                            <Button onClick={nextStep}>
                                Next
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
