import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
