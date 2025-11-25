"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AnimatedThemeTogglerProps {
  duration?: number
}

export function AnimatedThemeToggler({
  duration = 400,
}: AnimatedThemeTogglerProps = {}) {
  const [theme, setThemeState] = useState<"theme-light" | "dark" | "system">(
    "theme-light"
  )
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme")
    
    if (savedTheme === "system") {
      setThemeState("system")
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
      setIsDark(systemPrefersDark)
      document.documentElement.classList.toggle("dark", systemPrefersDark)
    } else if (savedTheme === "dark" || savedTheme === "light") {
      const isDarkMode = savedTheme === "dark"
      setThemeState(isDarkMode ? "dark" : "theme-light")
      setIsDark(isDarkMode)
      document.documentElement.classList.toggle("dark", isDarkMode)
    } else {
      // Default: check current state
      const darkMode = document.documentElement.classList.contains("dark")
      setIsDark(darkMode)
      setThemeState(darkMode ? "dark" : "theme-light")
    }
  }, [])

  useEffect(() => {
    // Listen for system preference changes when theme is "system"
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        setIsDark(e.matches)
        document.documentElement.classList.toggle("dark", e.matches)
      }
    }

    if (theme === "system") {
      mediaQuery.addEventListener("change", handleSystemThemeChange)
    }

    // Listen for DOM class changes
    const observer = new MutationObserver(() => {
      if (theme !== "system") {
        const darkMode = document.documentElement.classList.contains("dark")
        setIsDark(darkMode)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
      if (theme === "system") {
        mediaQuery.removeEventListener("change", handleSystemThemeChange)
      }
    }
  }, [theme])

  const applyThemeChange = useCallback(
    async (newTheme: "theme-light" | "dark" | "system") => {
      const buttonElement =
        buttonRef.current ||
        (document.querySelector(
          '[data-slot="button"]'
        ) as HTMLButtonElement)

      if (!buttonElement) return

      const willBeDark =
        newTheme === "dark" ||
        (newTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)

      await document.startViewTransition(() => {
        flushSync(() => {
          setThemeState(newTheme)
          setIsDark(willBeDark)
          document.documentElement.classList.toggle("dark", willBeDark)
          localStorage.setItem(
            "theme",
            newTheme === "system"
              ? "system"
              : willBeDark
                ? "dark"
                : "light"
          )
        })
      }).ready

      const { top, left, width, height } =
        buttonElement.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    },
    [duration]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={(el) => {
            buttonRef.current = el
          }}
          variant="ghost"
          size="icon"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => applyThemeChange("theme-light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyThemeChange("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => applyThemeChange("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}