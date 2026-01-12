import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { GameTask } from '../../../shared/types/game.types';

export interface PlayerTaskContext {
    level: number;
    xp: number;
    inventory: { [key: string]: number };
    ownedFactories: string[];
    existingTaskIds: string[];
}

@Injectable({ providedIn: 'root' })
export class AiTaskService {
    private ai: GoogleGenAI;

    private readonly responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'A unique ID for the task, e.g., "task_ai_1"' },
                description: { type: Type.STRING, description: 'A user-friendly description of the task, e.g., "Harvest 15 Corn"' },
                type: { type: Type.STRING, description: 'The type of task. For now, always "INVENTORY"' },
                targetItemId: { type: Type.STRING, description: 'The ID of the crop, animal product, or factory good to be collected. Must be a valid ID from the context.' },
                targetQuantity: { type: Type.INTEGER, description: 'The amount of the item the player needs to have.' },
                reward: {
                    type: Type.OBJECT,
                    properties: {
                        coins: { type: Type.INTEGER, description: 'Number of coins to award.' },
                        xp: { type: Type.INTEGER, description: 'Number of experience points to award.' }
                    }
                }
            }
        }
    };
    
    constructor() {
        // IMPORTANT: The API key is injected via the environment and should not be hardcoded.
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    }

    async generateTasks(context: PlayerTaskContext): Promise<GameTask[]> {
        const systemInstruction = `You are a game designer for a farming game called Gemini Farm. Your role is to generate 3 fun, engaging, and achievable daily tasks for the player.
- The tasks should be relevant to the player's current level, inventory, and available factories.
- Do not create tasks for items the player cannot produce (e.g., don't ask for Flour if they don't have a Mill).
- Base quantities on the player's current inventory and level. A good task asks for a bit more than what they have, encouraging them to play.
- Provide varied tasks: some for harvesting basic crops, some for collecting animal products, and some for producing factory goods if possible.
- The task IDs must be unique.
- The response must be a valid JSON array matching the provided schema.`;

        const prompt = `Here is the player's current context. Please generate 3 new daily tasks for them.

Context:
${JSON.stringify(context, null, 2)}
`;
        
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: this.responseSchema,
                }
            });

            const jsonText = response.text.trim();
            const generatedTasks = JSON.parse(jsonText);
            
            // Basic validation
            if (!Array.isArray(generatedTasks)) {
                throw new Error("AI response is not an array.");
            }

            return generatedTasks as GameTask[];

        } catch (error) {
            console.error("Error generating tasks with Gemini:", error);
            // In a real app, you might want to return a default set of tasks or handle this more gracefully.
            throw new Error("Failed to generate tasks. Please try again later.");
        }
    }
}