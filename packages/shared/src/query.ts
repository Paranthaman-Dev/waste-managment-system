import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from './api';

interface QueryOptions<T> {
  enabled?: boolean;
  refetchInterval?: number;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (err: Error) => void;
}

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<T | undefined>;
  mutate: (newData: T | ((prev: T | undefined) => T), shouldRevalidate?: boolean) => void;
}

const queryCache = new Map<string, { data: unknown; timestamp: number }>();

export function useQuery<T>(
  key: string | null | (() => string | null),
  fetcher?: (token?: string | null) => Promise<T>,
  token?: string | null,
  options: QueryOptions<T> = {},
): QueryResult<T> {
  const { enabled = true, refetchInterval, initialData, onSuccess, onError } = options;
  const path = typeof key === 'function' ? key() : key;

  const cacheKey = path ? `${path}:${token || ''}` : null;
  const cached = cacheKey ? queryCache.get(cacheKey) : undefined;

  const [data, setData] = useState<T | undefined>((cached?.data as T) ?? initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!cached?.data && enabled && !!path);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const executeFetch = useCallback(async (): Promise<T | undefined> => {
    if (!path || !enabled) return undefined;
    setIsLoading(true);
    setError(null);
    try {
      let result: T;
      if (fetcher) {
        result = await fetcher(token);
      } else {
        result = await apiRequest<T>(path, {}, token);
      }
      if (cacheKey) queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      if (isMounted.current) {
        setData(result);
        setIsLoading(false);
        onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (isMounted.current) {
        setError(e);
        setIsLoading(false);
        onError?.(e);
      }
      return undefined;
    }
  }, [path, enabled, token, cacheKey, fetcher, onSuccess, onError]);

  useEffect(() => {
    if (enabled && path) executeFetch();
  }, [path, enabled, executeFetch]);

  useEffect(() => {
    if (!refetchInterval || !enabled || !path) return;
    const interval = setInterval(executeFetch, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, enabled, path, executeFetch]);

  const mutate = useCallback(
    (newData: T | ((prev: T | undefined) => T), shouldRevalidate = true) => {
      setData((prev) => {
        const next = typeof newData === 'function' ? (newData as (p: T | undefined) => T)(prev) : newData;
        if (cacheKey) queryCache.set(cacheKey, { data: next, timestamp: Date.now() });
        return next;
      });
      if (shouldRevalidate) executeFetch();
    },
    [cacheKey, executeFetch],
  );

  return { data, isLoading, isError: !!error, error, refetch: executeFetch, mutate };
}

export function invalidateQueries(prefix?: string) {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) queryCache.delete(key);
  }
}
