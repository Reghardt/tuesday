import { useMutation, useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useNavigate } from "react-router";
import type { z } from "zod";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  priorityColumnTypeCodec,
  statusColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import type { ZGroupCellExtended } from "~/schemas/workspace_board_groups";
import { useTRPC } from "~/utils/trpc/trpc";

const TextCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(trpc.groupCells.setGroupCellContent.mutationOptions());

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

const NumberCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(trpc.groupCells.setGroupCellContent.mutationOptions());

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

const DateCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(trpc.groupCells.setGroupCellContent.mutationOptions());

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

  const status_id = statusColumnTypeCodec.decode(getCellQuery.data?.content);

  if (status_id !== null) {
    for (let i = 0; i < (getWorkspaceStatusesQuery.data?.length ?? 0); i++) {
      if (status_id === getWorkspaceStatusesQuery.data![i].id) {
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

const PriorityCell: FC<{
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

  const getWorkspacePrioritiesQuery = useQuery(
    trpc.workspacePriorities.getWorkspacePriorities.queryOptions({
      workspace_id,
    })
  );

  let text = "No Status";
  let color = "#4a5565";

  const priority_id = priorityColumnTypeCodec.decode(getCellQuery.data?.content);

  if (priority_id !== null) {
    for (let i = 0; i < (getWorkspacePrioritiesQuery.data?.length ?? 0); i++) {
      if (priority_id === getWorkspacePrioritiesQuery.data![i].id) {
        text = getWorkspacePrioritiesQuery.data![i].name_;
        color = getWorkspacePrioritiesQuery.data![i].color;
      }
    }
  }

  return (
    <button
      onClick={() => {
        navigate(`setCellPriority/${cell.group_column_id}/${cell.group_row_id}`);
      }}
      className="w-full h-full p-1"
      style={{ background: color }}
    >
      {text}
    </button>
  );
};

const PeopleCell: FC<{
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

  const getUsersQuery = useQuery(trpc.users.getUsers.queryOptions());

  const user_names: string[] = [];
  console.log(getCellQuery.data.content);
  const user_ids = peopleColumnTypeCodec.decode(getCellQuery.data.content);

  for (let i = 0; i < user_ids.length; i++) {
    const user_id = user_ids[i];

    for (let j = 0; j < (getUsersQuery.data?.length ?? 0); j++) {
      const user = getUsersQuery.data![j];
      if (user.id === user_id) {
        user_names.push(user.name);
      }
    }
  }

  console.log();

  return (
    <button
      onClick={() => {
        navigate(`setCellPeople/${cell.group_column_id}/${cell.group_row_id}`);
      }}
      className="w-full h-full p-1"
    >
      {user_names.length ? (
        <>
          {user_names.map((user) => {
            return <div key={user}>{user}</div>;
          })}
        </>
      ) : (
        <>?</>
      )}
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
  } else if (cell.column_type === ZEGroupColumnTypes.enum.priority) {
    return <PriorityCell cell={cell} workspace_id={workspace_id} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.people) {
    return <PeopleCell cell={cell} workspace_id={workspace_id} />;
  } else {
    return <div>UNKNOWN TYPE</div>;
  }
};
