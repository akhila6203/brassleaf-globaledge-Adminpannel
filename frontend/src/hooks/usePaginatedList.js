import { useCallback, useEffect, useState } from 'react';

/**
 * Simple list fetcher for paginated endpoints that return { data, total, page, pages }.
 */
export default function usePaginatedList(fetcher, deps = [], initialParams = {}) {
  const [params, setParams] = useState({ page: 1, limit: 20, ...initialParams });
  const [state, setState] = useState({
    rows: [],
    total: 0,
    page: 1,
    pages: 1,
    loading: true,
    error: null,
  });

  const load = useCallback(
    async (override = {}) => {
      const next = { ...params, ...override };
      setParams(next);
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetcher(next);
        const body = res.data || {};
        setState({
          rows: body.data || [],
          total: body.total ?? 0,
          page: body.page ?? next.page,
          pages: body.pages ?? 1,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          rows: [],
          loading: false,
          error: err.message,
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, params, ...deps]
  );

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, params, setParams, reload: load };
}
