import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ZEGroupColumnTypes } from "~/enums/groupColumnTypes";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/createColumn.$group_id";

export default function Component({ params }: Route.ComponentProps) {
  const navigate = useNavigate();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createColumnMutation = useMutation(
    trpc.columns.createColumn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.columns.getColumns.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.groups.getGroupData.queryKey(),
        });
        navigate(-1);
      },
    })
  );

  return (
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-gray-600/50">
      <div className=" bg-black p-2">
        <div>
          <button onClick={() => navigate(-1)}>Cancel</button>
          <div>Create Column</div>
          <div className="text-gray-400">Select type:</div>
          <div className="grid grid-cols-2 gap-2 ">
            <button
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Text",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.text,
                  group_id: Number(params.group_id),
                });
              }}
            >
              Text
            </button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Number",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.number_,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              Number
            </button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Date",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.date,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              Date
            </button>
            <button className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80">Time</button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Status",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.status,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              Status
            </button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Priority",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.priority,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              Priority
            </button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "People",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.people,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              People
            </button>
            <button className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80">File</button>
            <button className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80">Timeline</button>
            <button className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80">Tags</button>
            <button className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80">Checkbox</button>
            <button
              onClick={() => {
                createColumnMutation.mutate({
                  name_: "Updates",
                  board_id: Number(params.board_id),
                  column_type: ZEGroupColumnTypes.enum.updates,
                  group_id: Number(params.group_id),
                });
              }}
              className="p-2 bg-blue-900 rounded text-left hover:bg-blue-900/80"
            >
              Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
