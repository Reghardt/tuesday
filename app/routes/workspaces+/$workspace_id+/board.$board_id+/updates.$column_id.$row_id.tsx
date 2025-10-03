import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect, useNavigate } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { useState, type FC } from "react";
import { getSessionUser } from "~/utils/auth.server";
import type { Route } from "./+types/updates.$column_id.$row_id";
import CloseIcon from "~/components/icons/CloseIcon";
import axios from "axios";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (user === null) throw redirect("");
  return { user_id: user.id };
}

export default function Component({
  params,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const trpc = useTRPC();

  const [uploadsQueue, setUploadsQueue] = useState<File[]>([]);

  function setUploadsQueueOnChange(fileList: FileList | null) {
    const files: File[] = [];
    if (fileList) for (const file of fileList) files.push(file);
    setUploadsQueue(files);
  }

  function removeFileFromUploadsQueue(name: string) {
    setUploadsQueue((prev) => prev.filter((file) => file.name !== name));
  }

  const getUpdatesQuery = useQuery(
    trpc.updates.getUpdates.queryOptions({
      row_id: Number(params.row_id),
      column_id: Number(params.column_id),
    })
  );

  const getLatestDraftUpdateQuery = useQuery(
    trpc.updates.getLatestDraftUpdate.queryOptions({
      column_id: Number(params.column_id),
      row_id: Number(params.row_id),
      user_id: loaderData.user_id,
      has_recursion_occurred: false, // this arg is ignored if received from the client
    })
  );

  const setDraftUpdateNoteMutation = useMutation(
    trpc.updates.setDraftUpdateNote.mutationOptions()
  );

  const publishDraftUpdateMutation = useMutation(
    trpc.updates.publishDraftUpdate.mutationOptions({
      onSuccess: async (_, __, ___, context) => {
        context.client.invalidateQueries({
          queryKey: trpc.updates.getUpdates.queryKey({
            row_id: Number(params.row_id),
            column_id: Number(params.column_id),
          }),
        });

        context.client.invalidateQueries({
          queryKey: trpc.updates.getLatestDraftUpdate.queryKey({
            row_id: Number(params.row_id),
            column_id: Number(params.column_id),
            user_id: loaderData.user_id,
          }),
        });

        context.client.invalidateQueries({
          queryKey: trpc.cells.getCell.queryKey({
            row_id: Number(params.row_id),
            column_id: Number(params.column_id),
          }),
        });
      },
    })
  );

  // const createUpdateMutation = useMutation(
  //   trpc.updates.createUpdate.mutationOptions({
  //     onSuccess: () => {

  //       setNote("");
  //       queryClient.invalidateQueries({
  //         queryKey: trpc.cells.getCell.queryKey({
  //           row_id: Number(params.row_id),
  //           column_id: Number(params.column_id),
  //         }),
  //       });
  //     },
  //   })
  // );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl h-[80%] bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Updates</h2>
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-neutral-800"
          >
            <CloseIcon className=" text-red-600 " />
          </button>
        </div>

        {/* Updates list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {getUpdatesQuery.data?.map((update) => (
            <div key={update.id}>
              <div className="border border-neutral-700 rounded-lg p-3 bg-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-white">
                    {update.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(update.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-line">
                  {update.note}
                </p>
              </div>

              {update.files ? (
                <>
                  {update.files.map((file) => {
                    return (
                      <div key={file.id} className="flex gap-2 text-xs">
                        <div>{file.name_}</div>
                        <a
                          className="bg-blue-500 w-fit p-1 rounded"
                          href={`http://localhost:5173/api/get_update_file/${file.update_id}/inline/${file.name_}`}
                          target="_blank"
                        >
                          Open
                        </a>
                        <a
                          className="bg-blue-500 w-fit p-1 rounded"
                          href={`http://localhost:5173/api/get_update_file/${file.update_id}/attachment/${file.name_}`}
                          target="_blank"
                        >
                          Download
                        </a>
                      </div>
                    );
                  })}
                </>
              ) : (
                <></>
              )}
            </div>
          ))}
        </div>

        {getLatestDraftUpdateQuery.data !== undefined ? (
          <div
            className="border-t border-neutral-700 px-4 py-3 bg-neutral-900"
            key={getLatestDraftUpdateQuery.data.id}
          >
            <textarea
              onChange={(e) => {
                setDraftUpdateNoteMutation.mutate({
                  row_id: getLatestDraftUpdateQuery.data.row_id,
                  column_id: getLatestDraftUpdateQuery.data.column_id,
                  user_id: loaderData.user_id,
                  note: e.target.value,
                });
              }}
              defaultValue={getLatestDraftUpdateQuery.data.note}
              placeholder="Write an update..."
              className="w-full border border-neutral-700 bg-neutral-800 text-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring focus:ring-blue-500/30"
              rows={3}
            />

            {getLatestDraftUpdateQuery.data.files ? (
              <>
                {getLatestDraftUpdateQuery.data.files.map((file) => {
                  return <div key={file.id}>{file.name_}</div>;
                })}
              </>
            ) : (
              <></>
            )}

            <div>
              <label htmlFor="file" className=" bg-blue-700 p-1 rounded">
                Select Files
              </label>
              <input
                onChange={(e) => setUploadsQueueOnChange(e.target.files)}
                className="hidden"
                id="file"
                type="file"
                multiple
              />
              {uploadsQueue.length ? (
                <table>
                  <tbody>
                    {uploadsQueue.map((file) => {
                      return (
                        <UploadFileComponent
                          key={file.name}
                          file={file}
                          column_id={Number(params.column_id)}
                          row_id={Number(params.row_id)}
                          user_id={loaderData.user_id}
                          storage_path={{
                            update_id: String(
                              getLatestDraftUpdateQuery.data.id
                            ),
                          }}
                          removeFileFromUploadsQueue={
                            removeFileFromUploadsQueue
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <></>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() =>
                  publishDraftUpdateMutation.mutate({
                    row_id: Number(params.row_id),
                    column_id: Number(params.column_id),
                    user_id: loaderData.user_id,
                  })
                }
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

const UploadFileComponent: FC<{
  file: File;
  storage_path: {
    update_id: string;
  };
  row_id: number;
  column_id: number;
  user_id: string;
  removeFileFromUploadsQueue(name: string): void;
}> = ({
  file,
  storage_path,
  column_id,
  row_id,
  user_id,
  removeFileFromUploadsQueue,
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function uploadDocument() {
    setIsUploading(true);
    await axios.postForm(
      "http://localhost:5173/api/upload_update_file",
      {
        file: file,
        update_id: storage_path.update_id,
        note: "Hello",
      },
      {
        onUploadProgress: (progress) => {
          console.log(progress.progress);
          if (progress.progress !== undefined) {
            setUploadProgress(Math.trunc(progress.progress * 100));
          }
        },
      }
    );
    queryClient.invalidateQueries({
      queryKey: trpc.updates.getLatestDraftUpdate.queryKey({
        column_id: Number(column_id),
        row_id: Number(row_id),
        user_id: user_id,
        has_recursion_occurred: false,
      }),
    });
    removeFileFromUploadsQueue(file.name);
  }

  return (
    <tr>
      <td>{file.name}</td>

      {isUploading ? (
        <td>{uploadProgress}</td>
      ) : (
        <button className="bg-blue-500 p-2" onClick={() => uploadDocument()}>
          Upload
        </button>
      )}
    </tr>
  );
};
