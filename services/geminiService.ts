
import { GoogleGenAI, Type } from "@google/genai";
import { StoryCard, StoryCardType, InteractionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeneratedMicroCourse {
  title: string;
  description: string;
  cards: StoryCard[];
  tags: string[];
}

/**
 * GENERATE MICRO COURSE
 * Converts raw text/source into a gamified Instagram Story-like course.
 * OPTIMIZED: Uses gemini-2.5-flash for speed and cost-efficiency.
 */
export const generateMicroCourse = async (
  sourceContent: string,
  params: {
    targetAudience: string;
    tone: 'PROFESSIONAL' | 'FUN' | 'STRICT';
    language: string;
  }
): Promise<GeneratedMicroCourse | null> => {
  try {
    const toneInstructions = params.tone === 'FUN' 
      ? "Tone: Fun, energetic, uses emojis (🚀), addresses user as 'Sen'." 
      : "Tone: Professional, clear, business-oriented, addresses user as 'Siz'.";

    // Optimized Prompt: Shorter, clearer instructions to save input tokens and guide the model faster.
    const prompt = `
      Role: Expert Instructional Designer.
      Task: Convert [SOURCE] into a Micro-Learning Course (Story format).
      
      Settings:
      - Audience: ${params.targetAudience}
      - Language: ${params.language}
      - ${toneInstructions}
      
      Rules:
      1. Create exactly 5-7 cards.
      2. Card 1: 'VIDEO' (Hook/Intro).
      3. Middle: Mix 'INFO' and 'QUIZ'.
      4. Last Card: 'XP_REWARD'.
      5. Text length: MAX 200 chars per card (Concise!).
      6. mediaUrl: ONE English keyword for stock search (e.g. 'hotel lobby').
      
      [SOURCE]:
      "${sourceContent.substring(0, 12000)}" 
    `;

    // Define the exact schema for the UI to render
    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Short catchy title" },
        description: { type: Type.STRING, description: "1 sentence summary" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['INFO', 'QUIZ', 'VIDEO', 'XP_REWARD'] },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              mediaUrl: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              interaction: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE'] },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptionIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                nullable: true
              }
            },
            required: ["id", "type", "title", "content", "mediaUrl", "duration"]
          }
        }
      },
      required: ["title", "description", "cards", "tags"]
    };

    // Switched to gemini-2.5-flash for optimum speed/cost ratio for JSON tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, // Balanced creativity
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as GeneratedMicroCourse;
      
      // Post-process: Add IDs and clean up
      data.cards = data.cards.map((card, index) => ({
          ...card,
          id: `card-${Date.now()}-${index}`,
          // Convert keyword to Unsplash URL
          mediaUrl: `https://source.unsplash.com/800x1200/?${encodeURIComponent(card.mediaUrl || 'business')}`
      }));
      
      return data;
    }
    return null;

  } catch (error) {
    console.error("Gemini Micro-Course Generation Error:", error);
    return null;
  }
};

export const translateContent = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate to ${targetLanguage}: ${text}`,
    });
    return response.text || text;
  } catch (error) {
    return text;
  }
};
