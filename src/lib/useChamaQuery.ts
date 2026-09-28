import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";

/**
 * Low-connectivity helper: keeps the last answer from the server in the phone's
 * own storage, so a member who opens the app with no network still sees the
 * chama information she saw last time.
 */
export function useChamaQuery<T>(key: QueryKey, fn: () => Promise<T>) {
  const cacheKey = `chama_cache_${JSON.stringify(key)}`;
  const [cached, setCached] = useState<T | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (raw) setCached(JSON.parse(raw) as T);
    } catch {
      /* ignore unreadable cache */
    }
  }, [cacheKey]);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await fn();
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        /* storage full or unavailable */
      }
      return result;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const data = (query.data ?? cached) as T | null;
  const offline = !query.data && !!cached && query.isError;
  return { ...query, data, offline };
}
