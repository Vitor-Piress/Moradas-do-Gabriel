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

const DIRECTION_OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 12 },
  left: { x: 14, y: 0 },
  right: { x: -14, y: 0 },
  none: { x: 0, y: 0 },
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

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
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once, amount: 0.08 }}
      transition={{
        duration: 0.48,
        delay: delay / 1000,
        ease: EASE_OUT,
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
      transition={{ duration: 0.36, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </m.div>
  );
}
