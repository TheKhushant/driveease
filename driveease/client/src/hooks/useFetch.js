import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, get } from '../services/api';

/**
 * Fetch JSON from the API. Re-fetches when url/params change.
 * Returns { data, loading, error, reload, setData }.
 */
export function useFetch(url, params, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url && enabled));
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await get(url, JSON.parse(key));
      if (id === reqId.current) setData(res);
    } catch (err) {
      if (id === reqId.current) setError(errorMessage(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [url, key, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

export function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Load `?all=true` option lists for admin selects. */
export function useOptions(url, { labelKey = 'name', params } = {}) {
  const { data, loading } = useFetch(url, { all: true, ...(params || {}) });
  const items = data?.items || [];
  const options = items.map((i) => ({ value: i._id, label: typeof labelKey === 'function' ? labelKey(i) : i[labelKey] }));
  return { options, items, loading };
}
