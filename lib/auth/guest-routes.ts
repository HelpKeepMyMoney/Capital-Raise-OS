import { redirect } from "next/navigation";
import { isInvestorGuestRole } from "@/lib/auth/rbac";

/** Sends LP guests away from product modules they should not use. */
export function redirectInvestorGuestsFromRaiseTools(role: string | undefined) {
  if (isInvestorGuestRole(role ?? "")) redirect("/deals");
}
