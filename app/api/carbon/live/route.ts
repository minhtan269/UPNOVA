import { NextRequest, NextResponse } from "next/server";

import { CARBON_INTENSITY_BY_REGION } from "@/lib/carbon-constants";
import { fetchLiveCIFromProvider } from "@/lib/server/carbon-intensity-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveRegion(req: NextRequest): string | null {
    const region = req.nextUrl.searchParams.get("region") ?? "global";
    if (!Object.prototype.hasOwnProperty.call(CARBON_INTENSITY_BY_REGION, region)) {
        return null;
    }
    return region;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const region = resolveRegion(req);
    if (!region) {
        return NextResponse.json({ error: "Invalid region." }, { status: 400 });
    }

    try {
        const data = await fetchLiveCIFromProvider(region);
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Failed to fetch live carbon data." }, { status: 502 });
    }
}
