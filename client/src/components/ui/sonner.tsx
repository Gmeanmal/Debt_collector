import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "luxe-surface !rounded-md !border-base-border !text-base-text font-sans",
          description: "!text-base-text-muted",
          actionButton: "!bg-pink-primary !text-pink-foreground",
          cancelButton: "!bg-base-surface-raised !text-base-text-muted",
        },
      }}
    />
  );
}
