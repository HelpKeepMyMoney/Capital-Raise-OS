import { z } from "zod";

const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t === "" || t == null ? undefined : t;
    });

export const OrgContactPersonSchema = z
  .object({
    name: optStr(200),
    title: optStr(120),
    email: optStr(254),
    phone: optStr(40),
  })
  .strict();

export const OrgContactSchema = z
  .object({
    legalName: optStr(200),
    street1: optStr(200),
    street2: optStr(200),
    city: optStr(120),
    region: optStr(120),
    postalCode: optStr(32),
    country: optStr(120),
    phone: optStr(40),
    contactPerson: OrgContactPersonSchema.optional(),
  })
  .strict();

export type OrgContactPayload = z.infer<typeof OrgContactSchema>;

export const UserContactProfileSchema = z
  .object({
    phone: optStr(40),
    title: optStr(120),
    street1: optStr(200),
    street2: optStr(200),
    city: optStr(120),
    region: optStr(120),
    postalCode: optStr(32),
    country: optStr(120),
  })
  .strict();

export type UserContactProfilePayload = z.infer<typeof UserContactProfileSchema>;
