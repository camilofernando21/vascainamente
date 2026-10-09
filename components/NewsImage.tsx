"use client";

import Image from "next/image";
import { useState } from "react";
import { CruzMalta } from "@/components/ui/cruz-malta";
import { cn } from "@/lib/utils";

// Hosts allowed for optimization in next.config (images.remotePatterns). Keep both lists in sync.
const OPTIMIZED_HOSTS = [/(^|\.)glbimg\.com$/, /^trivela\.com\.br$/, /^i\.ytimg\.com$/];

function isOptimizable(src: string): boolean {
  try {
    const { protocol, hostname } = new URL(src);
    return protocol === "https:" && OPTIMIZED_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

/**
 * External news/video image filling its (positioned) parent. Unknown hosts are served unoptimized
 * instead of erroring, and a failed load shows a neutral panel with the Maltese cross, never a broken icon.
 */
export default function NewsImage({
  src,
  alt = "",
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="vm-img-fallback" aria-hidden="true">
        <CruzMalta size="28%" opacity={0.15} />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized={!isOptimizable(src)}
      className={cn("vm-img", className)}
      onError={() => setFailed(true)}
    />
  );
}
