import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * The handful of settings that decide how the interface looks, readable by
 * anyone — including before signing in.
 *
 * The font-size and language providers used to read these from
 * `/api/admin/settings`, which only an admin may call. For everyone else the
 * request failed and the providers quietly fell back to their defaults, so
 * the app-wide font size and language never reached a normal user. On the
 * sign-in page, where there is no session at all, it could never work.
 *
 * Only display settings leave here. API keys, session limits and everything
 * else stay behind the admin endpoint.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: {
        fontSize: true,
        interfaceLanguage: true,
        donationUrl: true,
        githubUrl: true,
      },
    });

    return NextResponse.json(
      settings ?? { fontSize: "medium", interfaceLanguage: "de", donationUrl: null, githubUrl: null },
    );
  } catch (error) {
    // The interface has defaults for all of these; a database hiccup must not
    // leave the sign-in page blank.
    console.error("[app-settings] could not be read", error);
    return NextResponse.json(
      { fontSize: "medium", interfaceLanguage: "de", donationUrl: null, githubUrl: null },
    );
  }
}
