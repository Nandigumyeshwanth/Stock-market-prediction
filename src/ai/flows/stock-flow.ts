'use server';
/**
 * @fileOverview A Genkit flow for fetching and predicting stock data for multiple tickers.
 *
 * - getStockData - A function that returns realistic current and historical data for a list of stocks.
 * - StockDataInput - The input type for the getStockData function.
 * - StockData - The type for a single stock's data object.
 * - StockDataOutput - The return type for the getStockData function (an array of StockData).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StockSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  name: z.string().describe('The full company name.'),
  price: z.number().describe('The current price of the stock.'),
  change: z.number().describe('The change in the stock price for the day.'),
  changePercent: z.number().describe('The percentage change in the stock price for the day.'),
});

const ChartDataSchema = z.object({
  date: z.string().describe("The month for the data point (e.g., 'Jan', 'Feb')."),
  price: z.number().optional().describe('The actual historical price for that month. Should be present for past months.'),
  prediction: z.number().optional().describe('The predicted price for that month. Should be present for all months.'),
});

const SingleStockDataSchema = z.object({
  stock: StockSchema,
  chartData: z.array(ChartDataSchema).describe('An array of 10 data points for the last 6 months and a 4-month prediction.'),
});
export type StockData = z.infer<typeof SingleStockDataSchema>;


// Input is now an array of tickers
const StockDataInputSchema = z.object({
  tickers: z.array(z.string()).describe('The list of stock ticker symbols to get data for.'),
});
export type StockDataInput = z.infer<typeof StockDataInputSchema>;

// Output is now an array of stock data
const StockDataOutputSchema = z.array(SingleStockDataSchema);
export type StockDataOutput = z.infer<typeof StockDataOutputSchema>;

// The exported function signature changes
export async function getStockData(input: StockDataInput): Promise<StockDataOutput> {
  return stockDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'stockDataPrompt',
  system: `You are a financial data API. You generate fictional stock data using random numbers. Your output MUST be a valid JSON array matching the output schema. Do not add any commentary outside of the JSON object.

For EACH ticker provided in the input, you must generate a corresponding entry in the output array with the following rules:
- Generate a plausible full company name for the ticker. If you do not recognize the ticker, invent a plausible name.
- The stock's 'price', 'change', and 'changePercent' should be random numbers. The 'price' should be between 100 and 8000.
- The chartData array must contain exactly 10 sequential monthly data points (e.g., 'Jan', 'Feb', ...).
- For the first 6 historical points, the 'price' property must be a random number between 100 and 8000.
- For the last 4 prediction points, the 'price' property must be absent.
- For all 10 points, the 'prediction' property must be a random number between 100 and 8000.
- The data does NOT need to be realistic or continuous. It should be random as requested.
- It is critical that you return an entry for every ticker provided in the input.`,
  input: { schema: StockDataInputSchema },
  output: { schema: StockDataOutputSchema },
  prompt: `Generate random stock data for the following tickers: {{#each tickers}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.`,
});


const stockDataFlow = ai.defineFlow(
  {
    name: 'stockDataFlow',
    inputSchema: StockDataInputSchema,
    outputSchema: StockDataOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);

      if (!output) {
        console.error('AI model failed to generate any stock data.');
        return [];
      }
      
      // Warn if the data is incomplete, but don't throw an error.
      if (output.length !== input.tickers.length) {
        console.warn("The AI model did not return data for all requested tickers. Returning partial data.");
      }

      // Return the raw output directly, without supervisor logic.
      return output;
    } catch (error: any) {
      // Log the actual error for debugging, but don't let it crash the app.
      console.error("An error occurred in the stockDataFlow:", error.message || error);
      // Return an empty array to be handled gracefully by the frontend.
      return [];
    }
  }
);
