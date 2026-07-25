"use client";

import { useMemo } from "react";

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

export default function Stars() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: (index * 37) % 100,
        top: (index * 61) % 100,
        size: 1 + (index % 3),
        delay: (index % 8) * 0.35,
        duration: 2.4 + (index % 5) * 0.45,
        opacity: 0.35 + (index % 6) * 0.1,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}