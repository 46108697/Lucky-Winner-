
'use server';

import { getSupportResponse, CustomerSupportInputSchema, CustomerSupportOutputSchema } from '@/ai/flows/customer-support-flow';
import { z } from 'zod';


export async function getAIChatResponse(input: z.infer<typeof CustomerSupportInputSchema>): Promise<z.infer<typeof CustomerSupportOutputSchema>> {
    try {
        const result = await getSupportResponse(input);
        return result;
    } catch (error) {
        console.error("Error in getAIChatResponse:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}
