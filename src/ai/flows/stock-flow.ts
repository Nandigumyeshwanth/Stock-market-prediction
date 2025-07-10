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
import { REAL_STOCK_DATA } from '@/lib/real-stock-data';

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
  recommendation: z
    .string()
    .describe(
      'A clear recommendation on whether to buy the stock or not. For example: "You should consider buying this stock." or "It may be better to hold off on this stock for now."'
    ),
});


const ChartDataSchema = z.object({
  date: z.string().describe('The date for the data point (e.g., "Jan", "Feb").'),
  price: z.number().optional().describe('The historical closing price for the date.'),
  prediction: z.number().optional().describe('The predicted price for the date.'),
});

const ChartDataOutputSchema = z.object({
  chartData: z.array(ChartDataSchema).describe('An array of 12 data points for the stock chart, showing a mix of historical and predicted prices for each month from January to December.'),
});

type StockData = z.infer<typeof StockOutputSchema> & {
  chartData: ChartData[];
};


// --- AI Prompts ---

const chartDataPrompt = ai.definePrompt({
  name: 'chartDataPrompt',
  input: { schema: z.object({ ticker: z.string(), price: z.number() }) },
  output: { schema: ChartDataOutputSchema },
  prompt: `You are a financial data provider. For the stock "{{ticker}}" with a current price of {{price}} INR, generate a time-series chart data for all 12 months of a year.
- The data must be an array of 12 objects, one for each month from "Jan" to "Dec".
- Let the current month be the 7th month (July).
- For each month up to and including the current month (Jan to Jul), generate a historical "price" and a "prediction". The "prediction" represents what an AI might have predicted for that past month.
- For each month after the current month (Aug to Dec), generate only a "prediction".
- CRITICAL: The "price" for the current month (July) MUST be exactly {{price}}.
- The historical prices should show a plausible trend leading up to the current price.
- The predictions should show a plausible trend for the entire year. Predictions for past months can deviate slightly from the actual price.`,
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
  prompt: `You are a financial analyst. Based on the company {{{name}}} ({{{ticker}}}), provide a clear and concise recommendation on whether to buy the stock or not.`,
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
const getStockInfoFromRealData = (ticker: string): Stock => {
    const stock = REAL_STOCK_DATA[ticker];
    if (stock) {
        const price = stock.price;
        const changePercent = stock.changePercent;
        const change = price * (changePercent / 100);
        return {
            ticker,
            name: stock.name,
            price,
            change,
            changePercent,
        };
    }
    // Fallback for tickers not in our real data list
    const price = Math.random() * (1500 - 500) + 500;
    const changePercent = (Math.random() * 10) - 5;
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
    const currentMonthIndex = 6; // July

    let historicalPrice = price / (1 + (Math.random() * 0.1 - 0.05)); // Start from a price a bit lower
    
    // Generate historical data with predictions
    for (let i = 0; i < currentMonthIndex; i++) {
      historicalPrice *= (1 + (Math.random() * 0.1 - 0.045));
      const prediction = historicalPrice * (1 + (Math.random() * 0.1 - 0.05));
      data.push({ date: months[i], price: parseFloat(historicalPrice.toFixed(2)), prediction: parseFloat(prediction.toFixed(2)) });
    }

    // Set current month's price exactly and add a prediction
    const currentPrediction = price * (1 + (Math.random() * 0.1 - 0.05));
    data.push({ date: months[currentMonthIndex], price: parseFloat(price.toFixed(2)), prediction: parseFloat(currentPrediction.toFixed(2)) });

    let predictionPrice = price; // Start future predictions from the exact price
    // Generate future predicted data
    for (let i = currentMonthIndex + 1; i < 12; i++) {
      predictionPrice *= (1 + (Math.random() * 0.1 - 0.04)); // Slightly positive trend for prediction
      data.push({ date: months[i], prediction: parseFloat(predictionPrice.toFixed(2)) });
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
        // Get base stock info from our real data list
        const stockInfo = getStockInfoFromRealData(ticker);

        const {output: chartDataObj} = await chartDataPrompt({ticker, price: stockInfo.price});
        if (!chartDataObj || !chartDataObj.chartData || chartDataObj.chartData.length === 0) throw new Error('Failed to get chart data');
        
        return { stock: stockInfo, chartData: chartDataObj.chartData };
      } catch (error) {
        console.error(`AI generation failed for ${ticker}, using mock data. Error:`, error);
        const mockStockInfo = getStockInfoFromRealData(ticker);
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
        return { recommendation: "AI opinion is currently unavailable for this stock." };
    }
  }
);


// --- Exported Functions ---

export async function getStockData(input: { tickers: string[] }): Promise<StockData[]> {
  const results = await getStockDataFlow(input);
  // Ensure we always return a valid array, even if the flow somehow fails.
  return results || [];
}

export async function getStockOpinion(input: {ticker: string; name: string}): Promise<{recommendation: string}> {
  return getStockOpinionFlow(input);
}
