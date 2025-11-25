import { motion, useMotionValue, useMotionTemplate, animate } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGlowProps {
  className?: string;
}

export function AnimatedGlow({ className }: AnimatedGlowProps) {
  const colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"];
  const color = useMotionValue(colors[0]);
  const backgroundImage = useMotionTemplate`radial-gradient(circle at center, ${color} 0%, transparent 70%)`;

  useEffect(() => {
    animate(color, colors, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
  }, []);

  return (
    <motion.div
      className={cn("absolute inset-0 z-[5] rounded-2xl", className)}
      style={{
        backgroundImage,
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

