'use server';
/**
 * @fileOverview This file defines the AI flow for fetching and generating stock data.
 * It includes functions to get stock information, chart data, and AI-driven
 * financial opinions. The flow is designed to be resilient, providing mock data
 * if the AI service fails, ensuring the application remains functional.
 */
import {ai} from '@/ai/genkit';
import type {ChartData, Stock} from '@/lib/types';
import {z} from 'genkit';

// --- Zod Schemas for Input and Output ---

const StockInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol, e.g., "RELIANCE"'),
});

const StockOutputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol, e.g., "RELIANCE"'),
  name: z.string().describe('The full name of the company.'),
  price: z
    .number()
    .describe('The current trading price of the stock in INR.'),
  change: z.number().describe('The change in the stock price from the previous close.'),
  changePercent: z.number().describe('The percentage change in the stock price.'),
});

const StockOpinionInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol.'),
  name: z.string().describe('The full name of the company.'),
});

const StockOpinionOutputSchema = z.object({
  opinion: z
    .string()
    .describe(
      'A concise, one-paragraph financial opinion on the stock. Start with a disclaimer that this is not financial advice. Mention potential for growth and potential challenges.'
    ),
});

const ChartDataSchema = z.object({
  date: z.string().describe('The date for the data point (e.g., "Jan", "Feb").'),
  price: z.number().optional().describe('The historical closing price for the date.'),
  prediction: z.number().optional().describe('The predicted price for the date.'),
});

const ChartDataOutputSchema = z.object({
  chartData: z.array(ChartDataSchema).describe('An array of 10 data points for the stock chart, including 6 historical and 10 prediction points.'),
});

type StockData = z.infer<typeof StockOutputSchema> & {
  chartData: ChartData[];
};


// --- AI Prompts ---

const stockInfoPrompt = ai.definePrompt({
  name: 'stockInfoPrompt',
  input: {schema: StockInputSchema},
  output: {schema: StockOutputSchema},
  prompt: `You are a financial data provider. Generate realistic but fictional stock data for the company with the ticker symbol: {{{ticker}}}. The data should be in INR. The price should be a random number between 50 and 8000. The change should be a random fluctuation between -5% and +5% of the price. If you do not recognize the ticker, generate plausible data for a fictional company with that ticker.`,
});

const chartDataPrompt = ai.definePrompt({
  name: 'chartDataPrompt',
  input: { schema: z.object({ ticker: z.string(), price: z.number() }) },
  output: { schema: ChartDataOutputSchema },
  prompt: `You are a financial data provider. Generate a realistic but fictional time-series chart data for the stock {{{ticker}}}. The current price is {{{price}}} INR.
- Generate 10 data points for 10 consecutive months (Jan to Oct).
- The first 6 data points should be historical prices ('price'). Start the history at a price that is within +/- 10% of the current price and show plausible fluctuations.
- The next 10 data points should be predicted prices ('prediction'). The prediction should start from the last historical price and show plausible future fluctuations.
- The 'price' and 'prediction' values should overlap for the first 6 months.
`,
});


const stockOpinionPrompt = ai.definePrompt({
  name: 'stockOpinionPrompt',
  input: {schema: StockOpinionInputSchema},
  output: {schema: StockOpinionOutputSchema},
  prompt: `You are a financial analyst. Provide a concise, one-paragraph financial opinion for {{{name}}} ({{{ticker}}}). Start with a disclaimer: "Disclaimer: This is an AI-generated analysis and not financial advice. Always conduct your own research." Then, briefly mention its potential for growth and any challenges it might face.`,
});

// --- AI Flows ---

const getStockDataFlow = ai.defineFlow(
  {
    name: 'getStockDataFlow',
    inputSchema: z.object({tickers: z.array(z.string())}),
    outputSchema: z.array(z.object({stock: StockOutputSchema, chartData: z.array(ChartDataSchema)})),
  },
  async ({tickers}) => {
    const stockDataPromises = tickers.map(async (ticker) => {
      try {
        const {output: stockInfo} = await stockInfoPrompt({ticker});
        if (!stockInfo) throw new Error('Failed to get stock info');

        const {output: chartDataObj} = await chartDataPrompt({ticker, price: stockInfo.price});
        if (!chartDataObj) throw new Error('Failed to get chart data');
        
        return { stock: stockInfo, chartData: chartDataObj.chartData };
      } catch (error) {
        console.error(`Failed to generate data for ${ticker}:`, error);
        // Return a default/error state for this specific ticker
        const price = Math.random() * (8000 - 50) + 50;
        const change = price * (Math.random() * 0.1 - 0.05);
        return {
          stock: {
            ticker,
            name: `${ticker.charAt(0)}${ticker.slice(1).toLowerCase()} Inc. (Fictional)`,
            price: price,
            change: change,
            changePercent: (change / (price - change)) * 100,
          },
          chartData: [],
        };
      }
    });

    const results = await Promise.all(stockDataPromises);
    return results.filter(r => r.chartData.length > 0); // Filter out any complete failures if needed
  }
);


const getStockOpinionFlow = ai.defineFlow(
  {
    name: 'getStockOpinionFlow',
    inputSchema: StockOpinionInputSchema,
    outputSchema: StockOpinionOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await stockOpinionPrompt(input);
        if (!output) {
          throw new Error("No opinion generated");
        }
        return output;
    } catch (error) {
        console.error(`Failed to get opinion for ${input.ticker}:`, error);
        return { opinion: "AI financial opinion is currently unavailable for this stock." };
    }
  }
);


// --- Exported Functions ---

export async function getStockData(input: { tickers: string[] }): Promise<StockData[]> {
  return getStockDataFlow(input);
}

export async function getStockOpinion(input: {ticker: string; name: string}): Promise<{opinion: string}> {
  return getStockOpinionFlow(input);
}
