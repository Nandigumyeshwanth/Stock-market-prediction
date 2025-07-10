'use server';
/**
 * @fileOverview A flow to simulate sending a welcome email.
 *
 * - sendWelcomeEmail: A function that simulates sending a welcome email to a new user.
 * - WelcomeEmailInput: The input type for the sendWelcomeEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const WelcomeEmailInputSchema = z.object({
  fullName: z.string().describe('The full name of the user.'),
  email: z.string().email().describe('The email address of the user.'),
});
export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: WelcomeEmailInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`
      ================================================
      SIMULATING SENDING WELCOME EMAIL
      ================================================
      TO: ${input.email}
      SUBJECT: Welcome to Infinytix!

      Hi ${input.fullName},

      Thank you for creating an account with Infinytix.
      We're excited to have you on board!

      Best,
      The Infinytix Team
      ================================================
    `);
    
    return `Successfully sent a welcome email to ${input.email}`;
  }
);

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<string> {
  return sendWelcomeEmailFlow(input);
}
