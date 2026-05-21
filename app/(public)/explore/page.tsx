import { Suspense } from "react";
import { SiteFooter } from "@/components/legal/site-footer";
import ExploreClientDynamic from "./ExploreClientDynamic";
import { getExplorePageData, parseExploreSearchParams } from "@/lib/explore-data";

export const revalidate = 120;

interface SearchParams {
  q?: string;
  tags?: string;
  sort?: string;
  limit?: string;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const queryKey = parseExploreSearchParams(resolvedParams);
  const parsedLimit = parseInt(resolvedParams.limit || "20", 10);
  const urlLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

  const {
    characters: processedCharacters,
    hasMore,
    displayTotalCount,
    fetchError,
  } = await getExplorePageData(queryKey);

  return (
    <>
      <Suspense fallback={null}>
        <ExploreClientDynamic
          initialCharacters={processedCharacters}
          totalCount={displayTotalCount}
          hasMore={hasMore}
          queryText={queryKey.q}
          selectedTags={queryKey.tags ? queryKey.tags.split(",").filter(Boolean) : []}
          sortOption={queryKey.sort}
          currentLimit={urlLimit}
          fetchError={fetchError}
        />
      </Suspense>
      <SiteFooter />
    </>
  );
}
