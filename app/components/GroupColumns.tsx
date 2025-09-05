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

  const getGroupData = useQuery(
    trpc.groups.getGroupData.queryOptions({
      id: group_id,
    })
  );

  console.log(getGroupData.data);

  const createGroupColumnMutation = useMutation(
    trpc.groupColumns.createGroupColumn.mutationOptions({
      onSuccess: () => {
        setWorkspaceGroupColumnName("");
        queryClient.invalidateQueries({
          queryKey: trpc.groupColumns.getGroupColumns.queryKey(),
        });
      },
    })
  );

  const createGroupRowMutation = useMutation(
    trpc.groupRows.createGroupRow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groupRows.getGroupRows.queryKey(),
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

  return (
    <div>
      <div className="flex gap-2">
        {getGroupColumnsQuery.data?.map((column) => {
          return <div key={column.id}>{column.name_}</div>;
        })}
        {/* {createGroupTable(getWorkspaceGroupContent.data)} */}
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
