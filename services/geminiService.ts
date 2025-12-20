
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, LocalizedString } from "../types";

interface GeneratedCourse {
  title: LocalizedString;
  description: LocalizedString;
  cards: StoryCard[];
  tags: string[];
}

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * GENERATE MAGIC COURSE V2 (Multi-Language & Pedagogical)
 */
export const generateMagicCourse = async (
  sourceContent: string,
  config: {
    level: DifficultyLevel;
    tone: CourseTone;
    length: 'SHORT' | 'MEDIUM';
    targetLanguages: string[]; // ['en', 'tr', 'ru']
    pedagogyMode: PedagogyMode;
  }
): Promise<GeneratedCourse | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cardCount = config.length === 'SHORT' ? 5 : 8;
    const languages = config.targetLanguages;

    // --- 1. DYNAMIC SCHEMA CONSTRUCTION ---
    // We need to tell Gemini exactly what structure to return for "title", "content", etc.
    // based on the requested languages.
    
    const localizedStringSchema: Schema = {
        type: Type.OBJECT,
        properties: {},
        required: languages
    };
    
    // Add each language code as a required string property
    languages.forEach(lang => {
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
              interaction: {
                type: Type.OBJECT,
                properties: {
                  question: localizedStringSchema,
                  // Options is an array of LocalizedObjects
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
      required: ["title", "description", "cards", "tags"]
    };

    // --- 2. PEDAGOGY PROMPT ENGINEERING ---
    let pedagogyInstruction = "";
    switch (config.pedagogyMode) {
        case 'ACTIVE_RECALL':
            pedagogyInstruction = "Use the 'Active Recall' method. Every 2nd card MUST be a QUIZ. Force the user to retrieve information just presented.";
            break;
        case 'SOCRATIC':
            pedagogyInstruction = "Use the 'Socratic Method'. Ask rhetorical questions in INFO cards. Make the learner think before revealing answers. Use QUIZ cards to challenge assumptions.";
            break;
        case 'STORYTELLING':
            pedagogyInstruction = "Use a narrative arc. Introduce a character or a scenario at the start. All content should relate to solving this character's problem.";
            break;
        case 'CASE_STUDY':
            pedagogyInstruction = "Present a real-world hotel scenario (Problem -> Analysis -> Solution). Use concrete examples.";
            break;
        default:
            pedagogyInstruction = "Use standard micro-learning best practices. mix INFO and QUIZ cards for engagement.";
    }

    const prompt = `
      ROLE: Elite Instructional Designer & Polyglot Linguist for Luxury Hospitality.
      
      TASK: Create a micro-course based on the source text.
      TARGET LANGUAGES: ${languages.join(', ')}.
      
      PEDAGOGY STRATEGY: ${pedagogyInstruction}
      
      TONE: ${config.tone}.
      DIFFICULTY: ${config.level}.
      LENGTH: ~${cardCount} cards.
      
      CRITICAL INSTRUCTIONS:
      1. Returns ALL text fields (title, content, question, options) as objects containing translations for: ${languages.join(', ')}.
      2. 'mediaPrompt' must be in English, describing a high-end, photorealistic scene suitable for Unsplash.
      3. For QUIZ cards, ensure 'options' is an array where each item is a localized object.
      
      [SOURCE CONTENT]:
      ${sourceContent.substring(0, 15000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.4, // Lower temperature for stricter translation adherence
        maxOutputTokens: 8192,
      }
    });

    const rawText = response.text;
    if (rawText) {
      const cleanedJson = cleanJsonResponse(rawText);
      const data = JSON.parse(cleanedJson) as GeneratedCourse;
      
      // Post-process IDs and Images
      data.cards = data.cards.map((card, i) => ({
          ...card,
          id: `card-${Date.now()}-${i}`,
          mediaUrl: `https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop`, // Placeholder, usually handled by UI fetching Unsplash
      }));
      
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};

/**
 * LEGACY TRANSLATION (Kept for compatibility or single-field translation)
 */
export const translateContent = async (
    content: Record<string, any>, 
    sourceLang: string, 
    targetLangs: string[]
): Promise<Record<string, any> | null> => {
    // This function can be deprecated or updated to use the new schema approach if needed individually
    return null; 
};
