import { useMutation, useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useNavigate } from "react-router";
import type { z } from "zod";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import type { ZGroupCellExtended } from "~/schemas/groups";
import { useTRPC } from "~/utils/trpc/trpc";

const TextCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({
  cell,
}) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(
    trpc.groupCells.setGroupCellContent.mutationOptions()
  );

  return (
    <input
      onChange={(e) =>
        useSetGroupCellContent.mutate({
          group_row_id: cell.group_row_id,
          group_column_id: cell.group_column_id,
          content: textColumnTypeCodec.encode(e.target.value),
        })
      }
      className="p-1 focus:outline-hidden w-full"
      type="text"
      defaultValue={textColumnTypeCodec.decode(cell.content)}
    />
  );
};

const NumberCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({
  cell,
}) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(
    trpc.groupCells.setGroupCellContent.mutationOptions()
  );

  return (
    <input
      onChange={(e) =>
        useSetGroupCellContent.mutate({
          group_row_id: cell.group_row_id,
          group_column_id: cell.group_column_id,
          content: numberColumnTypeCodec.encode(Number(e.target.value)),
        })
      }
      className="p-1 focus:outline-hidden w-full"
      type="number"
      defaultValue={numberColumnTypeCodec.decode(cell.content)}
    />
  );
};

const DateCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({
  cell,
}) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(
    trpc.groupCells.setGroupCellContent.mutationOptions()
  );

  return (
    <input
      onChange={(e) => {
        useSetGroupCellContent.mutate({
          group_row_id: cell.group_row_id,
          group_column_id: cell.group_column_id,
          content: { value: e.target.value },
        });
      }}
      className="p-1 focus:outline-hidden w-full"
      type="date"
      defaultValue={dateColumnTypeCodec.decode(cell.content) ?? undefined}
    />
  );
};

const StatusCell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  workspace_id: number;
}> = ({ cell, workspace_id }) => {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const getCellQuery = useQuery({
    ...trpc.groupCells.getGroupCell.queryOptions({
      group_column_id: cell.group_column_id,
      group_row_id: cell.group_row_id,
    }),
    initialData: cell,
    staleTime: 0,
  });

  const getWorkspaceStatusesQuery = useQuery(
    trpc.workspaceStatuses.getWorkspaceStatuses.queryOptions({ workspace_id })
  );

  let text = "No Status";
  let color = "#4a5565";

  if (getCellQuery.data?.content?.status_id !== null) {
    for (let i = 0; i < (getWorkspaceStatusesQuery.data?.length ?? 0); i++) {
      if (
        getCellQuery.data?.content?.status_id ===
        getWorkspaceStatusesQuery.data![i].id
      ) {
        text = getWorkspaceStatusesQuery.data![i].name_;
        color = getWorkspaceStatusesQuery.data![i].color;
      }
    }
  }

  return (
    <button
      onClick={() => {
        navigate(`setCellStatus/${cell.group_column_id}/${cell.group_row_id}`);
      }}
      className="w-full h-full p-1"
      style={{ background: color }}
    >
      {text}
    </button>
  );
};

export const Cell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  workspace_id: number;
}> = ({ cell, workspace_id }) => {
  if (cell.column_type === ZEGroupColumnTypes.enum.text) {
    return <TextCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.number_) {
    return <NumberCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.date) {
    return <DateCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.status) {
    return <StatusCell cell={cell} workspace_id={workspace_id} />;
  } else {
    return <div>UNKNOWN TYPE</div>;
  }
};
