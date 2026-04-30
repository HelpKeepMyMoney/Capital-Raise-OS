import { z } from "zod";
import { SubscriptionPlanSchema, UserRoleSchema } from "@/lib/firestore/types";
import { OrganizationPatchBodySchema } from "@/lib/organizations/patch-organization";

export const OrgSubscriptionStubSchema = z.object({
  plan: SubscriptionPlanSchema,
  status: z.enum(["active", "trialing", "past_due", "cancelled", "none"]),
});

export const PlatformAdminOrganizationPatchSchema = OrganizationPatchBodySchema.extend({
  subscription: OrgSubscriptionStubSchema.optional(),
});

export const PlatformAdminCreateOrganizationSchema = z
  .object({
    name: z
      .string()
      .max(200)
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Name is required")),
    slug: z.string().max(64).optional(),
  })
  .strict()
  .transform((data) => ({
    name: data.name,
    slug: data.slug?.trim().toLowerCase() || undefined,
  }))
  .superRefine((data, ctx) => {
    if (!data.slug) return;
    if (data.slug.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Slug must be at least 3 characters",
        path: ["slug"],
      });
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use lowercase letters, numbers, and single hyphens only",
        path: ["slug"],
      });
    }
  });

export const PlatformAdminDeleteOrganizationSchema = z
  .object({
    confirmation: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
  })
  .strict();

export const InvestorAccessPayloadSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("org") }),
  z.object({
    scope: z.literal("deal"),
    dealIds: z.array(z.string().min(1)).min(1),
    dataRoomIds: z.array(z.string()),
  }),
]);

export const PlatformAdminCreateUserSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const PlatformAdminPatchUserSchema = z.object({
  displayName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().optional(),
  disabled: z.boolean().optional(),
});

export const PlatformAdminMembershipPostSchema = z
  .object({
    organizationId: z.string().min(1),
    role: UserRoleSchema,
    investorAccess: InvestorAccessPayloadSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "investor_guest") {
      if (!data.investorAccess) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "investor_guest requires investorAccess",
          path: ["investorAccess"],
        });
      }
    } else if (data.investorAccess) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "investorAccess is only allowed for investor_guest",
        path: ["investorAccess"],
      });
    }
  });

export const PlatformAdminMembershipPatchSchema = z.object({
  role: UserRoleSchema.optional(),
  investorAccess: InvestorAccessPayloadSchema.optional().nullable(),
});
