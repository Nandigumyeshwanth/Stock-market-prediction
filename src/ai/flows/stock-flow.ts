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
  system: `You are a financial data API. You generate realistic but fictional stock data. You will be given a list of stock tickers. For EACH ticker, you must generate a corresponding entry in the output array. You MUST return a valid JSON array matching the output schema. The prices should be realistic. Do not add any commentary outside of the JSON object. If you do not recognize a ticker, you must still generate data for it. Create a plausible full company name that could correspond to the ticker and proceed with generating all other required data fields. It is critical that you return an entry for every ticker provided in the input.`,
  input: { schema: StockDataInputSchema },
  output: { schema: StockDataOutputSchema },
  prompt: `Generate data for the following tickers: {{#each tickers}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.

For each ticker, ensure the generated data follows these rules:
- The chartData must contain exactly 10 sequential monthly data points.
- The first 6 are historical and need a 'price'.
- The next 4 are predictions and must NOT have a 'price'.
- All 10 points need a 'prediction'.
- The company name must be realistic for the given ticker (e.g., 'RELIANCE' -> 'Reliance Industries'). If you do not recognize the ticker, invent a plausible company name.
- Prices should be realistic for the Indian stock market (e.g., ₹100-₹5000).
- The historical and prediction prices in chartData should show realistic, small fluctuations around the main stock price. The data should look like a real stock chart, not random numbers.`,
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
        // If the model returns no output at all, we can't proceed.
        // Return an empty array so the frontend can handle it gracefully.
        console.error('AI model failed to generate any stock data.');
        return [];
      }

      // Apply the supervisor logic to each item in the array
      const supervisedOutput = output.map(data => {
        // Find the last data point that has a historical price.
        const lastHistoricalDataIndex = data.chartData.findLastIndex(d => d.price !== undefined && d.price !== null);

        if (lastHistoricalDataIndex !== -1) {
          const lastHistoricalPoint = data.chartData[lastHistoricalDataIndex];
          
          if (lastHistoricalPoint.price) {
            // RULE 1: The current stock price must match the last known historical price.
            data.stock.price = lastHistoricalPoint.price;
            
            // RULE 2: The prediction line should be continuous with the price line.
            // Set the prediction value of the last historical point to be the same as its price.
            lastHistoricalPoint.prediction = lastHistoricalPoint.price;
          }
        }
        return data;
      });
      
      // Warn if the data is incomplete, but don't throw an error.
      // This makes the app more resilient to AI flakiness.
      if (supervisedOutput.length !== input.tickers.length) {
        console.warn("The AI model did not return data for all requested tickers. Returning partial data.");
      }

      return supervisedOutput;
    } catch (error: any) {
      // Log the actual error for debugging, but don't let it crash the app.
      console.error("An error occurred in the stockDataFlow:", error.message || error);
      // Return an empty array to be handled gracefully by the frontend.
      return [];
    }
  }
);
