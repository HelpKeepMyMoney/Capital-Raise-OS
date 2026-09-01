import { describe, expect, it } from "vitest";
import { buildCopilotSystemPrompt, COPILOT_REST_API_KNOWLEDGE } from "@/lib/ai/copilot-system";

describe("buildCopilotSystemPrompt", () => {
  it("includes REST API v1 product knowledge so Copilot can help with keys and endpoints", () => {
    const prompt = buildCopilotSystemPrompt({ orgId: "org-1", pathname: "/settings/api" });
    expect(prompt).toContain("org-1");
    expect(prompt).toContain("/settings/api");
    expect(prompt).toContain("REST API");
    expect(prompt).toContain("cpin_live_");
    expect(prompt).toContain("/api/v1");
    expect(prompt).toContain("Authorization: Bearer");
    expect(prompt).toContain("status \"active\"");
    expect(prompt).toContain("invite");
    expect(prompt).toContain("documents/uploads");
    expect(prompt).toContain(COPILOT_REST_API_KNOWLEDGE.slice(0, 40));
  });

  it("omits screen line when pathname is missing", () => {
    const prompt = buildCopilotSystemPrompt({ orgId: "org-2" });
    expect(prompt).not.toContain("currently viewing");
    expect(prompt).toContain("org-2");
  });
});
