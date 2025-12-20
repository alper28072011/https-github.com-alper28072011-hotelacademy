
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, LocalizedString, StoryCardType } from "../types";

interface GeneratedCourse {
  title: LocalizedString;
  description: LocalizedString;
  cards: StoryCard[];
  tags: string[];
  topics: string[]; // Adaptive learning topics
}

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * GENERATE CARDS FROM RAW TEXT (For PDF/URL Injection)
 */
export const generateCardsFromText = async (
    text: string, 
    count: number = 3
): Promise<StoryCard[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const cardSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['INFO', 'QUIZ', 'POLL'] },
                title: { type: Type.OBJECT, properties: { en: { type: Type.STRING } }, required: ['en'] },
                content: { type: Type.OBJECT, properties: { en: { type: Type.STRING } }, required: ['en'] },
                mediaPrompt: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                // AI should tag the specific topic of this card
                topics: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                interaction: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.OBJECT, properties: { en: { type: Type.STRING } } },
                        options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { en: { type: Type.STRING } } } },
                        correctOptionIndex: { type: Type.NUMBER }
                    }
                }
            },
            required: ["title", "content", "type"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                Create ${count} micro-learning cards based on this text.
                Language: English (Master Copy).
                Format: JSON Array.
                Also extract 1-2 key 'topics' (e.g., 'fire-safety', 'greeting-guests') for each card for adaptive learning.
                Text: "${text.substring(0, 5000)}"
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: cardSchema }
            }
        });

        if (response.text) {
            const rawCards = JSON.parse(cleanJsonResponse(response.text));
            return rawCards.map((c: any, i: number) => ({
                ...c,
                id: `ai-card-${Date.now()}-${i}`,
                mediaUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800`
            }));
        }
        return [];
    } catch (e) {
        console.error("Card Gen Error:", e);
        return [];
    }
};

/**
 * SMART TRANSLATION SYNC
 */
export const translateContent = async (
    content: LocalizedString, 
    targetLangs: string[],
    sourceLang: string = 'en'
): Promise<LocalizedString> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const baseText = content[sourceLang];
        
        const effectiveSourceText = baseText || Object.values(content)[0];
        if (!effectiveSourceText) return content;

        const realTargets = targetLangs.filter(l => l !== sourceLang);
        if (realTargets.length === 0) return content;

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {},
            required: []
        };
        realTargets.forEach(l => {
            if(schema.properties) schema.properties[l] = { type: Type.STRING };
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `
                You are a professional translator.
                Translate the following text from "${sourceLang}" to these languages: ${realTargets.join(', ')}.
                Keep the tone consistent.
                
                Source Text: "${effectiveSourceText}"
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        if (response.text) {
            const translations = JSON.parse(cleanJsonResponse(response.text));
            return { ...content, ...translations };
        }
        return content;
    } catch (e) {
        console.error("Translation Error:", e);
        return content;
    }
};

/**
 * GENERATE MAGIC COURSE V2 (Multi-Language & Adaptive)
 */
export const generateMagicCourse = async (
  sourceContent: string,
  config: {
    sourceLanguage: string;
    targetLanguages: string[];
    level: DifficultyLevel;
    tone: CourseTone;
    length: 'SHORT' | 'MEDIUM';
    pedagogyMode: PedagogyMode;
  }
): Promise<GeneratedCourse | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cardCount = config.length === 'SHORT' ? 5 : 8;
    
    const outputLanguages = Array.from(new Set(['en', ...config.targetLanguages]));

    const localizedStringSchema: Schema = {
        type: Type.OBJECT,
        properties: {},
        required: ['en']
    };
    
    outputLanguages.forEach(lang => {
        if(localizedStringSchema.properties) {
            localizedStringSchema.properties[lang] = { type: Type.STRING };
        }
    });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: localizedStringSchema,
        description: localizedStringSchema,
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific skills or topics this course teaches (e.g. 'wine-pairing', 'conflict-resolution')" },
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['COVER', 'INFO', 'QUIZ', 'POLL', 'REWARD'] },
              title: localizedStringSchema,
              content: localizedStringSchema,
              mediaPrompt: { type: Type.STRING, description: "Detailed English prompt for Unsplash" },
              duration: { type: Type.NUMBER },
              topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Topics specific to this card/question" },
              interaction: {
                type: Type.OBJECT,
                properties: {
                  question: localizedStringSchema,
                  options: { 
                      type: Type.ARRAY, 
                      items: localizedStringSchema 
                  },
                  correctOptionIndex: { type: Type.NUMBER },
                  explanation: localizedStringSchema
                },
                required: ["question", "options", "correctOptionIndex"]
              }
            },
            required: ["id", "type", "title", "content", "mediaPrompt", "duration"]
          }
        }
      },
      required: ["title", "description", "cards", "tags", "topics"]
    };

    let pedagogyInstruction = "";
    switch (config.pedagogyMode) {
        case 'ACTIVE_RECALL': pedagogyInstruction = "Use 'Active Recall'. Every 2nd card MUST be a QUIZ."; break;
        case 'SOCRATIC': pedagogyInstruction = "Use 'Socratic Method'. Ask rhetorical questions in INFO cards."; break;
        case 'STORYTELLING': pedagogyInstruction = "Use a narrative arc. Introduce a character or scenario."; break;
        default: pedagogyInstruction = "Use standard micro-learning best practices.";
    }

    const prompt = `
      ROLE: Instructional Designer & Data Scientist.
      
      TASK: Create a micro-course based on the source text.
      
      INPUT LANGUAGE: ${config.sourceLanguage}
      OUTPUT LANGUAGES: ${outputLanguages.join(', ')}.
      
      IMPORTANT: "en" (English) is the MASTER COPY. 
      1. First, create the content in English.
      2. Then, translate to: ${config.targetLanguages.join(', ')}.
      
      INTELLIGENCE:
      - Identify 2-3 specific 'topics' (kebab-case) that represent the skills taught (e.g., 'upselling-techniques', 'room-service-etiquette').
      - Add these to the course 'topics' field.
      
      PEDAGOGY: ${pedagogyInstruction}
      TONE: ${config.tone}.
      LEVEL: ${config.level}.
      LENGTH: ~${cardCount} cards.
      
      [SOURCE CONTENT]:
      ${sourceContent.substring(0, 15000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4,
        maxOutputTokens: 8192,
      }
    });

    const rawText = response.text;
    if (rawText) {
      const cleanedJson = cleanJsonResponse(rawText);
      const data = JSON.parse(cleanedJson) as GeneratedCourse;
      
      data.cards = data.cards.map((card, i) => ({
          ...card,
          id: `card-${Date.now()}-${i}`,
          mediaUrl: `https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop`,
      }));
      
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};
