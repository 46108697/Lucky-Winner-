
'use server';

import { runFlow } from '@genkit-ai/flow';
import { getSupportResponse } from '@/ai/flows/customer-support-flow';
import { z } from 'zod';

const CustomerSupportInput = z.object({
    question: z.string(),
    image: z.string().optional(),
  });

const CustomerSupportOutput = z.string();

export async function getAIChatResponse(input: z.infer<typeof CustomerSupportInput>): Promise<z.infer<typeof CustomerSupportOutput>> {
    try {
        const result = await runFlow(getSupportResponse, input);
        return result;
    } catch (error) {
        console.error("Error in getAIChatResponse:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}
