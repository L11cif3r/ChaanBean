import { NextResponse } from "next/server";
import { getAllFeaturePricing, updateFeaturePrice, resetFeaturePrice, getFeaturePrice } from "@/lib/pricing/pricing-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const featureKey = searchParams.get("key");

  if (featureKey) {
    const price = getFeaturePrice(featureKey);
    return NextResponse.json({ key: featureKey, price });
  }

  const pricing = getAllFeaturePricing();
  return NextResponse.json({ pricing });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "update", key, price } = body as {
      action?: "update" | "reset";
      key: string;
      price?: number;
    };

    if (!key) {
      return NextResponse.json({ error: "Feature key required" }, { status: 400 });
    }

    if (action === "reset") {
      const result = resetFeaturePrice(key);
      return NextResponse.json(result);
    }

    if (typeof price !== "number" || price < 0) {
      return NextResponse.json({ error: "Valid numeric price required" }, { status: 400 });
    }

    const result = updateFeaturePrice(key, price);
    if (!result.success) {
      return NextResponse.json({ error: "Failed to update price for key" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Updated price for ${key} to ₹${price.toLocaleString("en-IN")}`,
      item: result.item,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing update error" },
      { status: 500 }
    );
  }
}
