
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, LocalizedString, StoryCardType, ContentGenerationConfig, GeneratedModule } from "../types";

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 1. CAREER PATH ARCHITECT (Level 1)
 */
export const generateCareerPath = async (targetRole: string, language: string = 'Turkish'): Promise<{ title: string, description: string, courses: { title: string, description: string }[] }> => {
    // ... existing implementation preserved
    try {
        const ai = getAiClient();
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                courses: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }
                    }
                }
            },
            required: ["title", "courses"]
        };
        const prompt = `Act as expert Hotel HR. Role: "${targetRole}". Design professional curriculum with 5-6 courses. Output Language: ${language}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        return response.text ? JSON.parse(cleanJsonResponse(response.text)) : { title: targetRole, description: '', courses: [] };
    } catch (e) { return { title: targetRole, description: 'Error', courses: [] }; }
};

/**
 * 2. SYLLABUS DESIGNER (Course -> Topics)
 */
export const generateCourseTopics = async (courseTitle: string, language: string = 'Turkish'): Promise<{ topics: { title: string, summary: string }[] }> => {
    try {
        const ai = getAiClient();
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                topics: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Topic title e.g. 'Chapter 1: Basics'" },
                            summary: { type: Type.STRING, description: "Brief summary of what will be learned" }
                        }
                    }
                }
            },
            required: ["topics"]
        };

        const prompt = `
            Act as an Instructional Designer.
            Course: "${courseTitle}"
            Task: Create a logical syllabus with 5-8 Main Topics (Chapters).
            Output Language: ${language}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) return JSON.parse(cleanJsonResponse(response.text));
        return { topics: [] };
    } catch (e) {
        console.error("Topic Gen Error:", e);
        return { topics: [] };
    }
};

/**
 * 3. TOPIC PLANNER (Topic -> Modules)
 */
export const generateTopicModules = async (topicTitle: string, courseTitle: string, language: string = 'Turkish'): Promise<{ modules: { title: string, type: string }[] }> => {
    try {
        const ai = getAiClient();
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                modules: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Specific module title e.g. 'Video: How to greet guests'" },
                            type: { type: Type.STRING, enum: ['VIDEO', 'QUIZ', 'READING', 'FLASHCARD'] }
                        }
                    }
                }
            },
            required: ["modules"]
        };

        const prompt = `
            Act as a Teacher.
            Context: Course "${courseTitle}" -> Topic "${topicTitle}".
            Task: Suggest 3-5 atomic learning modules to teach this topic effectively. Mix video, reading and quiz.
            Output Language: ${language}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) return JSON.parse(cleanJsonResponse(response.text));
        return { modules: [] };
    } catch (e) {
        console.error("Module Gen Error:", e);
        return { modules: [] };
    }
};

/**
 * 4. CONTENT CREATOR (Module -> StoryCards)
 */
export const generateModuleContent = async (
    moduleTitle: string,
    courseTitle: string,
    context: string,
    pedagogy: PedagogyMode,
    language: string = 'Turkish'
): Promise<StoryCard[]> => {
    try {
        const ai = getAiClient();
        // Schema reused from previous implementation
        const localizedStringSchema: Schema = { type: Type.OBJECT, properties: { en: { type: Type.STRING }, tr: { type: Type.STRING } }, required: ['tr'] };
        const schema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['COVER', 'INFO', 'QUIZ', 'POLL', 'REWARD'] },
                    title: localizedStringSchema,
                    content: localizedStringSchema,
                    mediaPrompt: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    interaction: {
                        type: Type.OBJECT,
                        properties: {
                            question: localizedStringSchema,
                            options: { type: Type.ARRAY, items: localizedStringSchema },
                            correctOptionIndex: { type: Type.NUMBER },
                            explanation: localizedStringSchema
                        }
                    }
                },
                required: ["type", "title", "content", "mediaPrompt"]
            }
        };

        const prompt = `
            ROLE: Education Content Creator.
            CONTEXT: Course: "${courseTitle}" -> Module: "${moduleTitle}".
            TASK: Create a micro-learning deck (8-12 cards).
            METHOD: ${pedagogy}
            OUTPUT LANGUAGE: ${language} (Provide English translation too).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 }
        });

        if (response.text) {
            const cards = JSON.parse(cleanJsonResponse(response.text));
            return cards.map((c: any, i: number) => ({
                ...c,
                id: `card_${Date.now()}_${i}`,
                mediaUrl: `https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80` 
            }));
        }
        return [];
    } catch (e) {
        console.error("Content Gen Error:", e);
        return [];
    }
};

// Legacy exports
export const expandSearchQuery = async (q: string) => [q];
// Updated to accept optional args to satisfy careerService calls
export const generateCourseSyllabus = async (title?: string, context?: string) => ({ modules: [] });
export const suggestCareerPathStructure = generateCareerPath;