import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import type { Route } from "./+types/setCellStatus.$column_id.$row_id";
import { useState } from "react";
import { statusColumnTypeCodec } from "~/enums/groupColumnTypes";

export default function Component({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getStatusesQuery = useQuery(
    trpc.statuses.getStatuses.queryOptions({
      board_id: Number(params.board_id),
    })
  );

  const createStatusMutation = useMutation(
    trpc.statuses.createStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.statuses.getStatuses.queryKey({
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

  const [statusName, setStatusName] = useState("");
  const [color, setColor] = useState("#03fc28");

  return (
    <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-gray-600/50">
      <div className=" bg-black p-2">
        <div>
          <button onClick={() => navigate(-1)}>Cancel</button>
          <div>Status</div>

          {getStatusesQuery.data?.map((status) => {
            return (
              <button
                onClick={() => {
                  setCellContentMutation.mutate({
                    row_id: Number(params.row_id),
                    column_id: Number(params.column_id),
                    content: statusColumnTypeCodec.encode(status.id),
                  });
                }}
                className={`w-full`}
                style={{ background: status.color }}
              >
                {status.name_}
              </button>
            );
          })}

          <div className="flex flex-col">
            <div className="flex flex-col">
              <label>Name</label>
              <input
                type="text"
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                className="border"
              />
            </div>
            <div className="flex flex-col">
              <label>Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className=" w-full h-10" />
            </div>

            <button
              onClick={() =>
                createStatusMutation.mutate({
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
