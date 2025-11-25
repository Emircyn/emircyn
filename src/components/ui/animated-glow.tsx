import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGlowProps {
  className?: string;
}

export function AnimatedGlow({ className }: AnimatedGlowProps) {
  const [hue, setHue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHue((prev) => (prev + 1) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className={cn("absolute inset-0 z-[5] rounded-2xl", className)}
      style={{
        backgroundImage: `radial-gradient(circle at center, hsl(${hue}, 70%, 60%) 0%, transparent 70%)`,
        mixBlendMode: "multiply",
      }}
      animate={{
        opacity: [0.5, 0.7, 0.5],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

