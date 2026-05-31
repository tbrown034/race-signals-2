import { redirect } from "next/navigation";
import { createSavedFilter } from "@/src/lib/db/saved-filters";

const filterKeys = ["q", "state", "office", "race", "type", "status"] as const;

export async function POST(request: Request) {
  const form = await request.formData();
  const filterJson: Record<string, string> = {};

  for (const key of filterKeys) {
    const value = form.get(key);
    if (typeof value === "string" && value) filterJson[key] = value;
  }

  const name = String(form.get("name") || "Race Signals saved view").slice(0, 120);
  const ownerEmail = String(form.get("owner_email") || "").trim();
  const cadenceValue = String(form.get("cadence") || "off");
  const cadence = cadenceValue === "daily" || cadenceValue === "hourly" ? cadenceValue : "off";

  if (!ownerEmail.includes("@")) {
    return Response.json({ error: "owner_email is required." }, { status: 400 });
  }

  const saved = await createSavedFilter({ name, ownerEmail, filterJson, cadence });
  redirect(`/saved/${saved.id}`);
}
