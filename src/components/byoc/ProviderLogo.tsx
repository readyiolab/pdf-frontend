import { cn } from "@/lib/utils";
import type { ProviderLogoId } from "./motion";

const LOGO_SRC: Record<ProviderLogoId, string> = {
  AWS: "/brands/aws.svg",
  Azure: "/brands/azure.svg",
  R2: "/brands/cloudflare.svg",
  GCS: "/brands/googlecloud.svg",
  MinIO: "/brands/minio.svg",
};

const LOGO_ALT: Record<ProviderLogoId, string> = {
  AWS: "Amazon Web Services",
  Azure: "Microsoft Azure",
  R2: "Cloudflare",
  GCS: "Google Cloud",
  MinIO: "MinIO",
};

interface ProviderLogoProps {
  id: ProviderLogoId;
  className?: string;
}

/** Official brand mark from /public/brands (Simple Icons, brand-colored). */
export function ProviderLogo({ id, className }: ProviderLogoProps) {
  return (
    <img
      src={LOGO_SRC[id]}
      alt={LOGO_ALT[id]}
      width={20}
      height={20}
      className={cn("h-5 w-5 shrink-0 object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
