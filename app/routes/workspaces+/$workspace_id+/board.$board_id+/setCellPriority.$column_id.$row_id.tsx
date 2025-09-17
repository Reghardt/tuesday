import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { useState } from "react";
import type { Route } from "./+types/setCellPriority.$column_id.$row_id";
import { priorityColumnTypeCodec } from "~/enums/groupColumnTypes";

export default function Component({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getPrioritiesQuery = useQuery(
    trpc.priorities.getPriorities.queryOptions({
      board_id: Number(params.board_id),
    })
  );

  const createPrioritiesMutation = useMutation(
    trpc.priorities.createPriorities.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.priorities.getPriorities.queryKey({
            board_id: Number(params.board_id),
          }),
        });
      },
    })
  );

  const setCellContentMutation = useMutation(
    trpc.cells.setCellContent.mutationOptions({
      onSuccess: () => {
        navigate(-1);
        queryClient.invalidateQueries({
          queryKey: trpc.cells.getCell.queryKey({
            row_id: Number(params.row_id),
            column_id: Number(params.column_id),
          }),
        });
      },
    })
  );

  const [statusName, setPrioritiesName] = useState("");
  const [color, setColor] = useState("#03fc28");

  return (
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-gray-600/50">
      <div className=" bg-black p-2">
        <div>
          <button onClick={() => navigate(-1)}>Cancel</button>
          <div>Priorities</div>

          {getPrioritiesQuery.data?.map((priority) => {
            return (
              <button
                key={priority.id}
                onClick={() => {
                  setCellContentMutation.mutate({
                    row_id: Number(params.row_id),
                    column_id: Number(params.column_id),
                    content: priorityColumnTypeCodec.encode(priority.id),
                  });
                }}
                className={`w-full`}
                style={{ background: priority.color }}
              >
                {priority.name_}
              </button>
            );
          })}

          <div className="flex flex-col">
            <div className="flex flex-col">
              <label>Name</label>
              <input
                type="text"
                value={statusName}
                onChange={(e) => setPrioritiesName(e.target.value)}
                className="border"
              />
            </div>
            <div className="flex flex-col">
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className=" w-full h-10" />
            </div>

            <button
              onClick={() =>
                createPrioritiesMutation.mutate({
                  board_id: Number(params.board_id),
                  name_: statusName,
                  color: color,
                })
              }
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
