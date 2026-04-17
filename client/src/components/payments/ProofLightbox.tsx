import { Modal } from "@/components/ui/Modal";

interface ProofLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ProofLightbox({ src, alt, onClose }: ProofLightboxProps) {
  return (
    <Modal title="Payment proof" onClose={onClose} size="xl">
      <div className="flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          decoding="async"
          className="max-w-[90vw] max-h-[85vh] object-contain rounded"
        />
      </div>
    </Modal>
  );
}
