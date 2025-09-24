import axios from "axios";
import { useState } from "react";

export default function Component() {
  const [fileList, setFileList] = useState<FileList | null>(null);

  async function postData() {
    await axios.postForm(
      "http://localhost:5173/api/upload",
      {
        testField: "hello",
        files: Array.from(fileList ?? []),
      },
      {
        onUploadProgress: (progress) => {
          console.log(progress.total);
        },
      }
    );
  }

  return (
    <div>
      <div>Test</div>
      <div className="flex flex-col gap-2">
        <input
          multiple
          type="file"
          onChange={(e) => setFileList(e.target.files)}
        ></input>
        <button
          onClick={() => {
            postData();
          }}
        >
          Press
        </button>
      </div>
    </div>
  );
}
