'use server';
/**
 * @fileoverview This file initializes the Genkit AI instance with necessary plugins.
 * It is configured to use Google AI for its generative capabilities. The `ai`
 * instance created here is exported for use throughout the application,
 * particularly in AI flows that handle tasks like generating stock data or
 * financial opinions.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
});
