import { useMutation, useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useNavigate } from "react-router";
import type { z } from "zod";
import {
  dateColumnTypeCodec,
  numberColumnTypeCodec,
  peopleColumnTypeCodec,
  LabelColumnTypeCodec,
  textColumnTypeCodec,
  ZEGroupColumnTypes,
} from "~/enums/groupColumnTypes";
import type { ZGroupCellExtended } from "~/schemas/groups";
import { useTRPC } from "~/utils/trpc/trpc";

const TextCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
  const trpc = useTRPC();
  const useSetGroupCellContent = useMutation(trpc.cells.setCellContent.mutationOptions());

  return (
    <input
      onChange={(e) =>
        useSetGroupCellContent.mutate({
          row_id: cell.row_id,
          column_id: cell.column_id,
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
  const useSetGroupCellContent = useMutation(trpc.cells.setCellContent.mutationOptions());

  return (
    <input
      onChange={(e) =>
        useSetGroupCellContent.mutate({
          row_id: cell.row_id,
          column_id: cell.column_id,
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
  const useSetGroupCellContent = useMutation(trpc.cells.setCellContent.mutationOptions());

  return (
    <input
      onChange={(e) => {
        useSetGroupCellContent.mutate({
          row_id: cell.row_id,
          column_id: cell.column_id,
          content: { value: e.target.value },
        });
      }}
      className="p-1 focus:outline-hidden w-full"
      type="date"
      defaultValue={dateColumnTypeCodec.decode(cell.content) ?? undefined}
    />
  );
};

const LabelsCell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  board_id: number;
}> = ({ cell, board_id }) => {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const getCellQuery = useQuery({
    ...trpc.cells.getCell.queryOptions({
      column_id: cell.column_id,
      row_id: cell.row_id,
    }),
    initialData: cell,
    staleTime: 0,
  });

  const getLabelsQuery = useQuery(trpc.labels.getLabels.queryOptions({ column_id: cell.column_id }));

  let text = "No Label";
  let color = "#4a5565";

  const label_id = LabelColumnTypeCodec.decode(getCellQuery.data?.content);

  if (label_id !== null) {
    for (let i = 0; i < (getLabelsQuery.data?.length ?? 0); i++) {
      if (label_id === getLabelsQuery.data![i].id) {
        text = getLabelsQuery.data![i].name_;
        color = getLabelsQuery.data![i].color;
      }
    }
  }

  return (
    <button
      onClick={() => {
        navigate(`setCellLabel/${cell.column_id}/${cell.row_id}`);
      }}
      className="w-full h-full p-1"
      style={{ background: color }}
    >
      {text}
    </button>
  );
};

// const PriorityCell: FC<{
//   cell: z.infer<typeof ZGroupCellExtended>;
//   board_id: number;
// }> = ({ cell, board_id }) => {
//   const trpc = useTRPC();
//   const navigate = useNavigate();

//   const getCellQuery = useQuery({
//     ...trpc.cells.getCell.queryOptions({
//       column_id: cell.column_id,
//       row_id: cell.row_id,
//     }),
//     initialData: cell,
//     staleTime: 0,
//   });

//   const getPrioritiesQuery = useQuery(
//     trpc.priorities.getPriorities.queryOptions({
//       board_id,
//     })
//   );

//   let text = "No Status";
//   let color = "#4a5565";

//   const priority_id = priorityColumnTypeCodec.decode(getCellQuery.data?.content);

//   if (priority_id !== null) {
//     for (let i = 0; i < (getPrioritiesQuery.data?.length ?? 0); i++) {
//       if (priority_id === getPrioritiesQuery.data![i].id) {
//         text = getPrioritiesQuery.data![i].name_;
//         color = getPrioritiesQuery.data![i].color;
//       }
//     }
//   }

//   return (
//     <button
//       onClick={() => {
//         navigate(`setCellPriority/${cell.column_id}/${cell.row_id}`);
//       }}
//       className="w-full h-full p-1"
//       style={{ background: color }}
//     >
//       {text}
//     </button>
//   );
// };

const PeopleCell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  board_id: number;
}> = ({ cell, board_id }) => {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const getCellQuery = useQuery({
    ...trpc.cells.getCell.queryOptions({
      column_id: cell.column_id,
      row_id: cell.row_id,
    }),
    initialData: cell,
    staleTime: 0,
  });

  const getUsersQuery = useQuery(trpc.users.getUsers.queryOptions());

  const user_names: string[] = [];
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

  return (
    <button
      onClick={() => {
        navigate(`setCellPeople/${cell.column_id}/${cell.row_id}`);
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

const UpdatesCell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  board_id: number;
}> = ({ cell, board_id }) => {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const getCellQuery = useQuery({
    ...trpc.cells.getCell.queryOptions({
      column_id: cell.column_id,
      row_id: cell.row_id,
    }),
    initialData: cell,
    staleTime: 0,
  });

  return (
    <button
      onClick={() => {
        navigate(`updates/${cell.column_id}/${cell.row_id}`);
      }}
      className="w-full h-full p-1"
    >
      {getCellQuery.data.content.updates}
    </button>
  );
};

const FilesCell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  board_id: number;
}> = ({ cell, board_id }) => {
  const trpc = useTRPC();
  const navigate = useNavigate();

  const getCellQuery = useQuery({
    ...trpc.cells.getCell.queryOptions({
      column_id: cell.column_id,
      row_id: cell.row_id,
    }),
    initialData: cell,
    staleTime: 0,
  });

  return (
    <button
      onClick={() => {
        navigate(`files/${cell.column_id}/${cell.row_id}`);
      }}
      className="w-full h-full p-1"
    >
      {getCellQuery.data.content.file_count}
    </button>
  );
};

export const Cell: FC<{
  cell: z.infer<typeof ZGroupCellExtended>;
  board_id: number;
}> = ({ cell, board_id }) => {
  if (cell.column_type === ZEGroupColumnTypes.enum.text) {
    return <TextCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.number_) {
    return <NumberCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.date) {
    return <DateCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.label) {
    return <LabelsCell cell={cell} board_id={board_id} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.people) {
    return <PeopleCell cell={cell} board_id={board_id} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.updates) {
    return <UpdatesCell cell={cell} board_id={board_id} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.file) {
    return <FilesCell cell={cell} board_id={board_id} />;
  } else {
    return <div>UNKNOWN TYPE</div>;
  }
};
