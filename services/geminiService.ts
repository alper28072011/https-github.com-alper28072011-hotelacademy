import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TEXT GENERATION (Gemini 3 Pro Preview - Thinking Model) ---

interface GeneratedCourseData {
  title: string;
  description: string;
  imagePrompt: string;
  modules: { title: string; description: string }[];
}

export const generateCourseDraft = async (
  topic: string, 
  language: string, 
  contextData: string = ""
): Promise<GeneratedCourseData | null> => {
  try {
    const prompt = `
      Act as an expert Hotel Operations Manager and Instructional Designer.
      Create a training course outline about: "${topic}".
      Context/Source Material: "${contextData}".
      
      Output Language: ${language}.
      
      Requirements:
      1. Title: Catchy and professional.
      2. Description: Motivating summary (max 2 sentences).
      3. Image Prompt: A set of 3 english keywords to search for a stock photo (e.g. "luxury hotel lobby").
      4. Modules: 3-5 key learning steps.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Switched to Gemini 3 Pro Preview
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Enable Thinking Model
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
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
          }
        }
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
      model: 'gemini-2.5-flash', // Keep Flash for simple translation tasks to save budget
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
  // We have removed Gemini Nano Banana image generation support.
  // Instead, we use the keywords to generate a high-quality stock photo URL.
  
  try {
    const safeKeywords = (typeof keywords === 'string' && keywords) ? keywords.split(' ')[0] : "hotel";
    // Return a dynamic Unsplash Source URL based on keywords
    // Using 800x1200 for portrait course covers
    return `https://source.unsplash.com/800x1200/?hotel,${encodeURIComponent(safeKeywords)}`; 
  } catch (error) {
    // Ultimate fallback
    return `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80`;
  }
};
