import { MessageCircle, Github, AtSign, Headphones, Mail, Users } from "lucide-react";
import type { Source } from "@/data/mock-data";
import { cn } from "@/lib/utils";

const iconMap: Record<Source, React.ElementType> = {
  discord: MessageCircle,
  github: Github,
  x: AtSign,
  support: Headphones,
  email: Mail,
  community: Users,
};

interface SourceIconProps {
  source: Source;
  size?: number;
  className?: string;
}

export function SourceIcon({ source, size = 16, className }: SourceIconProps) {
  const Icon = iconMap[source];
  return <Icon size={size} className={cn("text-foreground", className)} />;
}
