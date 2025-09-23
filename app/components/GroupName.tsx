import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useState } from "react";
import { useTRPC } from "~/utils/trpc/trpc";
import ConfirmDialog from "~/components/ConfirmDialog";

const GroupName: FC<{ group_id: number; name: string }> = ({ group_id, name }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const setGroupNameMutation = useMutation(trpc.groups.setGroupName.mutationOptions());
  const deleteGroupMutation = useMutation(
    trpc.groups.deleteGroup.mutationOptions({
      onSuccess: () => {
        // refresh groups lists globally
        queryClient.invalidateQueries({ queryKey: trpc.groups.getGroups.queryKey() });
        setConfirmOpen(false);
      },
    })
  );
  return (
    <div className="flex items-center gap-2">
      <input
        className="text-lg p-1 focus:outline-hidden"
        onChange={(e) => setGroupNameMutation.mutate({ id: group_id, name_: e.target.value })}
        defaultValue={name}
      ></input>
      <button
        type="button"
        className="text-sm text-red-400 hover:text-red-300"
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete group?"
        description="This will remove the group and all of its rows and cells. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteGroupMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => deleteGroupMutation.mutate({ id: group_id })}
      />
    </div>
  );
};

export default GroupName;
