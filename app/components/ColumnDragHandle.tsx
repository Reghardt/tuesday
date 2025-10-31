import { useEffect, useRef, type FC } from "react";
import { dex } from "~/utils/dexie";

const ColumnDragHandle: FC<{ column_id: number }> = ({ column_id }) => {
  const startX = useRef(0);
  const startWidth = useRef(0);
  const width = useRef(0);
  const resizer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resizer.current?.addEventListener("mousedown", (e) => {
      //   const parentLeftOffset =
      //     resizer.current?.parentElement?.getBoundingClientRect().left ?? 0;

      const parent = resizer.current?.parentElement;
      if (!parent) return;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      startX.current = e.clientX;
      startWidth.current = parent.getBoundingClientRect().width;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX.current;
        const newWidth = Math.max(50, startWidth.current + deltaX); // clamp to minimum width if desired
        document.documentElement.style.setProperty(
          `--${column_id}`,
          `${newWidth}px`
        );
        width.current = newWidth;
      };

      const handleMouseUp = async () => {
        document.body.style.cursor = "default";
        document.body.style.userSelect = "";
        // await dex.column_widths.add({ id: column_id, width: width.current });
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", handleMouseMove);
    });
  }, []);

  return (
    <div
      ref={resizer}
      className="absolute w-[2px] cursor-col-resize bg-neutral-100  h-8 right-0 translate-x-[2px] z-1"
    ></div>
  );
};

export default ColumnDragHandle;
