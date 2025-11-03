
'use server';

import { getAIChatResponse as getSupportResponse } from '@/app/ai-actions';

export async function getAIChatResponse(question: string, image?: string) {
    try {
        const result = await getSupportResponse({question, image});
        return result;
    } catch (error) {
        console.error("Error in getAIChatResponse:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}
