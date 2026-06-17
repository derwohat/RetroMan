import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  // GDPR full data export
  if (format === "gdpr") {
    const [user, items] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, preferredLanguage: true, createdAt: true, gdprConsentAt: true },
      }),
      prisma.item.findMany({
        where: { userId },
        include: { images: true, tags: { include: { tagValue: true, tagGroup: true } }, customFields: { include: { field: true } }, grading: true, collection: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      type: "gdpr",
      user,
      items,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="retroman-dsgvo-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  }

  const items = await prisma.item.findMany({
    where: { userId },
    include: {
      images: { orderBy: { order: "asc" } },
      tags: { include: { tagValue: true, tagGroup: true } },
      customFields: { include: { field: true } },
      collection: { select: { id: true, name: true } },
    },
    orderBy: [{ collectionId: "asc" }, { title: "asc" }],
  });

  if (format === "csv") {
    const headers = [
      "id", "title", "collection", "category", "year", "condition", "itemStatus",
      "collectionStatus", "isFavorite", "purchasePrice", "purchaseDate",
      "store", "location", "quantity", "barcode", "notes", "description", "imageUrl", "createdAt",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = items.map((item) => {
      const img = item.images.find((i) => i.isPrimary) ?? item.images[0];
      return [
        item.id, item.title, item.collection.name, item.collection.name,
        item.year, item.condition, item.itemStatus, item.collectionStatus,
        item.isFavorite, item.purchasePrice, item.purchaseDate?.toISOString().split("T")[0],
        item.store, item.location, item.quantity, item.barcode,
        item.notes, item.description, img?.url ?? img?.filePath, item.createdAt.toISOString(),
      ].map(escape).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="retroman-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // JSON export
  const payload = {
    exportedAt: new Date().toISOString(),
    version: "1",
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      collection: item.collection.name,
      category: item.collection.name,
      year: item.year,
      condition: item.condition,
      itemStatus: item.itemStatus,
      collectionStatus: item.collectionStatus,
      isFavorite: item.isFavorite,
      purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
      purchaseDate: item.purchaseDate?.toISOString().split("T")[0] ?? null,
      store: item.store,
      location: item.location,
      quantity: item.quantity,
      barcode: item.barcode,
      description: item.description,
      notes: item.notes,
      images: item.images.map((i) => ({ url: i.url, filePath: i.filePath, isPrimary: i.isPrimary })),
      tags: item.tags.map((t) => ({ group: t.tagGroup.name, value: t.tagValue.value })),
      customFields: item.customFields.map((cf) => ({ key: cf.field.fieldKey, name: cf.field.name, value: cf.value })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="retroman-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
