import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/auth-constants";

export { DEMO_COOKIE };

/** Server-side session check for RSC pages. */
export async function hasDemoSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_COOKIE)?.value === "1";
}
