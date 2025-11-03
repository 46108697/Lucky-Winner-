import { defineFlow } from '@genkit-ai/flow';
import { ai } from '../genkit';
import { z } from 'zod';

export const getSupportResponse = defineFlow(
  {
    name: 'customerSupportFlow',
    inputSchema: z.object({
        question: z.string(),
        image: z.string().optional(),
      }),
    outputSchema: z.string(),
  },
  async (input) => {
    const response = await ai.generate({
        prompt: `Customer asked: ${input.question}\nProvide a helpful answer.`,
      });

    return response.text;
  }
);
