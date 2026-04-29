import { z } from "zod";

export const OrganizationPatchBodySchema = z
  .object({
    name: z
      .string()
      .max(200)
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Name is required")),
    slug: z
      .string()
      .max(64)
      .transform((s) => s.trim().toLowerCase())
      .pipe(
        z
          .string()
          .min(3, "Slug must be at least 3 characters")
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Use lowercase letters, numbers, and single hyphens only",
          ),
      ),
  })
  .strict();

export type OrganizationPatchBody = z.infer<typeof OrganizationPatchBodySchema>;
