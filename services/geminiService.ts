
import { GoogleGenAI, Type } from "@google/genai";
import { StoryCard, StoryCardType, DifficultyLevel, CourseTone } from "../types";

interface GeneratedCourse {
  title: string;
  description: string;
  cards: StoryCard[];
  tags: string[];
}

/**
 * Helper: Yanıt metnindeki Markdown kod bloklarını temizler.
 */
const cleanJsonResponse = (text: string): string => {
  // ```json ve ``` bloklarını kaldırır
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * GENERATE MAGIC COURSE
 * Gemini 3 Flash ile yüksek hızda yapılandırılmış eğitim içeriği üretir.
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
    // Her çağrıda yeni instance (En güncel API KEY kullanımı için zorunludur)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const cardCount = config.length === 'SHORT' ? 5 : 10;
    
    const prompt = `
      Role: Expert Instructional Designer for 5-star Hotel Staff.
      Task: Convert the [SOURCE] into a Micro-Learning "Story" Course.
      
      Parameters:
      - Audience Level: ${config.level}
      - Tone: ${config.tone}
      - Language: ${config.language}
      - Target Slide Count: Approximately ${cardCount} cards.
      
      Structure:
      1. Card 1: 'COVER' (Intro)
      2. Middle: 'INFO' cards (Concise knowledge, max 160 chars)
      3. Interactivity: Every 2-3 info cards, insert 1 'QUIZ'
      4. End: 'REWARD' (Success message)
      
      'mediaPrompt' guidelines: High-quality English keyword for professional photography.
      
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
        maxOutputTokens: 4000, // Çıktı için yeterli alan sağla
        thinkingConfig: { thinkingBudget: 0 } // Flash hızını maksimize et
      }
    });

    const rawText = response.text;
    if (rawText) {
      const cleanedJson = cleanJsonResponse(rawText);
      const data = JSON.parse(cleanedJson) as GeneratedCourse;
      
      // StoryCard ID'lerini ve placeholder görsellerini düzenle
      data.cards = data.cards.map((card, i) => ({
          ...card,
          id: `card-${Date.now()}-${i}`,
          mediaUrl: `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop&sig=${i}`
      }));
      
      return data;
    }
    return null;
  } catch (error) {
    console.error("Gemini Magic Error:", error);
    return null;
  }
};
