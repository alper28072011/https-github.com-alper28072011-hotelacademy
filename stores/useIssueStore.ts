import { create } from 'zustand';
import { IssueType, User } from '../types';
import { createIssue } from '../services/db';

interface IssueState {
  step: number;
  selectedType: IssueType | null;
  selectedLocation: string | null;
  photoPreview: string | null;
  isSubmitting: boolean;

  // Actions
  setStep: (step: number) => void;
  setType: (type: IssueType) => void;
  setLocation: (loc: string) => void;
  setPhoto: (url: string | null) => void;
  submitIssue: (user: User) => Promise<boolean>;
  reset: () => void;
}

export const useIssueStore = create<IssueState>((set, get) => ({
  step: 1,
  selectedType: null,
  selectedLocation: null,
  photoPreview: null,
  isSubmitting: false,

  setStep: (step) => set({ step }),
  setType: (type) => set({ selectedType: type, step: 2 }),
  setLocation: (loc) => set({ selectedLocation: loc, step: 3 }),
  setPhoto: (url) => set({ photoPreview: url }),
  
  submitIssue: async (user) => {
    const { selectedType, selectedLocation, photoPreview } = get();
    
    if (!selectedType || !selectedLocation) return false;

    set({ isSubmitting: true });

    const success = await createIssue({
        userId: user.id,
        userName: user.name,
        department: user.department,
        type: selectedType,
        location: selectedLocation,
        photoUrl: photoPreview || undefined,
        status: 'OPEN',
        createdAt: Date.now()
    });

    set({ isSubmitting: false });
    return success;
  },

  reset: () => set({ 
    step: 1, 
    selectedType: null, 
    selectedLocation: null, 
    photoPreview: null,
    isSubmitting: false
  })
}));
