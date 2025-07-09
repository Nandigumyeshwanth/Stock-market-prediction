'use server';
/**
 * @fileOverview A Genkit flow for fetching and predicting stock data.
 *
 * - getStockData - A function that returns realistic current and historical data for a stock.
 * - StockDataInput - The input type for the getStockData function.
 * - StockDataOutput - The return type for the getStockData function.
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

const StockDataInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol to get data for.'),
});
export type StockDataInput = z.infer<typeof StockDataInputSchema>;

const StockDataOutputSchema = z.object({
  stock: StockSchema,
  chartData: z.array(ChartDataSchema).describe('An array of 10 data points for the last 6 months and a 4-month prediction.'),
});
export type StockDataOutput = z.infer<typeof StockDataOutputSchema>;

export async function getStockData(input: StockDataInput): Promise<StockDataOutput> {
  return stockDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'stockDataPrompt',
  system: `You are a financial data API. You generate realistic but fictional stock data.
You will be given a stock ticker. You MUST return a valid JSON object matching the output schema. Do not add any commentary.
The data must be consistent. The 'price' in the main 'stock' object must be the same as the last 'price' in the 'chartData' array.
The 'prediction' values should form a smooth continuation from the historical 'price' values.`,
  input: { schema: StockDataInputSchema },
  output: { schema: StockDataOutputSchema },
  prompt: `
    Generate data for the ticker: {{{ticker}}}.

    Follow these rules for the chart data:
    - Create exactly 10 data points.
    - The first 6 points are historical. They MUST have both a 'price' and a 'prediction' value.
    - The last 4 points are future predictions. They MUST have a 'prediction' value, but the 'price' value should be omitted.
    - The 'date' should be a three-letter month abbreviation. Start with a month from 6 months ago and continue sequentially.
  `,
});


const stockDataFlow = ai.defineFlow(
  {
    name: 'stockDataFlow',
    inputSchema: StockDataInputSchema,
    outputSchema: StockDataOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      throw new Error('AI model failed to generate valid stock data.');
    }
    
    // Find the last data point that has a historical price.
    const lastHistoricalDataIndex = output.chartData.findLastIndex(d => d.price !== undefined && d.price !== null);

    if (lastHistoricalDataIndex !== -1) {
      const lastHistoricalPoint = output.chartData[lastHistoricalDataIndex];
      
      if (lastHistoricalPoint.price) {
        // RULE 1: The current stock price must match the last known historical price.
        output.stock.price = lastHistoricalPoint.price;
        
        // RULE 2: The prediction line should be continuous with the price line.
        // Set the prediction value of the last historical point to be the same as its price.
        lastHistoricalPoint.prediction = lastHistoricalPoint.price;
      }
    }

    return output;
  }
);
