
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, LocalizedString, StoryCardType, ContentGenerationConfig, GeneratedModule } from "../types";

interface GeneratedCourse {
  title: LocalizedString;
  description: LocalizedString;
  cards: StoryCard[];
  tags: string[];
  topics: string[];
}

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 1. CAREER PATH ARCHITECT (Level 1)
 * Generates a list of Courses based on a target role.
 */
export const generateCareerPath = async (targetRole: string, language: string = 'Turkish'): Promise<{ title: string, description: string, courses: { title: string, description: string }[] }> => {
    try {
        const ai = getAiClient();
        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Professional title for the career path e.g. 'Front Office Manager Journey'" },
                description: { type: Type.STRING, description: "A brief motivational description of this career path." },
                courses: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Title of a required course in this path" },
                            description: { type: Type.STRING, description: "Short description of what is learned in this course" }
                        }
                    }
                }
            },
            required: ["title", "courses"]
        };

        const prompt = `
            Act as an expert Hotel HR Consultant.
            User wants to build a career path for the role: "${targetRole}".
            Design a professional curriculum with 5-6 essential courses needed to master this role.
            Output Language: ${language}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) {
            return JSON.parse(cleanJsonResponse(response.text));
        }
        return { title: targetRole, description: '', courses: [] };
    } catch (e) {
        console.error("Path Gen Error:", e);
        return { title: targetRole, description: 'Error generating path', courses: [] };
    }
};

/**
 * AI Suggestion for UI Wizard (Does not create DB records, just returns JSON)
 */
export const suggestCareerPathStructure = async (role: string): Promise<any> => {
    return generateCareerPath(role); // Re-use logic
};

/**
 * 2. SYLLABUS DESIGNER (Level 2)
 * Generates specific Modules for a given Course within a Career Context.
 */
export const generateCourseSyllabus = async (courseTitle: string, careerContext: string, language: string = 'Turkish'): Promise<{ modules: { title: string, description: string }[] }> => {
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
                            title: { type: Type.STRING },
                            description: { type: Type.STRING }
                        }
                    }
                }
            },
            required: ["modules"]
        };

        const prompt = `
            Act as an Instructional Designer.
            Career Context: ${careerContext}
            Course Title: ${courseTitle}
            
            Create a detailed syllabus with 4-6 modules (chapters). Each module should represent a distinct learning unit.
            Output Language: ${language}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) {
            return JSON.parse(cleanJsonResponse(response.text));
        }
        return { modules: [] };
    } catch (e) {
        console.error("Syllabus Gen Error:", e);
        return { modules: [] };
    }
};

/**
 * 3. MODULE CONTENT CREATOR (Level 3)
 * Generates the actual StoryCards for a specific module.
 */
export const generateModuleContent = async (
    moduleTitle: string,
    courseTitle: string,
    careerContext: string,
    pedagogy: PedagogyMode,
    language: string = 'Turkish'
): Promise<StoryCard[]> => {
    try {
        const ai = getAiClient();
        
        // Define Localized Schema
        const localizedStringSchema: Schema = { type: Type.OBJECT, properties: { en: { type: Type.STRING }, tr: { type: Type.STRING } }, required: ['tr'] };

        const schema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['COVER', 'INFO', 'QUIZ', 'POLL', 'REWARD'] },
                    title: localizedStringSchema,
                    content: localizedStringSchema,
                    mediaPrompt: { type: Type.STRING, description: "Prompt to generate an image for this card" },
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

        let pedagogyInstruction = "";
        switch (pedagogy) {
            case 'FEYNMAN': pedagogyInstruction = "Use the Feynman Technique: Explain complex ideas simply using analogies."; break;
            case 'ACTIVE_RECALL': pedagogyInstruction = "Focus on testing. Every second slide should be a QUIZ to reinforce memory."; break;
            case 'SOCRATIC': pedagogyInstruction = "Teach through questions. Lead the learner to the answer."; break;
            default: pedagogyInstruction = "Standard professional training. Clear and concise.";
        }

        const prompt = `
            ROLE: Education Content Creator.
            CONTEXT: Career: "${careerContext}" -> Course: "${courseTitle}" -> Module: "${moduleTitle}".
            TASK: Create a micro-learning deck (8-12 cards) for this module.
            METHOD: ${pedagogyInstruction}
            OUTPUT LANGUAGE: ${language} (Also provide English translation).
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
                mediaUrl: `https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80` // Placeholder
            }));
        }
        return [];
    } catch (e) {
        console.error("Module Content Gen Error:", e);
        return [];
    }
};

// Legacy exports for compatibility
export const expandSearchQuery = async (q: string) => [q];
export const translateContent = async (c: any) => c;
export const generateCurriculum = async () => [];
export const generateMagicCourse = async () => null;
