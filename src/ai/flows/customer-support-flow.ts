'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const CustomerSupportInputSchema = z.object({
  question: z.string(),
  image: z.string().optional(),
});

export const CustomerSupportOutputSchema = z.string();

export type CustomerSupportInput = z.infer<typeof CustomerSupportInputSchema>;
export type CustomerSupportOutput = z.infer<typeof CustomerSupportOutputSchema>;

const customerSupportFlow = ai.defineFlow(
  {
    name: 'customerSupportFlow',
    inputSchema: CustomerSupportInputSchema,
    outputSchema: CustomerSupportOutputSchema,
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `Customer asked: ${input.question}\nProvide a helpful answer.`,
    });

    return response.text;
  }
);

export async function getSupportResponse(input: CustomerSupportInput): Promise<CustomerSupportOutput> {
  return await customerSupportFlow(input);
}
