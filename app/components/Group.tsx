import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import ColumnHeading from "./ColumnHeading";
import { useNavigate } from "react-router";
import Row from "./Row";
import Chevron from "./icons/Chevron";
import PlusIcon from "./icons/PlusIcon";

const Group: FC<{
  board_id: number;
  group_id: number;
  level: number;
  parent_row_id: number | null;
}> = ({ board_id, group_id, level, parent_row_id }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const getGroupColumnsQuery = useQuery(
    trpc.columns.getColumns.queryOptions({
      board_id: board_id,
      level: level,
    })
  );

  const createRowMutation = useMutation(
    trpc.rows.createRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey({
            group_id: group_id,
            parent_row_id: parent_row_id,
          }),
        });
      },
    })
  );

  const getGroupDataQuery = useQuery(
    trpc.groups.getGroupData.queryOptions({
      group_id: group_id,
      parent_row_id: parent_row_id,
    })
  );

  function createTable(rows: typeof getGroupDataQuery.data, columns: typeof getGroupColumnsQuery.data) {
    return (
      <div className="w-full">
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
              <input type="checkbox" className="scale-130"></input>
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
              <button
                className=" font-light text-white rounded-full hover:bg-neutral-700 h-full aspect-square flex items-center justify-center"
                onClick={() => navigate(`createColumn/${group_id}/${level}`)}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
        </div>

        {rows?.map((row) => (
          <Row key={row.id} row={row} board_id={board_id} group_id={group_id} level={level} />
        ))}
      </div>
    );
  }

  return (
    <>
      {createTable(getGroupDataQuery.data, getGroupColumnsQuery.data)}

      {(getGroupColumnsQuery.data?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-[auto_auto_1fr] w-full ">
          {level > 0 ? (
            <div className="w-8">
              {/* <div className="border-b h-4 rounded-bl-lg border-l-2 translate-x-[-1px] w-[calc(100%+1px)]"></div> */}
              <div className=""></div>
            </div>
          ) : (
            <div></div>
          )}
          <div className="border-l-4" />
          <div className="border-t border-b border-neutral-700 w-full ">
            <button
              className="font-light flex gap-2 hover:bg-neutral-700 rounded m-1 pr-2"
              onClick={() => {
                createRowMutation.mutate({
                  group_id: group_id,
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
        <></>
      )}
    </>
  );
};

export default Group;
