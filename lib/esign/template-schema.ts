import { z } from "zod";

export const EsignFieldRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0.001).max(1),
  h: z.number().min(0.001).max(1),
});

export const EsignTemplateFieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(200).optional(),
  fieldType: z.enum(["text", "date", "signature"]),
  pageIndex: z.number().int().min(0).max(500),
  rectNorm: EsignFieldRectSchema,
  assignee: z.enum(["sponsor", "investor"]),
  required: z.boolean().optional(),
});

export const EsignFieldsSchema = z.array(EsignTemplateFieldSchema).max(200);
