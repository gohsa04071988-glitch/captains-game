import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/puzzle-data";

export const dynamic = "force-dynamic";

/* Клиент сравнивает эту версию со своей запомненной:
   отличается — показывает плашку «Появилось обновление!» */
export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
