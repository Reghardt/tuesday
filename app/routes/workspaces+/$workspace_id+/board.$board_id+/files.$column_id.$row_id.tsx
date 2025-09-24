import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect, useNavigate, useRevalidator } from "react-router";
import { useTRPC } from "~/utils/trpc/trpc";
import { useRef, useState, type FC, type JSX } from "react";
import { getSessionUser } from "~/utils/auth.server";
import CloseIcon from "~/components/icons/CloseIcon";
import axios from "axios";
import { getCellFiles } from "~/schemas/cell_files";
import { withTransaction } from "~/utils/pool.server";
import type { Route } from "./+types/files.$column_id.$row_id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (user === null) throw redirect("");

  const files = await withTransaction(
    async (client) =>
      await getCellFiles(client, {
        column_id: Number(params.column_id),
        row_id: Number(params.row_id),
      })
  );

  return { user_id: user.id, files };
}

export default function Component({
  params,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);

  function setFilesOnChange(fileList: FileList | null) {
    const files: File[] = [];
    if (fileList) for (const file of fileList) files.push(file);
    setFiles(files);
  }

  async function getCellFile(
    workspace_id: number,
    board_id: number,
    column_id: number,
    row_id: number,
    name: string
  ) {
    const res = await axios.postForm(
      "http://localhost:5173/api/get_cell_file",
      { workspace_id, board_id, column_id, row_id, name },
      { responseType: "blob" }
    );

    const contentDisposition = res.headers["content-disposition"];
    let filename = name;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) {
        filename = match[1];
      }
    }

    const fileURL = URL.createObjectURL(res.data);

    // 3a. Open in a new tab
    window.open(fileURL);

    // // 3b. Or trigger download with correct filename
    // const a = document.createElement("a");
    // a.href = fileURL;
    // a.download = filename;
    // document.body.appendChild(a);
    // a.click();
    // a.remove();

    // 4. Cleanup blob URL after usage
    URL.revokeObjectURL(fileURL);
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      {/* Centered modal */}
      <div className="w-full max-w-2xl h-[80%] bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-neutral-800"
          >
            <CloseIcon className=" text-red-600 " />
          </button>
        </div>

        <div>
          {loaderData.files.map((file) => {
            return (
              <div key={file.id}>
                <div>{file.name_}</div>
                <button
                  onClick={async () =>
                    await getCellFile(
                      Number(params.workspace_id),
                      Number(params.board_id),
                      Number(params.column_id),
                      Number(params.row_id),
                      file.name_
                    )
                  }
                >
                  Get
                </button>
              </div>
            );
          })}
        </div>

        <div>
          <label htmlFor="file">Select Files</label>
          <input
            onChange={(e) => setFilesOnChange(e.target.files)}
            className="hidden"
            id="file"
            type="file"
            multiple
          />

          {files.length ? (
            <table>
              <tbody>
                {files.map((file) => {
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
}> = ({ file, storage_path }) => {
  const revalidator = useRevalidator();

  const [uploadProgress, setUploadProgress] = useState(0);

  async function uploadDocument() {
    const res = await axios.postForm(
      "http://localhost:5173/api/upload",
      {
        file: file,
        workspace_id: storage_path.workspace_id,
        board_id: storage_path.board_id,
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
    revalidator.revalidate();
  }

  return (
    <tr>
      <td>{file.name}</td>
      <td>
        <button className="bg-blue-500 p-2" onClick={() => uploadDocument()}>
          Upload
        </button>
      </td>
      <td>{uploadProgress}</td>
    </tr>
  );
};
