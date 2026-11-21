import { m } from "motion/react";
import type { ReactNode } from "react";

type RevealDirection = "up" | "left" | "right" | "none";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  once?: boolean;
}

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const DIRECTION_OFFSETS: Record<
  RevealDirection,
  { x: number; y: number; scale: number }
> = {
  up: { x: 0, y: 26, scale: 0.988 },
  left: { x: 18, y: 0, scale: 1 },
  right: { x: -18, y: 0, scale: 1 },
  none: { x: 0, y: 0, scale: 1 },
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = true,
}: RevealProps) {
  const offset = DIRECTION_OFFSETS[direction];

  return (
    <m.div
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
        scale: offset.scale,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }}
      viewport={{ once, amount: 0.08 }}
      transition={{
        duration: 0.68,
        delay: delay / 1000,
        ease: EASE_OUT_EXPO,
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </m.div>
  );
}
