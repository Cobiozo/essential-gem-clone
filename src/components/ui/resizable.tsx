import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      // Zwiększona szerokość dotyku (16px) + touch-manipulation
      "relative flex w-4 items-center justify-center touch-manipulation",
      // Kolory i przejścia
      "bg-border/50 hover:bg-primary/20 active:bg-primary/40",
      "transition-all duration-150 cursor-col-resize",
      // Niewidoczny dodatkowy obszar dotyku (12px po każdej stronie = 40px+ całkowity)
      "before:absolute before:inset-y-0 before:-left-3 before:-right-3 before:content-['']",
      // Wizualna linia
      "after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-border/60",
      // Obsługa pionowa
      "data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:cursor-row-resize",
      "data-[panel-group-direction=vertical]:before:inset-x-0 data-[panel-group-direction=vertical]:before:-top-3 data-[panel-group-direction=vertical]:before:-bottom-3",
      "data-[panel-group-direction=vertical]:before:left-0 data-[panel-group-direction=vertical]:before:right-0",
      "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2",
      "data-[panel-group-direction=vertical]:after:h-0.5 data-[panel-group-direction=vertical]:after:w-full",
      "data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
      // Focus
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-12 w-6 items-center justify-center rounded-md border bg-muted shadow-md hover:bg-accent active:scale-105 transition-all touch-manipulation">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
