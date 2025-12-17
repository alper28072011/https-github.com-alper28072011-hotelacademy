
import { GoogleGenAI, Type } from "@google/genai";
import { StoryCard, StoryCardType, DifficultyLevel, CourseTone } from "../types";

interface GeneratedCourse {
  title: string;
  description: string;
  cards: StoryCard[];
  tags: string[];
}

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * GENERATE MAGIC COURSE
 * Soru formatı ve içerik kalitesi için optimize edildi.
 */
export const generateMagicCourse = async (
  sourceContent: string,
  config: {
    level: DifficultyLevel;
    tone: CourseTone;
    length: 'SHORT' | 'MEDIUM';
    language: string;
  }
): Promise<GeneratedCourse | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cardCount = config.length === 'SHORT' ? 5 : 10;
    
    const prompt = `
      Role: Senior Instructional Designer & Storyteller.
      Task: Transform [SOURCE] into an engaging Micro-Learning Story.
      
      Rules for Interaction (QUIZ):
      - If a card type is 'QUIZ', it MUST have an 'interaction' object.
      - 'options' must be an array of EXACTLY 3-4 strings.
      - 'correctOptionIndex' must be a valid 0-based index.
      - 'explanation' should be a short helpful feedback.
      
      Rules for Media:
      - 'mediaPrompt' must be a high-quality descriptive English keyword.

      Language: ${config.language}
      Slide Count: ~${cardCount}
      
      [SOURCE]:
      ${sourceContent.substring(0, 8000)}
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['COVER', 'INFO', 'QUIZ', 'POLL', 'REWARD'] },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              mediaPrompt: { type: Type.STRING },
              duration: { type: Type.NUMBER },
              interaction: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  correctOptionIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
        maxOutputTokens: 5000,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const rawText = response.text;
    if (rawText) {
      const cleanedJson = cleanJsonResponse(rawText);
      const data = JSON.parse(cleanedJson) as GeneratedCourse;
      
      data.cards = data.cards.map((card, i) => ({
          ...card,
          id: `card-${Date.now()}-${i}`,
          mediaUrl: `https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop`
      }));
      
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};
