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
  chartData: z.array(ChartDataSchema).describe('An array of 12 data points for the stock chart, showing predicted prices for each month from January to December.'),
});

type StockData = z.infer<typeof StockOutputSchema> & {
  chartData: ChartData[];
};


// --- AI Prompts ---

const stockInfoPrompt = ai.definePrompt({
  name: 'stockInfoPrompt',
  input: {schema: StockInputSchema},
  output: {schema: StockOutputSchema},
  prompt: `You are a financial data provider. For the stock ticker "{{ticker}}", generate realistic but fictional data in INR.
- The company name should be plausible for the given ticker.
- The price should be a random number between 500 and 8000.
- The change should be a random fluctuation between -5% and +5% of the price.
If you do not recognize the ticker, generate plausible data for a fictional company with that ticker.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const chartDataPrompt = ai.definePrompt({
  name: 'chartDataPrompt',
  input: { schema: z.object({ ticker: z.string(), price: z.number() }) },
  output: { schema: ChartDataOutputSchema },
  prompt: `You are a financial data provider. For the stock "{{ticker}}" with a current price of {{price}} INR, generate a time-series chart data of predicted prices for all 12 months of a year.
- The data must be an array of 12 objects, one for each month from "Jan" to "Dec".
- Each object must have a "date" property (e.g., "Jan", "Feb") and a "prediction" property. Do not use a "price" property.
- CRITICAL: The first month's ("Jan") prediction MUST be exactly {{price}}.
- The subsequent months' predictions should show a plausible future trend starting from the initial price.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
       {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});


const stockOpinionPrompt = ai.definePrompt({
  name: 'stockOpinionPrompt',
  input: {schema: StockOpinionInputSchema},
  output: {schema: StockOpinionOutputSchema},
  prompt: `You are a financial analyst. Provide a concise, one-paragraph financial opinion for {{{name}}} ({{{ticker}}}). Start with a disclaimer: "Disclaimer: This is an AI-generated analysis and not financial advice. Always conduct your own research." Then, briefly mention its potential for growth and any challenges it might face.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

// --- Fallback Data Generation ---

const generateMockStockInfo = (ticker: string): Stock => {
  const price = Math.random() * (8000 - 500) + 500;
  const changePercent = (Math.random() * 10) - 5; // -5% to +5%
  const change = price * (changePercent / 100);
  return {
    ticker,
    name: `${ticker.charAt(0)}${ticker.slice(1).toLowerCase()} Fictional Inc.`,
    price,
    change,
    changePercent,
  };
};

const generateMockChartData = (price: number): ChartData[] => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data: ChartData[] = [];
    
    let currentPrice = price; // Start predictions from the exact price

    // Generate predicted data for all 12 months
    for (let i = 0; i < 12; i++) {
        if (i === 0) {
            data.push({ date: months[i], prediction: parseFloat(currentPrice.toFixed(2)) });
        } else {
            currentPrice *= (1 + (Math.random() * 0.1 - 0.04)); // Slightly positive trend for prediction
            data.push({ date: months[i], prediction: parseFloat(currentPrice.toFixed(2)) });
        }
    }
    return data;
};


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
        if (!stockInfo || !stockInfo.price) throw new Error('Failed to get stock info');

        const {output: chartDataObj} = await chartDataPrompt({ticker, price: stockInfo.price});
        if (!chartDataObj || !chartDataObj.chartData || chartDataObj.chartData.length === 0) throw new Error('Failed to get chart data');
        
        return { stock: stockInfo, chartData: chartDataObj.chartData };
      } catch (error) {
        console.error(`AI generation failed for ${ticker}, using mock data. Error:`, error);
        const mockStockInfo = generateMockStockInfo(ticker);
        const mockChartData = generateMockChartData(mockStockInfo.price);
        return {
          stock: mockStockInfo,
          chartData: mockChartData,
        };
      }
    });

    return Promise.all(stockDataPromises);
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
        return { opinion: "Disclaimer: This is an AI-generated analysis and not financial advice. AI opinion is currently unavailable for this stock, please conduct your own research." };
    }
  }
);


// --- Exported Functions ---

export async function getStockData(input: { tickers: string[] }): Promise<StockData[]> {
  const results = await getStockDataFlow(input);
  // Ensure we always return a valid array, even if the flow somehow fails.
  return results || [];
}

export async function getStockOpinion(input: {ticker: string; name: string}): Promise<{opinion: string}> {
  return getStockOpinionFlow(input);
}
