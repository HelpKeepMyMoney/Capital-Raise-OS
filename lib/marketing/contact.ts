import { z } from "zod";

/** Public contact form POST body — anti-spam: `website` honeypot must stay empty server-side after trim */
export const ContactFormSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().max(254),
  company: z.string().max(200).optional(),
  message: z.string().min(10).max(8000).trim(),
  /** Honeypot — bots often fill hidden fields */
  website: z.string().max(400).optional(),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;
