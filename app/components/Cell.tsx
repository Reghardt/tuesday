import { useMutation } from "@tanstack/react-query";
import type { FC } from "react";
import type { z } from "zod";
import { numberColumnTypeCodec, textColumnTypeCodec, ZEGroupColumnTypes } from "~/enums/groupColumnTypes";
import type { ZGroupCellExtended } from "~/schemas/groups";
import { useTRPC } from "~/utils/trpc/trpc";

export const TextCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
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
      className="p-1 focus:outline-hidden"
      type="text"
      defaultValue={textColumnTypeCodec.decode(cell.content)}
    />
  );
};

export const NumberCell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
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
      className="p-1 focus:outline-hidden"
      type="number"
      defaultValue={numberColumnTypeCodec.decode(cell.content)}
    />
  );
};

export const Cell: FC<{ cell: z.infer<typeof ZGroupCellExtended> }> = ({ cell }) => {
  if (cell.column_type === ZEGroupColumnTypes.enum.text) {
    return <TextCell cell={cell} />;
  } else if (cell.column_type === ZEGroupColumnTypes.enum.number_) {
    return <NumberCell cell={cell} />;
  } else {
    return <div>UNKNOWN TYPE</div>;
  }
};
