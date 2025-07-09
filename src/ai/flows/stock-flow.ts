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
  system: "You are a helpful financial data API. You will be given a stock ticker and you must return a valid JSON object that conforms to the provided output schema. The data you generate should be realistic but can be fictional.",
  input: { schema: StockDataInputSchema },
  output: { schema: StockDataOutputSchema },
  prompt: `
    Generate realistic, fictional stock market data for the given ticker symbol.

    Ticker: {{{ticker}}}

    Provide the following:
    1.  **Stock Details**: Full company name, a realistic current price, daily change (absolute and percentage).
    2.  **Chart Data**: An array of exactly 10 data points for a chart.
        - The data should represent the last 6 months of historical data and a 4-month future prediction.
        - Use three-letter month abbreviations for the 'date' field.
        - For the first 6 data points (historical), provide values for both 'price' and 'prediction'.
        - For the last 4 data points (future), provide a value only for 'prediction'.
        - The data should follow a believable trend.
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
