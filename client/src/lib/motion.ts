/** Shared motion presets — use with Framer Motion; respect `prefers-reduced-motion` in callers. */
export const contentEase = [0.22, 1, 0.36, 1] as const;

export const contentTransition = {
  duration: 0.22,
  ease: contentEase,
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: contentTransition,
  },
};

export const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};
