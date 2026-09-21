import { notFound } from "next/navigation";
import { mailIsConfigured } from "@/lib/mailer";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (!mailIsConfigured()) notFound();

  const { token } = await searchParams;
  if (!token) notFound();

  // The token is deliberately not validated here: rendering must not burn it,
  // or a mail client's link preview would consume the link before the user
  // clicks it. It is checked when the new password is submitted.
  return <ResetPasswordForm token={token} />;
}
