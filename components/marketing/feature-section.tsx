"use client";

import Image from "next/image";
import { motion } from "framer-motion";
export function FeatureSection(props: {
  id: string;
  reverse?: boolean;
  eyebrow?: string;
  headline: string;
  body?: string;
  bullets: readonly string[];
  imageSrc: string;
  imageAlt: string;
}) {
  const { id, reverse, eyebrow, headline, body, bullets, imageSrc, imageAlt } = props;

  const textBlock = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45 }}
      className="space-y-5"
    >
      {eyebrow ? (
        <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      ) : null}
      <h2
        id={`${id}-heading`}
        className="font-heading text-[1.85rem] font-semibold tracking-tight text-foreground sm:text-[2.125rem] lg:text-[2.25rem]"
      >
        {headline}
      </h2>
      {body ? <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{body}</p> : null}
      <ul className="space-y-3 text-muted-foreground">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 text-sm leading-relaxed sm:text-base">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_oklch(0.48_0.2_258/0.2)] dark:shadow-[0_0_0_3px_oklch(0.62_0.16_258/0.28)]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );

  const imageBlock = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md ring-1 ring-border/50 dark:bg-card dark:shadow-lg"
    >
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover object-top"
          sizes="(max-width: 1024px) min(100vw, 768px), min(640px, calc(50vw - 3rem))"
          quality={90}
        />
      </div>
    </motion.div>
  );

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-28 border-b border-border/60 py-20 sm:py-24 lg:py-28 dark:border-border/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-center">
          {reverse ? (
            <>
              {textBlock}
              {imageBlock}
            </>
          ) : (
            <>
              {imageBlock}
              {textBlock}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
