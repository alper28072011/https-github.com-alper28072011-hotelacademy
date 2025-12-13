import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TEXT GENERATION (Gemini 2.5 Flash) ---

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
      3. Image Prompt: A cinematic, photorealistic prompt to generate a cover image for this course (in English).
      4. Modules: 3-5 key learning steps.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
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
      model: 'gemini-2.5-flash',
      contents: `Translate the following hotel training content into ${targetLanguage}. Maintain a professional, hospitable tone. \n\nContent: ${text}`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};

// --- IMAGE GENERATION (Gemini 3 Pro Image Preview - Nano Banana Pro) ---

export const generateCourseImage = async (prompt: string): Promise<string | null> => {
  try {
    // Note: In a real app, we check if the user selected a high-quality option.
    // Defaulting to 1K square image for course thumbnails.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Portrait for course posters
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;

  } catch (error) {
    console.warn("Gemini Image Gen Error (Falling back to Unsplash):", error);
    // Fallback if API key doesn't support image gen or quota exceeded
    return `https://source.unsplash.com/800x1200/?hotel,${encodeURIComponent(prompt.split(' ')[0])}`;
  }
};
