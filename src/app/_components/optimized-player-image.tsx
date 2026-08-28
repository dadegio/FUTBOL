import Image from "next/image";
import type { CSSProperties } from "react";

function canUseNextImage(src: string) {
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export default function OptimizedPlayerImage({
  src,
  alt,
  sizes,
  className,
  style,
  eager = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  if (!canUseNextImage(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      style={style}
      priority={eager}
    />
  );
}
