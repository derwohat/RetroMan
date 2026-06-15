import { NextRequest, NextResponse } from "next/server";

export type BarcodeResult = {
  title: string;
  year: string | null;
  imageUrl: string | null;
  source: string;
};

async function lookupUpcitemdb(ean: string): Promise<BarcodeResult | null> {
  const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(ean)}`, {
    headers: { "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item?.title) return null;
  return {
    title: item.title,
    year: null,
    imageUrl: item.images?.[0] ?? null,
    source: "UPCitemdb",
  };
}

async function lookupOpenEanDb(ean: string): Promise<BarcodeResult | null> {
  const res = await fetch(`https://opengtindb.org/?ean=${encodeURIComponent(ean)}&cmd=barcode&lang=de`, {
    headers: { "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const text = await res.text();
  const titleMatch = text.match(/<name>(.*?)<\/name>/);
  if (!titleMatch) return null;
  return {
    title: titleMatch[1],
    year: null,
    imageUrl: null,
    source: "OpenGTIN",
  };
}

export async function GET(req: NextRequest) {
  const ean = new URL(req.url).searchParams.get("ean")?.trim() ?? "";
  if (!ean || !/^\d{8,14}$/.test(ean)) {
    return NextResponse.json({ error: "Ungültiger EAN/Barcode." }, { status: 400 });
  }

  const result = await lookupUpcitemdb(ean).catch(() => null)
    ?? await lookupOpenEanDb(ean).catch(() => null);

  if (!result) return NextResponse.json({ error: "Barcode nicht gefunden." }, { status: 404 });
  return NextResponse.json(result);
}
