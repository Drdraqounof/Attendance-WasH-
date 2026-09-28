import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AuthShell, authLinkClass } from "@/app/login/auth-shell";
import { listStations } from "@/lib/account";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function RegisterPage() {
  // Stations come from the DB — render per request, not at build time.
  await connection();
  let stations: { id: number; name: string }[] = [];
  try {
    stations = await listStations();
  } catch (error) {
    console.error("Couldn't load stations for registration:", error);
  }

  return (
    <AuthShell
      heading="Create an account"
      intro="Set up your sign-in and choose your role. Supervisors also pick the station they manage."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm stations={stations} />
    </AuthShell>
  );
}
