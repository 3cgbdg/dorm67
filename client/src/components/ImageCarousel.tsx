import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "https://placehold.co/800x600?text=No+Image";

type Props = {
  images: string[];
  alt: string;
};

export function ImageCarousel({ images, alt }: Props) {
  const src = images.length > 0 ? images : [PLACEHOLDER];
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  function navigate(dir: 1 | -1) {
    setDirection(dir);
    setLoaded(false);
    setIndex((prev) => (prev + dir + src.length) % src.length);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") navigate(-1);
    if (e.key === "ArrowRight") navigate(1);
  }

  // Touch/swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) navigate(delta > 0 ? 1 : -1);
    touchStartX.current = null;
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  // Preload adjacent images
  const prevSrc = src[(index - 1 + src.length) % src.length];
  const nextSrc = src[(index + 1) % src.length];

  return (
    <div
      className="relative select-none overflow-hidden rounded-md bg-muted"
      role="group"
      aria-label={`Image gallery for ${alt}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hidden preload links */}
      {src.length > 1 && (
        <>
          <link rel="preload" as="image" href={prevSrc} />
          <link rel="preload" as="image" href={nextSrc} />
        </>
      )}

      {/* Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 z-10 animate-pulse bg-muted" />
      )}

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.img
          key={index}
          src={src[index]}
          alt={`${alt} — image ${index + 1} of ${src.length}`}
          className="h-72 w-full object-cover"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeInOut" }}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </AnimatePresence>

      {/* Counter */}
      {src.length > 1 && (
        <span className="absolute right-3 top-3 z-20 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {index + 1} / {src.length}
        </span>
      )}

      {/* Navigation buttons */}
      {src.length > 1 && (
        <>
          <button
            onClick={() => navigate(-1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {src.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {src.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 1 : -1); setLoaded(false); setIndex(i); }}
              aria-label={`Go to image ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
