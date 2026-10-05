import { useSearchParams } from "react-router";

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * The page size for a paginated table, kept in the `pageSize` query
 * parameter so it survives reloads and shared links. A missing or unknown
 * value falls back to `defaultSize`, and choosing the default removes the
 * parameter again so the plain URL stays clean.
 */
export function usePageSize(defaultSize: number): [number, (size: number) => void] {
   const [searchParams, setSearchParams] = useSearchParams();
   const fromUrl = Number(searchParams.get("pageSize"));
   const pageSize = PAGE_SIZES.some((size) => size === fromUrl) ? fromUrl : defaultSize;

   const setPageSize = (size: number): void => {
      setSearchParams(
         (current) => {
            const next = new URLSearchParams(current);
            if (size === defaultSize) {
               next.delete("pageSize");
            } else {
               next.set("pageSize", String(size));
            }
            return next;
         },
         { replace: true, preventScrollReset: true },
      );
   };

   return [pageSize, setPageSize];
}
