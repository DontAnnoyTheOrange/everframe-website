"use client";

import Image from "next/image";
import { cloudinaryUrl } from "@/lib/cloudinary/url";

// A Cloudinary photo that picks the right size for each screen. Width and height are the real
// photo's, so the page does not jump while pictures load.
export default function CloudImage({
  cloud,
  publicId,
  width,
  height,
  alt,
  sizes,
  priority,
  className,
}: {
  cloud: string;
  publicId: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      loader={({ src, width: w }) => cloudinaryUrl(cloud, src, w)}
      src={publicId}
      width={width}
      height={height}
      alt={alt}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}