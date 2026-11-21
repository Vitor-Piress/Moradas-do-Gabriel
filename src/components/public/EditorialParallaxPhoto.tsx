import { useReducedMotion, useScroll, useTransform, m } from "motion/react";
import { useRef } from "react";
import { EditorialCurtain } from "./Motion";
import { SmoothImage } from "./SmoothImage";

interface EditorialParallaxPhotoProps {
  src: string;
  alt: string;
}

export function EditorialParallaxPhoto({
  src,
  alt,
}: EditorialParallaxPhotoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <div ref={containerRef} className="w-full">
      <EditorialCurtain className="rounded-2xl overflow-hidden bg-brand-surface border border-brand-navy/10">
        <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden bg-brand-surface">
          <m.div
            style={prefersReducedMotion ? undefined : { y }}
            className="absolute -inset-y-[10%] inset-x-0"
          >
            <SmoothImage
              src={src}
              alt={alt}
              containerClassName="relative w-full h-full overflow-hidden"
              className="w-full h-full object-cover"
            />
          </m.div>
        </div>
      </EditorialCurtain>
    </div>
  );
}
