import { NextResponse } from "next/server";

export type V1ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function v1Json<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function v1Error(code: string, message: string, status: number, details?: unknown) {
  const body: V1ErrorBody = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return NextResponse.json(body, { status });
}

export function v1Unauthorized() {
  return v1Error("unauthorized", "Missing or invalid API key. Use Authorization: Bearer cpin_live_…", 401);
}

export function v1Forbidden(message: string) {
  return v1Error("forbidden", message, 403);
}

export function v1NotFound(resource = "Resource") {
  return v1Error("not_found", `${resource} not found`, 404);
}

export function v1BadRequest(message: string, details?: unknown) {
  return v1Error("bad_request", message, 400, details);
}
