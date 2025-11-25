import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languages } from "../i18n/ui";

interface LanguagePickerProps {
  currentLocale?: string;
}

export function LanguagePicker({ currentLocale }: LanguagePickerProps) {
  const [currentLang, setCurrentLang] = React.useState<string>(currentLocale || "en");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const [, lang] = pathname.split("/");
      if (lang === "en" || lang === "tr") {
        setCurrentLang(lang);
      } else {
        setCurrentLang("en");
      }
    } else if (currentLocale) {
      setCurrentLang(currentLocale);
    }
  }, [currentLocale]);

  const handleLanguageChange = (lang: string) => {
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname;
    // Mevcut path'ten dil kısmını çıkar
    let pathWithoutLang = currentPath.replace(/^\/(en|tr)/, "") || "/";
    if (pathWithoutLang === "") pathWithoutLang = "/";

    // Yeni dil ile path oluştur
    // Default locale (en) için prefix yok
    const newPath = lang === "en" ? pathWithoutLang : `/${lang}${pathWithoutLang}`;
    window.location.href = newPath;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([lang, label]) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={currentLang === lang ? "bg-accent" : ""}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
