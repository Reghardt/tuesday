import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type JSX } from "react";
import { useTRPC } from "~/utils/trpc/trpc";

const WorkspaceGroupColumns: FC<{ group_id: number }> = ({ group_id }) => {
  const [workspaceGroupColumnName, setWorkspaceGroupColumnName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getGroupColumnsQuery = useQuery(
    trpc.groupColumns.getGroupColumns.queryOptions({
      group_id,
    })
  );

  const getGroupDataQuery = useQuery(
    trpc.groups.getGroupData.queryOptions({
      id: group_id,
    })
  );

  const createGroupColumnMutation = useMutation(
    trpc.groupColumns.createGroupColumn.mutationOptions({
      onSuccess: () => {
        setWorkspaceGroupColumnName("");
        queryClient.invalidateQueries({
          queryKey: trpc.groupColumns.getGroupColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const createGroupRowMutation = useMutation(
    trpc.groupRows.createGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const TextComponent: FC<{
    textItem: { id: number; content: { value: string } };
  }> = (textItem) => {
    const [text, setText] = useState(textItem.textItem.content.value);
    return (
      <div className="flex">
        <input value={text} onChange={(e) => setText(e.target.value)}></input>
        <button>OK</button>
      </div>
    );
  };

  function createTable(
    rows: typeof getGroupDataQuery.data,
    columns: typeof getGroupColumnsQuery.data
  ) {
    return (
      <div className="flex gap-2">
        {columns?.length ? (
          <table>
            <thead>
              <tr className="border">
                {columns?.map((column) => {
                  return (
                    <th key={column.id} className="text-left border-l p-1 w-20">
                      {column.name_}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rows?.map((row) => {
                return (
                  <tr key={row.id} className="border">
                    {row.cells.map((cell) => {
                      return (
                        <td
                          key={`${cell.group_column_id}_${cell.group_row_id}`}
                          className="text-left border-l p-1"
                        >
                          <input />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <></>
        )}

        <div>
          <input
            className="border border-white"
            type="text"
            value={workspaceGroupColumnName}
            onChange={(e) => setWorkspaceGroupColumnName(e.target.value)}
          ></input>
          <button
            onClick={() =>
              createGroupColumnMutation.mutate({
                group_id: group_id,
                name_: workspaceGroupColumnName,
                column_type: 0,
              })
            }
          >
            Create Column
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2"></div>

      {createTable(getGroupDataQuery.data, getGroupColumnsQuery.data)}

      <div>
        <button
          onClick={() => {
            createGroupRowMutation.mutate({
              group_id: group_id,
            });
          }}
        >
          Create Row
        </button>
      </div>
    </div>
  );
};

export default WorkspaceGroupColumns;
