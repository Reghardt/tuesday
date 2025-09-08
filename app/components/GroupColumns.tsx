import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type JSX } from "react";
import { useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { Cell } from "./Cell";

const WorkspaceGroupColumns: FC<{ group_id: number }> = ({ group_id }) => {
  const navigate = useNavigate();
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

  const createGroupRowMutation = useMutation(
    trpc.groupRows.createGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const deleteRowMutation = useMutation(
    trpc.groupRows.deleteGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
      },
    })
  );

  const deleteColumnMutation = useMutation(
    trpc.groupColumns.deleteGroupColumns.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groupColumns.getGroupColumns.queryKey(),
        });
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

  function createTable(rows: typeof getGroupDataQuery.data, columns: typeof getGroupColumnsQuery.data) {
    return (
      <div className="flex gap-2">
        <table>
          <thead>
            <tr className="">
              {columns?.map((column) => {
                return (
                  <th key={column.id} className="text-left border  w-20">
                    <div className="flex gap-2">
                      <div className="">{column.name_}</div>
                      <button
                        className=" text-red-700 font-light hover:bg-red-300"
                        onClick={() => {
                          deleteColumnMutation.mutate({
                            id: column.id,
                            group_id: column.group_id,
                          });
                        }}
                      >
                        Delete Column
                      </button>
                    </div>
                  </th>
                );
              })}
              <th>
                <button
                  className=" font-light p-1 bg-blue-900 hover:bg-blue-900/80"
                  onClick={() => navigate(`createColumn/${group_id}`)}
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
                    console.log(cell.content);
                    return (
                      <td key={`${cell.group_column_id}_${cell.group_row_id}`} className="text-left border">
                        <Cell cell={cell} />
                      </td>
                    );
                  })}

                  {row.cells.length > 0 ? (
                    <td className="">
                      <button
                        onClick={() =>
                          deleteRowMutation.mutate({
                            id: row.id,
                            group_id: row.group_id,
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
