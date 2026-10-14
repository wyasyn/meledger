import { addDatabaseChangeListener } from 'expo-sqlite';
import { type DependencyList, useEffect, useState } from 'react';

/**
 * Runs `load` now and again whenever any of `tables` changes. Unlike Drizzle's useLiveQuery,
 * this watches every table a join or follow-up query reads, not only the base table.
 * `load` is captured when `deps` change, so list everything it reads in `deps`.
 */
export function useLiveData<T>(
  load: () => Promise<T>,
  tables: readonly string[],
  deps: DependencyList,
): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let active = true;
    let run = 0;
    const refresh = () => {
      const current = ++run;
      load()
        .then((next) => {
          if (active && current === run) setData(next);
        })
        .catch((error: unknown) => console.error('useLiveData', error));
    };
    refresh();
    const watched = new Set(tables);
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (watched.has(tableName)) refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass their own deps
  }, [tables.join(','), ...deps]);

  return data;
}
