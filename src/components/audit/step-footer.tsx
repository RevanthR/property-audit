import { cn } from "@/lib/utils";

export function StepFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 bg-white border-t border-gray-100",
        "-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mt-4",
        "flex items-center justify-between gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}
