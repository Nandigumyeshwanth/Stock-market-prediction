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
  input: { schema: StockDataInputSchema },
  output: { schema: StockDataOutputSchema },
  prompt: `
    You are a financial data analyst AI. Your task is to generate realistic, but fictional, stock market data for a given ticker symbol.

    Ticker: {{{ticker}}}

    Generate the following information:
    1.  **Stock Details**: A full company name, a realistic current price, and the daily change (both absolute and percentage). The price should be appropriate for a major company.
    2.  **Chart Data**: An array of 10 data points.
        - The data should represent the last 6 months of historical data and a 4-month future prediction.
        - Use month abbreviations for the date (Jan, Feb, Mar, etc.).
        - For the first 6 months, 'price' and 'prediction' values should be the same.
        - For the last 4 months, only the 'prediction' value should be present.
        - The final historical price (6th month) must match the current price from the stock details.
        - The predictions should follow a believable trend based on the historical data. Create a smooth and realistic price curve.
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
      throw new Error('Failed to generate stock data.');
    }
    
    // Ensure the last historical price matches the current price, a common failure point for LLMs.
    const historicalData = output.chartData.filter(d => d.price !== undefined);
    if (historicalData.length > 0) {
      const lastHistoricalPoint = historicalData[historicalData.length - 1];
      if (lastHistoricalPoint.price) {
        output.stock.price = lastHistoricalPoint.price;

         // Also make sure the prediction starts from the last known price
        const firstPredictionIndex = output.chartData.findIndex(d => d.price === undefined);
        if (firstPredictionIndex > 0) {
          output.chartData[firstPredictionIndex - 1].prediction = lastHistoricalPoint.price;
        }
      }
    }

    return output;
  }
);
