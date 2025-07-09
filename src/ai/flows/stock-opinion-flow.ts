'use server';
/**
 * @fileOverview A Genkit flow for generating an investment opinion on a stock.
 *
 * - getStockOpinion - A function that returns an AI-generated analysis of a stock.
 * - StockOpinionInput - The input type for the getStockOpinion function.
 * - StockOpinionOutput - The return type for the getStockOpinion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StockOpinionInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  name: z.string().describe('The full company name.'),
});
export type StockOpinionInput = z.infer<typeof StockOpinionInputSchema>;

const StockOpinionOutputSchema = z.object({
  opinion: z
    .string()
    .describe('The AI-generated investment opinion for the stock.'),
});
export type StockOpinionOutput = z.infer<typeof StockOpinionOutputSchema>;

export async function getStockOpinion(
  input: StockOpinionInput
): Promise<StockOpinionOutput> {
  return stockOpinionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'stockOpinionPrompt',
  system: `You are a financial analyst providing a brief, balanced investment opinion.
You will be given a stock ticker and company name.
Your response MUST be a valid JSON object matching the output schema.
Your opinion should start with a clear disclaimer: "Disclaimer: This is an AI-generated analysis and not financial advice. Always conduct your own research."
After the disclaimer, provide a concise analysis covering one potential positive and one potential negative aspect of the stock.
Keep the entire text to about 3-4 sentences.`,
  input: { schema: StockOpinionInputSchema },
  output: { schema: StockOpinionOutputSchema },
  prompt: `Generate an investment opinion for the stock: {{{name}}} ({{{ticker}}}).`,
});

const stockOpinionFlow = ai.defineFlow(
  {
    name: 'stockOpinionFlow',
    inputSchema: StockOpinionInputSchema,
    outputSchema: StockOpinionOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) {
        throw new Error('AI model failed to generate a stock opinion.');
      }
      return output;
    } catch (error: any) {
      console.error("An error occurred in the stockOpinionFlow:", error.message || error);
      // Return a default opinion on error to prevent crashing the frontend.
      return {
        opinion: "Disclaimer: This is an AI-generated analysis and not financial advice. The AI opinion is currently unavailable due to a technical issue. Please try again later."
      };
    }
  }
);
