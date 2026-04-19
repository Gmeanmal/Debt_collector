import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            "bg-bg-elev border border-line rounded-[10px] shadow-md text-text font-sans data-[type=success]:border-l-2 data-[type=success]:border-l-ok-ink data-[type=error]:border-l-2 data-[type=error]:border-l-bad-ink data-[type=warning]:border-l-2 data-[type=warning]:border-l-warn-ink",
          description: "text-text-mute",
          actionButton: "bg-accent-trace text-accent-deep",
          cancelButton: "bg-bg-inset text-text-mute",
        },
      }}
    />
  );
}
