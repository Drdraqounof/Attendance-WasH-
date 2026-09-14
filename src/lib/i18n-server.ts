import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, type Lang } from "@/lib/i18n";

/** Server-side read for RSC pages/layouts (e.g. src/components/ops-shell.tsx). */
export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
}
