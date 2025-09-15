import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FC } from "react";
import { useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { Cell } from "./Cell";
import ColumnHeading from "./ColumnHeading";

const WorkspaceBoardGroup: FC<{
  workspace_board_group_id: number;
  workspace_board_id: number;
}> = ({ workspace_board_group_id, workspace_board_id }) => {
  const navigate = useNavigate();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getGroupColumnsQuery = useQuery(
    trpc.workspaceBoardColumns.getWorkspaceBoardColumns.queryOptions({
      workspace_board_id: workspace_board_id,
    })
  );

  const getWorkspaceBoardGroupDataQuery = useQuery(
    trpc.workspaceBoardsGroups.getWorkspaceBoardGroupData.queryOptions({
      id: workspace_board_group_id,
    })
  );

  const createWorkspaceBoardGroupRowMutation = useMutation(
    trpc.workspaceBoardGroupRows.createWorkspaceBoardGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            trpc.workspaceBoardsGroups.getWorkspaceBoardGroupData.queryKey(),
        });
      },
    })
  );

  const deleteRowMutation = useMutation(
    trpc.workspaceBoardGroupRows.deleteGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            trpc.workspaceBoardsGroups.getWorkspaceBoardGroupData.queryKey(),
        });
      },
    })
  );

  function createTable(
    rows: typeof getWorkspaceBoardGroupDataQuery.data,
    columns: typeof getGroupColumnsQuery.data
  ) {
    return (
      <div className="flex gap-2">
        <table>
          <thead>
            <tr className="">
              {columns?.map((column) => {
                return (
                  <th key={column.id} className="text-left border w-60">
                    <ColumnHeading column={column} />
                  </th>
                );
              })}
              <th>
                <button
                  className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
                  onClick={() =>
                    navigate(`createColumn/${workspace_board_group_id}`)
                  }
                >
                  Create Column
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows?.map((row) => {
              return (
                <tr key={row.id}>
                  {row.cells.map((cell) => {
                    // console.log(cell.content);
                    return (
                      <td
                        key={`${cell.workspace_board_column_id}_${cell.workspace_board_group_row_id}`}
                        className="text-left border"
                      >
                        <Cell
                          cell={cell}
                          workspace_id={workspace_board_group_id}
                        />
                      </td>
                    );
                  })}

                  {row.cells.length > 0 ? (
                    <td className="">
                      <button
                        onClick={() =>
                          deleteRowMutation.mutate({
                            id: row.id,
                            workspace_board_group_id:
                              row.workspace_board_group_id,
                          })
                        }
                        className="text-red-700 hover:bg-red-300 w-30"
                      >
                        Delete Row
                      </button>
                    </td>
                  ) : (
                    <></>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2"></div>

      {createTable(
        getWorkspaceBoardGroupDataQuery.data,
        getGroupColumnsQuery.data
      )}

      {(getGroupColumnsQuery.data?.length ?? 0) > 0 ? (
        <div>
          <button
            className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
            onClick={() => {
              createWorkspaceBoardGroupRowMutation.mutate({
                workspace_board_group_id: workspace_board_group_id,
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

export default WorkspaceBoardGroup;
