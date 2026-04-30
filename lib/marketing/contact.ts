import { z } from "zod";

/** Editable options for marketing contact “Capital raise size” — keep in sync with form UI */
export const CAPITAL_RAISE_SIZE_OPTIONS = [
  "Prefer not to say",
  "Under $1M",
  "$1M–$5M",
  "$5M–$25M",
  "$25M–$100M",
  "$100M+",
] as const;

const raiseSizeEnum = z.enum(CAPITAL_RAISE_SIZE_OPTIONS);

/** Public contact form POST body — anti-spam: `website` honeypot must stay empty server-side after trim */
export const ContactFormSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().max(254),
  company: z.string().max(200).optional(),
  raiseSize: raiseSizeEnum.optional(),
  message: z.string().min(10).max(8000).trim(),
  /** Honeypot — bots often fill hidden fields */
  website: z.string().max(400).optional(),
});

export type ContactFormInput = z.infer<typeof ContactFormSchema>;
