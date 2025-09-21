import { createContext, useContext, useState, type ReactNode } from "react";
import { create, createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";

// `${group_id}-${level}`
type SelectedRowsStoreMapKey = `${number}-${number}`;
// `${group_id}-${level}`, row_id
type SelectedRowsStoreState = { group_levels: Map<SelectedRowsStoreMapKey, Map<number, null>> };

type SelectedRowsStoreActions = {
  select: (group_id: number, level: number, row_id: number) => void;
  deselect: (group_id: number, level: number, row_id: number) => void;
  isSelected: (group_id: number, level: number, row_id: number) => boolean;
  getGroupLevelSelections: (group_id: number, level: number) => Map<number, null> | undefined;
  clear: () => void;
};

type SelectedRowsStore = SelectedRowsStoreState & SelectedRowsStoreActions;

const createPositionStore = () => {
  return createStore<SelectedRowsStore>()((set, get) => ({
    group_levels: new Map<SelectedRowsStoreMapKey, Map<number, null>>(),
    select: (group_id, level, row_id) =>
      set(({ group_levels: group_level }) => {
        console.log(group_id, level, row_id);
        const newMap = new Map(group_level);

        if (newMap.get(`${group_id}-${level}`) === undefined) {
          newMap.set(`${group_id}-${level}`, new Map<number, null>());
        }
        newMap.set(`${group_id}-${level}`, new Map(newMap.get(`${group_id}-${level}`)).set(row_id, null));
        return { group_levels: newMap };
      }),
    deselect: (group_id, level, row_id) =>
      set(({ group_levels: group_level }) => {
        const newMap = new Map(group_level);

        if (newMap.get(`${group_id}-${level}`) === undefined) {
          newMap.set(`${group_id}-${level}`, new Map<number, null>());
        }
        // newMap.get(`${group_id}-${level}`)?.delete(row_id);
        const deep = new Map(newMap.get(`${group_id}-${level}`));
        deep.delete(row_id);
        newMap.set(`${group_id}-${level}`, deep);

        return { group_levels: newMap };
      }),
    isSelected: (group_id, level, row_id) => get().group_levels.get(`${group_id}-${level}`)?.has(row_id) ?? false,
    getGroupLevelSelections: (group_id, level) => get().group_levels.get(`${group_id}-${level}`),
    clear: () =>
      set(({ group_levels }) => {
        return { group_levels: new Map<SelectedRowsStoreMapKey, Map<number, null>>() };
      }),
  }));
};

// react context

const SelectedRowsStoreContext = createContext<ReturnType<typeof createPositionStore> | null>(null);

export function SelectedRowsStoreProvider({ children }: { children: ReactNode }) {
  const [selectedRowsStore] = useState(createPositionStore);

  return <SelectedRowsStoreContext.Provider value={selectedRowsStore}>{children}</SelectedRowsStoreContext.Provider>;
}

export function useSelectedRowsStore<U>(selector: (state: SelectedRowsStore) => U) {
  const store = useContext(SelectedRowsStoreContext);

  if (store === null) {
    throw new Error("selectedRowsStore must be used within provider");
  }

  return useStore(store, selector);
}
