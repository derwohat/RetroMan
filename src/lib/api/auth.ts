import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";

export async function getUserId(): Promise<string | null> {
  if (authBypassEnabled()) {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
