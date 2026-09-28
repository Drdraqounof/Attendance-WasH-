import { NextResponse } from "next/server";
import { FALLBACK_GAS_PRICE_PER_GALLON } from "@/lib/fleet/theme";
import type { GasPriceResponse } from "@/lib/fleet/types";
import { requireApiSession } from "@/lib/session";

/**
 * GET -> latest EIA weekly retail regular-gasoline price for PADD 1A
 * (New England, covers Boston), used for truck fuel cost on /map.
 * Needs EIA_API_KEY in the environment; without it (or if EIA is
 * unreachable) returns a fixed fallback with `isFallback: true`.
 * Signed-in users only.
 */

const EIA_URL =
  "https://api.eia.gov/v2/petroleum/pri/gnd/data/" +
  "?frequency=weekly&data[0]=value" +
  "&facets[duoarea][]=R1X&facets[product][]=EPMR" +
  "&sort[0][column]=period&sort[0][direction]=desc&length=1";

const FALLBACK: GasPriceResponse = {
  pricePerGallon: FALLBACK_GAS_PRICE_PER_GALLON,
  period: null,
  isFallback: true,
};

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json<GasPriceResponse>(FALLBACK);
  }

  try {
    const res = await fetch(`${EIA_URL}&api_key=${apiKey}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`EIA ${res.status}`);

    const data = await res.json();
    const row = data?.response?.data?.[0];
    const price = Number(row?.value);
    if (!row || Number.isNaN(price)) throw new Error("EIA returned no usable price");

    return NextResponse.json<GasPriceResponse>({
      pricePerGallon: price,
      period: row.period ?? null,
      isFallback: false,
    });
  } catch (error) {
    console.error("[gas-price] EIA request failed:", error);
    return NextResponse.json<GasPriceResponse>(FALLBACK);
  }
}
