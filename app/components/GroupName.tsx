import { useMutation, useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useTRPC } from "~/utils/trpc/trpc";

const GroupName: FC<{ group_id: number; name: string }> = ({ group_id, name }) => {
  const trpc = useTRPC();

  const setGroupNameMutation = useMutation(trpc.groups.setGroupName.mutationOptions());
  return (
    <div className="flex items-center">
      <input
        className="text-lg p-1 focus:outline-hidden"
        onChange={(e) => setGroupNameMutation.mutate({ id: group_id, name_: e.target.value })}
        defaultValue={name}
      ></input>
    </div>
  );
};

export default GroupName;
