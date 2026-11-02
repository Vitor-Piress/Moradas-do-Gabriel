import { type CSSProperties, type ReactNode } from "react";
import {
  useReducedMotion,
  useScrollReveal,
} from "../../hooks/useScrollReveal";

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

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = true,
}: RevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(once);
  const reducedMotion = useReducedMotion();
  const style = {
    "--motion-delay": `${reducedMotion ? 0 : delay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      data-motion-state={isVisible ? "visible" : "hidden"}
      data-motion-direction={direction}
      className={`motion-reveal ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return <div className={`motion-page-enter ${className}`}>{children}</div>;
}
