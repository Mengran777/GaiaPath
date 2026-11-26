// Lets signed-out visitors use a route, within a per-IP hourly allowance.
// Signed-in users pass straight through.
import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { GUEST_LIMITS, clientIp, rateLimit } from "@/lib/rateLimit";

export async function guestGate(
  req: NextRequest,
  kind: keyof typeof GUEST_LIMITS,
): Promise<{ userId: string | null; blocked: NextResponse | null }> {
  const auth = await authenticateRequest(req);
  if (auth) return { userId: auth.userId, blocked: null };

  const { limit, windowMs } = GUEST_LIMITS[kind];
  const { ok, retryAfter } = rateLimit(`${kind}:${clientIp(req)}`, limit, windowMs);
  if (ok) return { userId: null, blocked: null };

  return {
    userId: null,
    blocked: NextResponse.json(
      {
        error: "You've reached the guest limit for now. Create a free account to keep planning, or try again later.",
        code: "GUEST_LIMIT",
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    ),
  };
}
