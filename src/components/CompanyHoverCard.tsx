import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CompanyHoverCardProps {
    text: string;
}

export function CompanyHoverCard({ text }: CompanyHoverCardProps) {
    return (
        <HoverCard>
            <HoverCardTrigger
                href="https://www.inspirit.com.tr/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-wavy decoration-primary/50 hover:decoration-primary transition-colors cursor-pointer"
            >
                {text}
            </HoverCardTrigger>
            <HoverCardContent
                className="w-[280px] sm:w-80 p-0 overflow-hidden"
                collisionPadding={16}
            >
                <div className="aspect-video w-full relative bg-muted">
                    <iframe
                        src="https://www.inspirit.com.tr/"
                        className="w-[400%] h-[400%] scale-25 origin-top-left border-0 absolute inset-0 pointer-events-none"
                        title="InspireIT Preview"
                        loading="lazy"
                    ></iframe>
                </div>
                <div className="p-4 bg-background">
                    <h4 className="text-sm font-semibold">InspireIT</h4>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
