import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

// S01: sign in or start sign-up with a mobile number and a one-time password.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screens");
  return { title: t("S01.title") };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
