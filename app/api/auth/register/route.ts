import { NextRequest, NextResponse } from "next/server";
import { ORG_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { col, memberDocId } from "@/lib/firestore/paths";
import { sessionCookieOptions } from "@/lib/auth/session";
import { findInvitationByTokenHash } from "@/lib/firestore/queries";
import { hashInviteToken } from "@/lib/invitations/token";
import {
  invitationEmailMatches,
  isInvitationConsumable,
} from "@/lib/invitations/invite-state";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      idToken?: string;
      organizationName?: string;
      inviteRawToken?: string;
    };
    if (!body.idToken) {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(body.idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? "";
    const db = getAdminFirestore();
    const now = Date.now();

    if (body.inviteRawToken?.trim()) {
      const inv = await findInvitationByTokenHash(hashInviteToken(body.inviteRawToken.trim()));
      if (!inv || !isInvitationConsumable(inv)) {
        return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
      }
      if (!invitationEmailMatches(inv, email)) {
        return NextResponse.json(
          { error: "Use the same email address this invitation was sent to." },
          { status: 403 },
        );
      }

      const userPayload: Record<string, unknown> = {
        email,
        createdAt: now,
      };
      if (decoded.name) {
        userPayload.displayName = decoded.name;
      }

      await db.collection(col.users).doc(uid).set(userPayload, { merge: true });

      const expiresIn = SESSION_MAX_AGE_SEC * 1000;
      const sessionCookie = await auth.createSessionCookie(body.idToken, { expiresIn });
      const res = NextResponse.json({ ok: true, inviteBootstrap: true });
      res.cookies.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions());
      return res;
    }

    if (!body.organizationName?.trim()) {
      return NextResponse.json({ error: "idToken and organizationName required" }, { status: 400 });
    }

    const orgRef = db.collection(col.organizations).doc();
    const orgId = orgRef.id;
    const slug = `${slugify(body.organizationName)}-${orgId.slice(0, 6)}`;

    const userPayload: Record<string, unknown> = {
      email,
      defaultOrganizationId: orgId,
      createdAt: now,
    };
    if (decoded.name) {
      userPayload.displayName = decoded.name;
    }

    const batch = db.batch();
    batch.set(db.collection(col.users).doc(uid), userPayload, { merge: true });
    batch.set(orgRef, {
      name: body.organizationName.trim(),
      slug,
      createdAt: now,
      subscription: { plan: "none", status: "none" },
    });
    batch.set(db.collection(col.organizationMembers).doc(memberDocId(orgId, uid)), {
      organizationId: orgId,
      userId: uid,
      role: "founder",
      joinedAt: now,
    });
    await batch.commit();

    const orgs = { [orgId]: "founder" };
    await auth.setCustomUserClaims(uid, { orgs });

    const expiresIn = SESSION_MAX_AGE_SEC * 1000;
    const sessionCookie = await auth.createSessionCookie(body.idToken, { expiresIn });
    const res = NextResponse.json({ ok: true, organizationId: orgId });
    res.cookies.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions());
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
      path: "/",
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Register failed";
    console.error("[api/auth/register]", e);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Register failed" },
      { status: 500 },
    );
  }
}
