import { Modal } from "@/components/ui/Modal";

interface ProofLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ProofLightbox({ src, alt, onClose }: ProofLightboxProps) {
  return (
    <Modal title="Payment proof" onClose={onClose} size="xl">
      <div className="flex items-center justify-center bg-bg-sunken/40 rounded-[6px] p-2">
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="max-w-[90vw] max-h-[80vh] object-contain rounded-[6px]"
        />
      </div>
    </Modal>
  );
}
