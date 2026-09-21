import { notFound } from "next/navigation";
import { mailIsConfigured } from "@/lib/mailer";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Without a mail server the flow cannot deliver anything, so the page does not
// exist rather than offering a form that silently does nothing.
export default function ForgotPasswordPage() {
  if (!mailIsConfigured()) notFound();
  return <ForgotPasswordForm />;
}
