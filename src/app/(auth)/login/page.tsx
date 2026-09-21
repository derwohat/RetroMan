export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { mailIsConfigured } from "@/lib/mailer";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; pwchanged?: string }>;
}) {
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const { reset, pwchanged } = await searchParams;

  // Passed down from the server so the browser never has to guess whether the
  // reset flow is usable — without a mail server its pages return 404, and a
  // link pointing there would be a dead end.
  return (
    <LoginForm
      canResetPassword={mailIsConfigured()}
      passwordWasReset={reset === "done" || pwchanged === "1"}
    />
  );
}
