import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Github } from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useTranslations } from "@/i18n/utils";

interface HeaderProps {
    currentLocale: string;
}

export function Header({ currentLocale }: HeaderProps) {
    const t = useTranslations(currentLocale as "en" | "tr");

    return (
        <div className="container mx-auto flex justify-end p-4 gap-2 items-center">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <a
                            href="https://github.com/Emircyn/emircyn"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Source Code"
                        >
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                                <Github className="h-[1.2rem] w-[1.2rem]" />
                            </Button>
                        </a>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t("header.sourceCode")}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <LanguagePicker currentLocale={currentLocale} />
            <AnimatedThemeToggler />
        </div>
    );
}
