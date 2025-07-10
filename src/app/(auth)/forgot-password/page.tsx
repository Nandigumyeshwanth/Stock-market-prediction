
"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MailCheck } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isEmailSent, setIsEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      // Simulate sending a password reset email
      console.log("Password reset email sent to:", data.email);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      // In a real app, you would integrate with a service like Firebase Auth here.
      // For now, we'll just simulate success.
      if (data.email.includes("fail")) {
          throw new Error("This email address is not registered.");
      }

      setIsEmailSent(true);
    } catch (error: any) {
      console.error("Password reset failed:", error);
      toast({
        title: "Error Sending Email",
        description: "This email address is not registered. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isEmailSent) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader className="items-center text-center">
            <MailCheck className="h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-2xl">Reset Link Simulated</CardTitle>
            <CardDescription>
                In a real app, a password reset link would be sent to this email address.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/login">Return to Login</Link>
            </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
            <Button variant="link" asChild className="w-full">
                <Link href="/login">
                    Back to login
                </Link>
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
