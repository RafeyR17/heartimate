import { Suspense } from "react";
import { CharacterFormDynamic as CharacterForm } from "@/components/CharacterFormDynamic";

export default function CreateCharacterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080608] flex items-center justify-center text-white/40 text-sm">
          Loading…
        </div>
      }
    >
      <CharacterForm mode="create" />
    </Suspense>
  );
}
