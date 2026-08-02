import { useEffect, useState } from "react";

/**
 * Structural shape of a wxt storage item. Kept local so the hook stays
 * decoupled from wxt's exported generics.
 */
interface StorageItemLike<T> {
  fallback: T;
  getValue: () => Promise<T>;
  setValue: (value: T) => Promise<void>;
  watch: (callback: (newValue: T | null) => void) => () => void;
}

/**
 * Binds local React state to a wxt storage item: loads the initial value,
 * keeps it in sync via `watch`, and persists on update.
 */
export function useStorageState<T>(item: StorageItemLike<T>) {
  const [value, setValue] = useState<T>(item.fallback);

  // `unwatch` is returned as the cleanup, but the rule flags every `watch` call.
  // oxlint-disable-next-line react-doctor/effect-needs-cleanup -- false positive
  useEffect(() => {
    const unwatch = item.watch((newValue) => {
      setValue(newValue ?? item.fallback);
    });
    return unwatch;
  }, [item]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const stored = await item.getValue();
      if (active && stored !== null && stored !== undefined) {
        setValue(stored);
      }
    };
    void load();

    return () => {
      active = false;
    };
  }, [item]);

  const update = async (next: T) => {
    setValue(next);
    await item.setValue(next);
  };

  return [value, update] as const;
}
