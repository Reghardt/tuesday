import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import ColumnHeading from "./ColumnHeading";
import { useNavigate } from "react-router";
import Row from "./Row";
import PlusIcon from "./icons/PlusIcon";
import LevelCheckbox from "./LevelCheckbox";
import type z from "zod";
import type { ZGroup } from "~/schemas/groups";
import GroupName from "./GroupName";
import { ZEGroupColumnTypes } from "~/enums/groupColumnTypes";
import { getEnabledColumnTypes, type ColumnTypeKey } from "~/enums/supportedColumnTypes";

const Group: FC<{
  group: z.infer<typeof ZGroup>;
  level: number;
  parent_row_id: number | null;
}> = ({ group, level, parent_row_id }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const [openAddDropdown, setOpenAddDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const getGroupColumnsQuery = useQuery(
    trpc.columns.getColumns.queryOptions({
      board_id: group.board_id,
      level: level,
    })
  );

  const createRowMutation = useMutation(
    trpc.rows.createRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey({
            group_id: group.id,
            parent_row_id: parent_row_id,
          }),
        });
      },
    })
  );

  const createColumnMutation = useMutation(
    trpc.columns.createColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.columns.getColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey({
            group_id: group.id,
            parent_row_id: parent_row_id,
          }),
        });
        setOpenAddDropdown(false);
      },
    })
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!openAddDropdown) return;
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setOpenAddDropdown(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenAddDropdown(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openAddDropdown]);

  function addColumn(kind: ColumnTypeKey, name_: string) {
    createColumnMutation.mutate({
      name_,
      board_id: group.board_id,
      column_type: ZEGroupColumnTypes.enum[kind],
      group_id: group.id,
      level: level,
    });
  }

  const getGroupDataQuery = useQuery(
    trpc.groups.getGroupData.queryOptions({
      group_id: group.id,
      parent_row_id: parent_row_id,
    })
  );

  function createTable(rows: typeof getGroupDataQuery.data, columns: typeof getGroupColumnsQuery.data) {
    return (
      <div className="w-full">
        {level === 0 ? <GroupName name={group.name_} group_id={group.id} /> : <></>}

        <div className="grid grid-cols-[auto_1fr] w-full ">
          {level > 0 ? (
            <div className="w-8">
              <div className="border-b h-4 rounded-bl-lg border-l-2 translate-x-[-1px] w-[calc(100%+1px)]"></div>
            </div>
          ) : (
            <div></div>
          )}
          <div className="flex w-full">
            <div className="border-l-4"></div>
            <div className="min-w-8 border-t border-l border-neutral-700 flex justify-center items-center">
              <LevelCheckbox rows={rows} group_id={group.id} level={level} />
            </div>
            <div className="min-w-8 border-t border-l border-neutral-700">{/* <Chevron /> */}</div>
            {columns?.map((column) => {
              return (
                <div key={column.id} className="text-left border-t border-l border-neutral-700 w-60">
                  <ColumnHeading column={column} />
                </div>
              );
            })}
            <div className="text-left border-t border-l border-neutral-700 w-full p-1">
              <span className="relative inline-flex" ref={dropdownRef}>
                <button
                  className="font-light text-white rounded-full hover:bg-neutral-700 h-7 w-7 flex items-center justify-center"
                  aria-haspopup="menu"
                  aria-expanded={openAddDropdown}
                  onClick={() => setOpenAddDropdown((v) => !v)}
                >
                  <PlusIcon />
                  <span className="sr-only">Add column</span>
                </button>
                {openAddDropdown ? (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-20 mt-2 w-56 rounded-md border border-neutral-700 bg-neutral-900 shadow-lg"
                  >
                    <div className="p-1 grid">
                      {getEnabledColumnTypes().map((t) => (
                        <DropdownItem
                          key={t.key}
                          label={t.label}
                          onClick={() => addColumn(t.key, t.label)}
                          loading={createColumnMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        {rows?.map((row) => (
          <Row key={row.id} row={row} group={group} level={level} />
        ))}
      </div>
    );
  }

  return (
    <>
      {createTable(getGroupDataQuery.data, getGroupColumnsQuery.data)}

      {(getGroupColumnsQuery.data?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-[auto_auto_1fr] w-full  ">
          {level > 0 ? (
            <div className="w-8">
              {/* <div className="border-b h-4 rounded-bl-lg border-l-2 translate-x-[-1px] w-[calc(100%+1px)]"></div> */}
            </div>
          ) : (
            <div></div>
          )}
          <div className="border-l-4" />
          <div className="border-t border-b border-neutral-700 w-full ">
            <button
              className="font-light flex gap-2 hover:bg-neutral-800 rounded m-1 pr-2 text-neutral-500"
              onClick={() => {
                createRowMutation.mutate({
                  group_id: group.id,
                  level: level,
                  parent_row_id,
                });
              }}
            >
              <PlusIcon />
              <div>Create Row</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] w-full  ">
          {level > 0 ? <div className="w-8"></div> : <div></div>}
          <div className="border-t border-neutral-700 w-full "></div>
        </div>
      )}
    </>
  );
};

export default Group;

const DropdownItem: FC<{ label: string; onClick: () => void; loading?: boolean }> = ({ label, onClick, loading }) => {
  return (
    <button
      type="button"
      disabled={!!loading}
      className="text-left px-3 py-2 text-sm text-slate-100 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed rounded"
      onClick={onClick}
      role="menuitem"
    >
      {loading ? `Creating ${label}...` : label}
    </button>
  );
};
