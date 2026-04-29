"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BOOK_DEMO_HREF } from "@/lib/marketing/constants";

export function MarketingContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: company.trim() ? company.trim() : undefined,
          message,
          website: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Could not send. Try again.");
        return;
      }
      toast.success("Thanks — we'll be in touch.");
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-28 border-b border-border/60 py-16 sm:py-20 lg:py-24 dark:border-border/40"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          data-slot="card"
          className="relative rounded-2xl border border-border/80 bg-card p-8 shadow-lg sm:p-10"
        >
          <h2 id="contact-heading" className="font-heading text-[1.75rem] font-semibold tracking-tight text-card-foreground sm:text-[2rem]">
            Contact
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tell us about your raise strategy — we reply to serious sponsors and issuing teams via email.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Work email</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-company">
                Company <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="contact-company"
                name="company"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Honeypot — leave hidden */}
            <div
              aria-hidden="true"
              className="absolute -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0"
              tabIndex={-1}
            >
              <Label htmlFor="contact-website">Website</Label>
              <Input
                id="contact-website"
                tabIndex={-1}
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                className="min-h-[140px] resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-xl sm:w-auto" disabled={pending}>
              {pending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </motion.div>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          Prefer scheduling?
          <a
            href={BOOK_DEMO_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Book a demo
          </a>
          instead.
        </p>
      </div>
    </section>
  );
}
