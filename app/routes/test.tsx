import { useEffect, useRef, useState } from "react";

export default function Component() {
  const resizer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resizer.current?.addEventListener("mousedown", (e) => {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (e: MouseEvent) => {
        document.documentElement.style.setProperty(
          `--test-width`,
          `${e.clientX}px`
        );
      };

      const handleMouseUp = () => {
        document.body.style.cursor = "default";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mousemove", handleMouseMove);
    });
  }, []);

  return (
    <div className="flex">
      <div
        style={{ width: "var(--test-width, 100px)" }}
        className="bg-neutral-400  min-w-10 max-w-60 relative"
      >
        Content
        <div
          ref={resizer}
          className=" absolute top-0 right-0 w-1 cursor-col-resize bg-gray-300 h-full"
        ></div>
      </div>
      <div>Hello2</div>
    </div>
  );
}
