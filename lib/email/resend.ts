import { Resend } from "resend";

let client: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) client = new Resend(key);
  return client;
}

export async function sendTransactionalEmail(opts: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    headers: opts.headers,
    attachments: opts.attachments,
  });
  if (error) throw new Error(error.message);
  return data;
}
