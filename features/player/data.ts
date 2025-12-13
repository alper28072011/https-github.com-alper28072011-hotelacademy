export type StepType = 'video' | 'quiz';

export interface CourseStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  // Video Props
  videoUrl?: string;
  posterUrl?: string;
  // Quiz Props
  question?: string;
  options?: { id: string; label: string; isCorrect: boolean }[];
}

export const MOCK_COURSE_STEPS: CourseStep[] = [
  {
    id: 'step1',
    type: 'video',
    title: 'Step 1: The First Impression',
    description: 'Eye contact and a warm smile are your most powerful tools.',
    videoUrl: 'https://cdn.coverr.co/videos/coverr-receptionist-talking-on-the-phone-4338/1080p.mp4', // Safe placeholder
    posterUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'step2',
    type: 'video',
    title: 'Step 2: Suggestive Selling',
    description: 'Always offer a specific item, not just "anything else?".',
    videoUrl: 'https://cdn.coverr.co/videos/coverr-people-eating-at-a-restaurant-4433/1080p.mp4', // Safe placeholder
    posterUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'step3',
    type: 'quiz',
    title: 'Quick Check',
    question: 'What is the best way to suggest a dessert?',
    options: [
      { id: 'a', label: 'Do you want dessert?', isCorrect: false },
      { id: 'b', label: 'Would you like to try our signature Tiramisu?', isCorrect: true },
    ],
  },
];