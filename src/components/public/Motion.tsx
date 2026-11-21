import { m, useReducedMotion } from "motion/react";
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

interface MaskedLineProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}

interface EditorialCurtainProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

interface HorizonDividerProps {
  className?: string;
}

const DIRECTION_OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 20 },
  left: { x: 16, y: 0 },
  right: { x: -16, y: 0 },
  none: { x: 0, y: 0 },
};

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = true,
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const offset = DIRECTION_OFFSETS[direction];

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

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
        duration: 0.62,
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
      transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function MaskedLine({
  children,
  className = "",
  delay = 0,
  inView = false,
}: MaskedLineProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  // Padding inferior negativo compensado evita cortar descendentes (g, p, q, ç) durante o recorte
  return (
    <div className={`overflow-hidden pb-[0.1em] -mb-[0.1em] ${className}`}>
      <m.div
        initial={{ y: "106%", opacity: 0 }}
        animate={inView ? undefined : { y: "0%", opacity: 1 }}
        whileInView={inView ? { y: "0%", opacity: 1 } : undefined}
        viewport={inView ? { once: true, amount: 0.1 } : undefined}
        transition={{
          duration: 0.68,
          delay: delay / 1000,
          ease: EASE_OUT_EXPO,
        }}
      >
        {children}
      </m.div>
    </div>
  );
}

export function EditorialCurtain({
  children,
  className = "",
  delay = 0,
}: EditorialCurtainProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      initial={{
        opacity: 0.4,
        clipPath: "inset(12% 0% 0% 0% round 16px)",
      }}
      whileInView={{
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0% round 16px)",
      }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.85,
        delay: delay / 1000,
        ease: EASE_OUT_EXPO,
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function StaggerGroup({
  children,
  className = "",
  staggerMs = 85,
}: StaggerGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerMs / 1000,
          },
        },
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, className = "" }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y: 22 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.58,
            ease: EASE_OUT_EXPO,
          },
        },
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function HorizonDivider({ className = "" }: HorizonDividerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div aria-hidden="true" className={`h-px bg-brand-navy/12 ${className}`} />;
  }

  return (
    <m.div
      aria-hidden="true"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.78, ease: EASE_OUT_EXPO }}
      className={`h-px bg-brand-navy/12 origin-left ${className}`}
    />
  );
}
