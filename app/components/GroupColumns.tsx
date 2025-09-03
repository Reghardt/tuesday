import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type JSX } from "react";
import { useTRPC } from "~/utils/trpc";

const WorkspaceGroupColumns: FC<{ group_id: number }> = ({ group_id }) => {
  const [workspaceGroupColumnName, setWorkspaceGroupColumnName] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  //   const getWorspaceGroupColumnsQuery = useQuery(
  //     trpc.getWorkspaceGroupColumns.queryOptions({
  //       workspace_group_id,
  //     })
  //   );

  const getGroupColumnsQuery = useQuery(
    trpc.groupColumns.getGroupColumns.queryOptions({
      group_id,
    })
  );

  console.log(getGroupColumnsQuery.data);

  const createGroupColumnMutation = useMutation(
    trpc.groupColumns.createGroupColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.groupColumns.getGroupColumns.queryKey(),
        });
      },
    })
  );

  // const createWorkspaceGroupRowMutation = useMutation(
  //   trpc.createWorkspaceGroupRow.mutationOptions({
  //     onSuccess: () => {
  //       queryClient.invalidateQueries({
  //         queryKey: trpc.getWorkspaceGroupContent.queryKey(),
  //       });
  //     },
  //   })
  // );

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

  // function createGroupTable(data: typeof getWorkspaceGroupContent.data) {
  //   if (data !== undefined && data.length) {
  //     return (
  //       <table className="border">
  //         <tr className="">
  //           {data.map((columns) => {
  //             return <th className="border p-1">{columns.title}</th>;
  //           })}
  //         </tr>
  //         {data[0]?.items.map((_, index) => {
  //           return (
  //             <tr className=" h-6">
  //               {data.map((columns) => {
  //                 return (
  //                   <td className="border p-1">
  //                     {/* {String(columns.items[index].content.value)} */}
  //                     <TextComponent textItem={columns.items[index]} />
  //                   </td>
  //                 );
  //               })}
  //             </tr>
  //           );
  //         })}
  //       </table>
  //     );
  //   } else {
  //     return null;
  //   }
  // }

  return (
    <div>
      <div className="flex gap-2">
        {/* {getWorspaceGroupColumnsQuery.data?.map((column) => {
          return <div key={column.id}>{column.title}</div>;
        })} */}
        {/* {createGroupTable(getWorkspaceGroupContent.data)} */}
        <div>
          <input
            className="border border-white"
            type="text"
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

      {/* {(getWorkspaceGroupContent.data?.length ?? 0) > 0 ? (
        <div>
          <button
            onClick={() => {
              createWorkspaceGroupRowMutation.mutate({
                workspace_group_id: workspace_group_id,
              });
            }}
          >
            Create Row
          </button>
        </div>
      ) : (
        <></>
      )} */}
    </div>
  );
};

export default WorkspaceGroupColumns;
