import { redirect, useNavigate } from "react-router";
import { Fragment, useState, type FC } from "react";
import { getSessionUser } from "~/utils/auth.server";
import CloseIcon from "~/components/icons/CloseIcon";
import axios from "axios";
import type { Route } from "./+types/files.$column_id.$row_id";
import { useTRPC } from "~/utils/trpc/trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  const deleteCellFileMutation = useMutation(
    trpc.cellFiles.deleteCellFile.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.cellFiles.getCellFiles.queryKey({
            column_id: Number(params.column_id),
            row_id: Number(params.row_id),
          }),
        });
      },
    })
  );

  const getCellFilesQuery = useQuery(
    trpc.cellFiles.getCellFiles.queryOptions({
      column_id: Number(params.column_id),
      row_id: Number(params.row_id),
    })
  );

  const [uploadsQueue, setUploadsQueue] = useState<File[]>([]);

  function setUploadsQueueOnChange(fileList: FileList | null) {
    const files: File[] = [];
    if (fileList) for (const file of fileList) files.push(file);
    setUploadsQueue(files);
  }

  function removeFileFromUploadsQueue(name: string) {
    setUploadsQueue((prev) => prev.filter((file) => file.name !== name));
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl h-[80%] bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-neutral-800"
          >
            <CloseIcon className=" text-red-600 " />
          </button>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-[20em_5em_10em] items-center gap-2">
            {getCellFilesQuery.data?.map((file) => {
              return (
                <Fragment key={file.id}>
                  <div className="truncate">{file.name_}</div>
                  <div>{new Date(file.created_at).toLocaleDateString()}</div>
                  <div className="flex gap-2">
                    <a
                      className="bg-blue-500 w-fit p-1 rounded"
                      href={`http://localhost:5173/api/get_cell_file/${params.column_id}/${params.row_id}/inline/${file.name_}`}
                      target="_blank"
                    >
                      Open
                    </a>
                    <a
                      className="bg-blue-500 w-fit p-1 rounded"
                      href={`http://localhost:5173/api/get_cell_file/${params.column_id}/${params.row_id}/attachment/${file.name_}`}
                      target="_blank"
                    >
                      Download
                    </a>
                    <button
                      className="bg-red-800 rounded p-1"
                      onClick={() => {
                        deleteCellFileMutation.mutate({
                          name_: file.name_,
                          cell_file_id: file.id,
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </Fragment>
              );
            })}
          </div>

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
                        storage_path={{
                          workspace_id: params.workspace_id,
                          board_id: params.board_id,
                          column_id: params.column_id,
                          row_id: params.row_id,
                        }}
                        removeFileFromUploadsQueue={removeFileFromUploadsQueue}
                      />
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const UploadFileComponent: FC<{
  file: File;
  storage_path: {
    workspace_id: string;
    board_id: string;
    column_id: string;
    row_id: string;
  };
  removeFileFromUploadsQueue(name: string): void;
}> = ({ file, storage_path, removeFileFromUploadsQueue }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function uploadDocument() {
    setIsUploading(true);
    await axios.postForm(
      "http://localhost:5173/api/upload",
      {
        file: file,
        column_id: storage_path.column_id,
        row_id: storage_path.row_id,
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
      queryKey: trpc.cellFiles.getCellFiles.queryKey({
        column_id: Number(storage_path.column_id),
        row_id: Number(storage_path.row_id),
      }),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.cells.getCell.queryKey({
        column_id: Number(storage_path.column_id),
        row_id: Number(storage_path.row_id),
      }),
    });
    removeFileFromUploadsQueue(file.name);
  }

  return (
    <tr>
      <td>{file.name}</td>
      <td>
        {isUploading ? (
          <td>{uploadProgress}</td>
        ) : (
          <button className="bg-blue-500 p-2" onClick={() => uploadDocument()}>
            Upload
          </button>
        )}
      </td>
    </tr>
  );
};
