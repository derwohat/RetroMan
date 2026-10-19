import { prisma } from "@/lib/db/prisma";

/**
 * Session deadlines, per Codebook docs/security.md: an idle timeout that
 * restarts on every request, plus an absolute cap measured from sign-in. The
 * earlier of the two wins.
 */

export const IDLE_MIN = 5;
export const IDLE_MAX = 480;
export const ABSOLUTE_MIN = 1;
export const ABSOLUTE_MAX = 168;

const IDLE_DEFAULT = 60;
const ABSOLUTE_DEFAULT = 12;

export interface SessionLimits {
  /** Inactivity window in seconds. */
  idleSeconds: number;
  /** Hard cap from sign-in, in seconds. */
  absoluteSeconds: number;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

/**
 * Read the configured limits. Values are clamped rather than rejected: these
 * are read on the sign-in path, and a typo in a settings row must never lock
 * everyone out — nobody could get back in to correct it.
 */
export async function getSessionLimits(): Promise<SessionLimits> {
  let idle = IDLE_DEFAULT;
  let absolute = ABSOLUTE_DEFAULT;

  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: { sessionIdleMinutes: true, sessionAbsoluteHours: true },
    });
    if (settings) {
      idle = clamp(settings.sessionIdleMinutes, IDLE_MIN, IDLE_MAX, IDLE_DEFAULT);
      absolute = clamp(settings.sessionAbsoluteHours, ABSOLUTE_MIN, ABSOLUTE_MAX, ABSOLUTE_DEFAULT);
    }
  } catch (error) {
    // A database hiccup must not prevent signing in either.
    console.error("[session] falling back to default limits", error);
  }

  return { idleSeconds: idle * 60, absoluteSeconds: absolute * 3600 };
}

/** Validation for the settings form — here a bad value IS rejected. */
export function validateSessionLimits(
  idleMinutes: unknown,
  absoluteHours: unknown,
): { ok: true; idleMinutes: number; absoluteHours: number } | { ok: false; error: string } {
  const idle = Number(idleMinutes);
  const absolute = Number(absoluteHours);

  if (!Number.isInteger(idle) || idle < IDLE_MIN || idle > IDLE_MAX) {
    return { ok: false, error: "SessionIdleOutOfRange" };
  }
  if (!Number.isInteger(absolute) || absolute < ABSOLUTE_MIN || absolute > ABSOLUTE_MAX) {
    return { ok: false, error: "SessionAbsoluteOutOfRange" };
  }
  return { ok: true, idleMinutes: idle, absoluteHours: absolute };
}
