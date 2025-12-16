
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
    const prompt = `
      Act as a world-class Instructional Designer and Gamification Expert for Hotel Staff Training.
      
      YOUR TASK:
      Convert the provided [SOURCE MATERIAL] into an interactive "Micro-Learning Story" (like Instagram Stories or Duolingo).
      
      AUDIENCE: ${params.targetAudience}
      TONE: ${params.tone}
      LANGUAGE: ${params.language}
      
      STRUCTURE RULES:
      1. Break the content into 5-10 "Story Cards".
      2. Card 1 must be a 'VIDEO' or 'INFO' card acting as an exciting hook/intro.
      3. Mix 'INFO' cards (short, punchy text) with 'QUIZ' cards (checking understanding).
      4. Every 2-3 info cards MUST be followed by a Quiz.
      5. The last card must be 'XP_REWARD' type with a congratulatory message.
      6. Content must be extremely concise (max 280 chars per card). Use emojis.
      7. For 'mediaUrl', provide a relevant English search keyword for a stock photo (e.g., "hotel receptionist smiling").
      
      SOURCE MATERIAL:
      "${sourceContent.substring(0, 10000)}" 
    `;

    // Define the exact schema for the UI to render
    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Catchy course title" },
        description: { type: Type.STRING, description: "Short summary" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['INFO', 'QUIZ', 'VIDEO', 'XP_REWARD'] },
              title: { type: Type.STRING },
              content: { type: Type.STRING, description: "Main text, use markdown for emphasis" },
              mediaUrl: { type: Type.STRING, description: "Keyword for stock image" },
              duration: { type: Type.NUMBER, description: "Estimated seconds to read (5-15)" },
              interaction: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE'] },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptionIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING, description: "Why is this correct?" }
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Allow it to think about pedagogical structure
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as GeneratedMicroCourse;
      // Post-process: Convert keywords to Unsplash URLs for demo
      data.cards = data.cards.map(card => ({
          ...card,
          mediaUrl: `https://source.unsplash.com/800x1200/?${encodeURIComponent(card.mediaUrl || 'hotel')}`
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
