import path from "path";
import z from "zod";
import { readFile } from "fs/promises";
import { getStoragePathForCellFile } from "~/schemas/cell_files";
import { withTransaction } from "~/utils/pool.server";
import type { Route } from "./+types/get_update_file.$update_id.$disposition.$name";
import { getStoragePathForUpdateFile } from "~/schemas/update_files";

export async function loader({ request, params }: Route.LoaderArgs) {
  const update_id = z.coerce.number().parse(params.update_id);
  const disposition = z.string().parse(params.disposition);
  const name = z.string().parse(params.name);

  const filePath = await withTransaction(async (client) =>
    path.join(
      process.cwd(),
      "uploads",
      await getStoragePathForUpdateFile(client, { update_id }),
      name
    )
  );

  try {
    const fileBuffer = await readFile(filePath);

    const ext = path.extname(name).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    if (ext === ".png") contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${name}"`,
      },
    });
  } catch (err) {
    throw new Response("File not found", { status: 404 });
  }
}
