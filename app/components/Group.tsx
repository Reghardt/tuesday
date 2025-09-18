import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import ColumnHeading from "./ColumnHeading";
import { useNavigate } from "react-router";
import Row from "./Row";

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

  function createTable(
    rows: typeof getGroupDataQuery.data,
    columns: typeof getGroupColumnsQuery.data
  ) {
    return (
      <div className="flex gap-2">
        <div>
          <div className="flex">
            {columns?.map((column) => {
              return (
                <div key={column.id} className="text-left border w-60">
                  <ColumnHeading column={column} />
                </div>
              );
            })}
            <div>
              <div
                className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
                onClick={() => navigate(`createColumn/${group_id}/${level}`)}
              >
                Create Column
              </div>
            </div>
          </div>

          {rows?.map((row) => (
            <Row
              row={row}
              board_id={board_id}
              group_id={group_id}
              level={level + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2"></div>

      {createTable(getGroupDataQuery.data, getGroupColumnsQuery.data)}

      {(getGroupColumnsQuery.data?.length ?? 0) > 0 ? (
        <div>
          <button
            className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
            onClick={() => {
              createRowMutation.mutate({
                group_id: group_id,
                level: level,
                parent_row_id,
              });
            }}
          >
            Create Row
          </button>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default Group;
