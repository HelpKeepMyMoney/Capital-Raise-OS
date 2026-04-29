/**
 * Usage: npx tsx scripts/seed-demo.ts <firebase-user-uid>
 * Requires FIREBASE_* admin env vars (same as Next server).
 */
import "dotenv/config";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npx tsx scripts/seed-demo.ts <firebase-user-uid>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!getApps().length) {
  if (clientEmail && privateKey && projectId) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else if (projectId) {
    initializeApp({ projectId });
  } else {
    console.error("Missing Firebase admin configuration");
    process.exit(1);
  }
}

const db = getFirestore();
const auth = getAuth();

const orgId = `demo_${Date.now().toString(36)}`;
const now = Date.now();
const slug = `cpin-demo-${orgId.slice(-6)}`;

async function main() {
  const user = await auth.getUser(uid);
  const batch = db.batch();

  batch.set(db.collection("organizations").doc(orgId), {
    name: "CPIN Demo Capital",
    slug,
    createdAt: now,
    subscription: { plan: "pro", status: "active" },
    branding: {
      primaryColor: "#10b981",
    },
  });

  const userDoc: Record<string, unknown> = {
    email: user.email ?? "",
    defaultOrganizationId: orgId,
    createdAt: now,
  };
  if (user.displayName) {
    userDoc.displayName = user.displayName;
  }
  batch.set(db.collection("users").doc(uid), userDoc, { merge: true });

  batch.set(db.collection("organization_members").doc(`${orgId}_${uid}`), {
    organizationId: orgId,
    userId: uid,
    role: "founder",
    joinedAt: now,
  });

  const investors = [
    { name: "Jordan Lee", firm: "Northline Ventures", stage: "responded", warm: "warm", checkMin: 250_000, checkMax: 1_000_000, sector: "Fintech" },
    { name: "Priya Shah", firm: "Atlas Family Office", stage: "meeting_scheduled", warm: "warm", checkMin: 500_000, checkMax: 3_000_000, sector: "Real Estate" },
    { name: "Marcus Cole", firm: "Harbor Hill Partners", stage: "due_diligence", warm: "cold", checkMin: 1_000_000, checkMax: 5_000_000, sector: "AI" },
    { name: "Elena Rossi", firm: "Medici Angels", stage: "soft_circled", warm: "warm", checkMin: 100_000, checkMax: 500_000, sector: "Healthcare" },
    { name: "David Okonkwo", firm: "Lagos Syndicate", stage: "contacted", warm: "cold", checkMin: 50_000, checkMax: 250_000, sector: "Climate" },
    { name: "Sophie Müller", firm: "Rhein Capital", stage: "researching", warm: "cold", checkMin: 250_000, checkMax: 1_500_000, sector: "Enterprise" },
    { name: "Alex Rivera", firm: "Pacific Crest LP", stage: "committed", warm: "warm", checkMin: 750_000, checkMax: 2_000_000, sector: "PropTech" },
    { name: "Taylor Morgan", firm: "Catalyst Fund II", stage: "closed", warm: "warm", checkMin: 2_000_000, checkMax: 8_000_000, sector: "Deep Tech" },
  ] as const;

  for (const inv of investors) {
    const ref = db.collection("investors").doc();
    const nameParts = inv.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? inv.name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    batch.set(ref, {
      organizationId: orgId,
      name: inv.name,
      firstName,
      lastName: lastName || null,
      firm: inv.firm,
      title: "Partner",
      email: `${firstName.toLowerCase()}@example.com`,
      location: "Global",
      investorType: "vc",
      checkSizeMin: inv.checkMin,
      checkSizeMax: inv.checkMax,
      preferredSectors: [inv.sector.toLowerCase()],
      preferredGeography: ["US", "EU"],
      stagePreference: ["seed", "series_a"],
      warmCold: inv.warm,
      relationshipScore: inv.warm === "warm" ? 82 : 54,
      lastContactAt: now - 86400000 * 3,
      nextFollowUpAt: now + 86400000 * 2,
      pipelineStage: inv.stage,
      crmStatus: "active",
      committedAmount: inv.stage === "committed" || inv.stage === "closed" ? inv.checkMin : 0,
      documentsSharedCount: inv.stage === "due_diligence" ? 4 : 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  batch.set(db.collection("tasks").doc(), {
    organizationId: orgId,
    title: "Send weekly LP update",
    status: "open",
    dueAt: now + 86400000,
    assigneeId: uid,
    createdAt: now,
  });

  batch.set(db.collection("activities").doc(), {
    organizationId: orgId,
    type: "note",
    summary: "Opened data room — deck v3",
    actorId: uid,
    createdAt: now - 3600000,
  });

  batch.set(db.collection("meetings").doc(), {
    organizationId: orgId,
    title: "Partner call — diligence deep dive",
    startsAt: now + 86400000 * 2,
    status: "scheduled",
    createdAt: now,
  });

  batch.set(db.collection("deals").doc(), {
    organizationId: orgId,
    name: "Series A — CPIN Labs",
    type: "startup_equity",
    targetRaise: 12_000_000,
    minimumInvestment: 100_000,
    valuation: 48_000_000,
    terms: "Preferred equity, 1x liquidation",
    useOfProceeds: "GTM, hiring, platform scale",
    closeDate: now + 86400000 * 45,
    status: "active",
    createdAt: now,
  });

  batch.set(db.collection("campaigns").doc(), {
    organizationId: orgId,
    name: "Seed follow-up — EU AI",
    status: "active",
    stats: { sent: 128, opened: 62, clicked: 21, replied: 14, bounced: 2 },
    createdAt: now,
  });

  for (let i = 0; i < 12; i++) {
    batch.set(db.collection("emails").doc(), {
      organizationId: orgId,
      subject: `Outreach wave ${i + 1}`,
      status: "delivered",
      openCount: i % 4,
      clickCount: i % 3,
      replySentiment: i % 5 === 0 ? "positive" : "unknown",
      createdAt: now - i * 86400000 * 2,
      sentAt: now - i * 86400000 * 2,
    });
  }

  await batch.commit();

  const orgs = { ...(user.customClaims?.orgs as Record<string, string> | undefined), [orgId]: "founder" };
  await auth.setCustomUserClaims(uid, { ...user.customClaims, orgs });

  console.log("Seeded demo organization:", orgId);
  console.log("Set active org cookie in app or call /api/auth/active-org with this id.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
