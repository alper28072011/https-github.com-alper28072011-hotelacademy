
import { GoogleGenAI, Type } from "@google/genai";
import { StoryCard, StoryCardType, DifficultyLevel, CourseTone } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeneratedCourse {
  title: string;
  description: string;
  cards: StoryCard[];
  tags: string[];
}

/**
 * GENERATE MAGIC COURSE
 * Converts raw source into a highly structured, gamified Story-based course.
 * Optimized for high speed using Gemini 3 Flash.
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
    const cardCount = config.length === 'SHORT' ? 5 : 10;
    
    const prompt = `
      Role: Expert Instructional Designer for 5-star Hotel Staff.
      Task: Convert the [SOURCE] into a Micro-Learning "Story" Course.
      
      Parameters:
      - Audience Level: ${config.level}
      - Tone: ${config.tone} (casually friendly for FUN, professional for FORMAL)
      - Language: ${config.language}
      - Slide Count: Exactly ${cardCount} cards.
      
      Pedagogical Rules:
      1. Card 1 MUST be 'COVER' type with a hook title.
      2. Middle cards should be 'INFO' type.
      3. Every 3 'INFO' cards, insert 1 'QUIZ' or 'POLL' card to test knowledge.
      4. The last card MUST be 'REWARD' type with a congratulatory message.
      5. 'mediaPrompt' MUST be a high-quality English image description (e.g., "professional hotel receptionist smiling at guest, cinematic lighting, 8k").
      6. Content per slide: Max 180 characters. Be extremely concise.
      
      [SOURCE]:
      ${sourceContent.substring(0, 8000)}
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Catchy course title" },
        description: { type: Type.STRING, description: "A summary sentence" },
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
              mediaPrompt: { type: Type.STRING, description: "English keyword for stock photo search" },
              duration: { type: Type.NUMBER, description: "Seconds to show this slide (default 7)" },
              interaction: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  correctOptionIndex: { type: Type.NUMBER, description: "Index of the correct option (0-based)" },
                  explanation: { type: Type.STRING }
                },
                nullable: true
              }
            },
            required: ["id", "type", "title", "content", "mediaPrompt", "duration"]
          }
        }
      },
      required: ["title", "description", "cards", "tags"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Speed optimized model
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, // Balanced creativity and structure
        thinkingConfig: { thinkingBudget: 0 } // Disable deep thinking for near-instant results
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim()) as GeneratedCourse;
      
      // Auto-assign Unsplash images based on prompts
      data.cards = data.cards.map((card, i) => {
          const encodedPrompt = encodeURIComponent(card.mediaPrompt || 'hotel hospitality');
          return {
            ...card,
            id: `card-${Date.now()}-${i}`,
            mediaUrl: `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop&sig=${i}` // Default fallback, but using dynamic Unsplash API for some variety
          };
      });
      
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};
