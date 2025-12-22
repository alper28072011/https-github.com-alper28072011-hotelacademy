
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StoryCard, DifficultyLevel, CourseTone, PedagogyMode, LocalizedString, StoryCardType, ContentGenerationConfig, GeneratedModule } from "../types";

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
 * SEMANTIC SEARCH EXPANDER
 */
export const expandSearchQuery = async (query: string): Promise<string[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const schema: Schema = { type: Type.ARRAY, items: { type: Type.STRING } };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `User Query: "${query}". Return 3-5 related synonyms/tags for hotel training. JSON Array.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) {
            const tags = JSON.parse(cleanJsonResponse(response.text));
            return Array.from(new Set([query.toLowerCase(), ...tags.map((t: string) => t.toLowerCase())]));
        }
        return [query.toLowerCase()];
    } catch (e) {
        return [query.toLowerCase()];
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
        const baseText = content[sourceLang] || Object.values(content)[0];
        if (!baseText) return content;

        const realTargets = targetLangs.filter(l => l !== sourceLang);
        if (realTargets.length === 0) return content;

        const schema: Schema = { type: Type.OBJECT, properties: {}, required: [] };
        realTargets.forEach(l => { if(schema.properties) schema.properties[l] = { type: Type.STRING }; });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate "${baseText}" from ${sourceLang} to: ${realTargets.join(', ')}. Keep tone consistent.`,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) {
            return { ...content, ...JSON.parse(cleanJsonResponse(response.text)) };
        }
        return content;
    } catch (e) {
        return content;
    }
};

/**
 * NEW: GENERATE CURRICULUM (STEP 3)
 * Plans the course structure before generating detailed slides.
 */
export const generateCurriculum = async (config: ContentGenerationConfig): Promise<GeneratedModule[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let pedagogyInstruction = "";
        if (config.pedagogy === 'FEYNMAN') pedagogyInstruction = "Using the Feynman Technique, simplify complex concepts into analogies a 5-year-old would understand.";
        if (config.pedagogy === 'ACTIVE_RECALL') pedagogyInstruction = "Focus on testing knowledge. Structure the modules to challenge the user's memory.";
        if (config.pedagogy === 'SOCRATIC') pedagogyInstruction = "Teach through questions. Each module should explore a 'Why' or 'How'.";

        const schema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "description", "keyPoints"]
            }
        };

        const prompt = `
            ROLE: Expert Instructional Designer.
            TASK: Design a ${config.length} curriculum outline (3-5 modules).
            TOPIC/SOURCE: "${config.sourceContent.substring(0, 5000)}"
            TARGET AUDIENCE: ${config.targetAudience}
            TONE: ${config.tone}
            METHODOLOGY: ${pedagogyInstruction}
            LANGUAGE: ${config.language} (Output must be in this language)
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });

        if (response.text) {
            const modules = JSON.parse(cleanJsonResponse(response.text));
            return modules.map((m: any, i: number) => ({ ...m, id: `mod_${Date.now()}_${i}` }));
        }
        return [];
    } catch (e) {
        console.error("Curriculum Gen Error:", e);
        return [];
    }
};

/**
 * GENERATE MAGIC COURSE (STEP 4)
 * Generates the full slide deck based on the approved curriculum or raw text.
 */
export const generateMagicCourse = async (
  config: ContentGenerationConfig,
  curriculum?: GeneratedModule[] // Optional: If provided, guides the generation
): Promise<GeneratedCourse | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const outputLanguages = Array.from(new Set(['en', ...config.targetLanguages]));

    // Define Localized Schema
    const localizedStringSchema: Schema = { type: Type.OBJECT, properties: {}, required: ['en'] };
    outputLanguages.forEach(lang => { if(localizedStringSchema.properties) localizedStringSchema.properties[lang] = { type: Type.STRING }; });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: localizedStringSchema,
        description: localizedStringSchema,
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        topics: { type: Type.ARRAY, items: { type: Type.STRING } },
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['COVER', 'INFO', 'QUIZ', 'POLL', 'REWARD'] },
              title: localizedStringSchema,
              content: localizedStringSchema,
              mediaPrompt: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
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
        }
      },
      required: ["title", "cards"]
    };

    let pedagogyInstruction = "";
    switch (config.pedagogy) {
        case 'FEYNMAN': pedagogyInstruction = "Apply Feynman Technique: Use simple analogies, avoid jargon. Explain it like the user is 5 years old. Focus on 'What', 'Why', 'How'."; break;
        case 'ACTIVE_RECALL': pedagogyInstruction = "Apply Active Recall: Every 2nd slide MUST be a QUIZ type. Force the user to retrieve information immediately."; break;
        case 'SOCRATIC': pedagogyInstruction = "Apply Socratic Method: Use questions in titles. Lead the user to the answer through reasoning."; break;
        case 'CASE_STUDY': pedagogyInstruction = "Use a Story/Scenario. Introduce a character (e.g. 'John the Guest'). Solve their problem step-by-step."; break;
        default: pedagogyInstruction = "Standard micro-learning. Concise and clear.";
    }

    const contextStr = curriculum 
        ? `Use this approved curriculum as the structure: ${JSON.stringify(curriculum)}`
        : `Source Content: "${config.sourceContent.substring(0, 10000)}"`;

    const prompt = `
      ROLE: Instructional Designer.
      TASK: Create a micro-course.
      INPUT LANGUAGE: ${config.language}
      OUTPUT LANGUAGES: ${outputLanguages.join(', ')} (English 'en' is master).
      
      PEDAGOGY: ${pedagogyInstruction}
      TONE: ${config.tone}
      AUDIENCE: ${config.targetAudience}
      
      ${contextStr}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 }
    });

    if (response.text) {
      const data = JSON.parse(cleanJsonResponse(response.text)) as GeneratedCourse;
      data.cards = data.cards.map((card, i) => ({
          ...card,
          id: `card-${Date.now()}-${i}`,
          mediaUrl: `https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop`, // Placeholder
      }));
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};

// Legacy support
export const generateCardsFromText = async (text: string) => { return []; };
