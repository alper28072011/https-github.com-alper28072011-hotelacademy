import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TEXT GENERATION (Gemini 3 Pro Preview - Thinking Model) ---

export type ContentMode = 'single' | 'series';

interface GeneratedCourseData {
  title: string;
  description: string;
  imagePrompt: string;
  modules?: { title: string; description: string }[]; // Optional for single mode
  tags?: string[];
}

export const generateCourseDraft = async (
  topic: string, 
  language: string, 
  mode: ContentMode,
  contextData: string = ""
): Promise<GeneratedCourseData | null> => {
  try {
    let prompt = "";
    let schema = {};

    if (mode === 'single') {
        // Prompt for Single Post (Instagram Story style)
        prompt = `
          Act as an expert Hotel Social Media Manager and Trainer.
          Create a content draft for a SINGLE training post (byte-sized learning) about: "${topic}".
          Context/Source Material: "${contextData}".
          Output Language: ${language}.
          
          CRITICAL INSTRUCTIONS:
          1. Title: MUST be short, catchy, and under 10 words. Do NOT put the full content here.
          2. Description: A concise, engaging paragraph explaining the tip or concept (max 300 characters).
          3. Image Prompt: 3 English keywords for a stock photo.
          4. Tags: 3 relevant hashtags.
        `;

        schema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Max 10 words catchy headline" },
              description: { type: Type.STRING, description: "The main content body" },
              imagePrompt: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "imagePrompt"]
        };

    } else {
        // Prompt for Series (Full Course)
        prompt = `
          Act as an expert Hotel Operations Manager and Instructional Designer.
          Create a comprehensive training course outline about: "${topic}".
          Context/Source Material: "${contextData}".
          Output Language: ${language}.
          
          CRITICAL INSTRUCTIONS:
          1. Title: Professional course title (max 10 words).
          2. Description: Motivating course summary (max 2 sentences).
          3. Modules: Break down the topic into 3-5 distinct learning modules/steps.
          4. Image Prompt: 3 English keywords for a stock photo.
        `;

        schema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short professional title" },
              description: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              modules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                  }
                }
              }
            },
            required: ["title", "description", "modules", "imagePrompt"]
        };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedCourseData;
    }
    return null;
  } catch (error) {
    console.error("Gemini Course Gen Error:", error);
    return null;
  }
};

export const translateContent = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following hotel training content into ${targetLanguage}. Maintain a professional, hospitable tone. \n\nContent: ${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};

// --- IMAGE GENERATION (REMOVED AI - Using Stock Search) ---

export const generateCourseImage = async (keywords: string): Promise<string | null> => {
  try {
    const safeKeywords = (typeof keywords === 'string' && keywords) ? keywords.split(' ')[0] : "hotel";
    return `https://source.unsplash.com/800x1200/?hotel,${encodeURIComponent(safeKeywords)}`; 
  } catch (error) {
    return `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`;
  }
};
