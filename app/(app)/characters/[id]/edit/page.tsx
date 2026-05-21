import { redirect } from "next/navigation";
import { requireAuthedServerDb } from "@/lib/server-auth";
import { Suspense } from "react";
import { CharacterFormDynamic as CharacterForm } from "@/components/CharacterFormDynamic";
import type { CharacterFormInitial } from "@/components/CharacterForm";

export const metadata = {
  title: "Edit Character — Heartimate",
};

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireAuthedServerDb();

  const { data: row } = await supabase
    .from("characters")
    .select(
      "id, name, description, personality, scenario, greeting, example_dialogs, tags, is_nsfw, is_public, avatar_url, user_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) redirect("/explore");
  if (row.user_id !== user.id) redirect(`/characters/${id}`);

  const initial: CharacterFormInitial = {
    id: row.id,
    name: row.name,
    description: row.description,
    personality: row.personality,
    scenario: row.scenario,
    greeting: row.greeting,
    example_dialogs: row.example_dialogs,
    tags: row.tags as string[] | null,
    is_nsfw: row.is_nsfw,
    is_public: row.is_public,
    avatar_url: row.avatar_url,
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080608] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <CharacterForm mode="edit" characterId={id} initialCharacter={initial} />
    </Suspense>
  );
}
