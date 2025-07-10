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
  chartData: z.array(ChartDataSchema).describe('An array of 10 data points for the stock chart, including 6 historical and 4 prediction points.'),
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
  prompt: `You are a financial data provider. For the stock "{{ticker}}" with a current price of {{price}} INR, generate a time-series chart data for 10 consecutive months.
- The data should be an array of 10 objects, each with a "date" (e.g., "Jan", "Feb") and either a "price" or "prediction" property.
- The first 6 months are historical data. Their objects must have a "price" property. The historical prices should show plausible fluctuations.
- CRITICAL: The 6th month's price MUST be exactly {{price}}.
- The next 4 months are future predictions. Their objects must have a "prediction" property. The prediction should start from the last historical price and show a plausible future trend.
- Ensure each object has EITHER a 'price' OR a 'prediction' key, but not both.`,
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
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    const data: ChartData[] = [];
    
    // Generate historical prices leading up to the final price
    let historyPrices: number[] = [];
    let tempPrice = price;
    for (let i = 0; i < 5; i++) {
        // Fluctuate backwards from the target price
        tempPrice /= (1 + (Math.random() * 0.1 - 0.05));
        historyPrices.unshift(parseFloat(tempPrice.toFixed(2)));
    }

    // Add the historical data to the main data array
    for (let i = 0; i < 5; i++) {
        data.push({ date: months[i], price: historyPrices[i] });
    }

    // Ensure the 6th month's price is exactly the provided price
    data.push({ date: months[5], price: parseFloat(price.toFixed(2)) });
    
    let currentPrice = price; // Start predictions from the exact last historical price

    // Predicted data
    for (let i = 6; i < 10; i++) {
        currentPrice *= (1 + (Math.random() * 0.1 - 0.04)); // Slightly positive trend for prediction
        data.push({ date: months[i], prediction: parseFloat(currentPrice.toFixed(2)) });
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
