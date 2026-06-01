import type { InboxChannel } from "@prisma/client";
import { Camera, Globe, MessageCircle, Mic, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const CHANNEL_CONFIG: Record<
  InboxChannel,
  { label: string; className: string; icon: React.ReactNode }
> = {
  WEB: {
    label: "Web",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <Globe className="h-3.5 w-3.5" />,
  },
  WEB_VOICE: {
    label: "Web · Voz",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <Mic className="h-3.5 w-3.5" />,
  },
  WEB_IMAGE: {
    label: "Web · Foto",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <Camera className="h-3.5 w-3.5" />,
  },
  WEB_IMPORT: {
    label: "Web · Importação",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    icon: <Upload className="h-3.5 w-3.5" />,
  },
  TELEGRAM: {
    label: "Telegram",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
  },
  TELEGRAM_VOICE: {
    label: "Telegram · Voz",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <Mic className="h-3.5 w-3.5" />,
  },
  TELEGRAM_IMAGE: {
    label: "Telegram · Foto",
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <Camera className="h-3.5 w-3.5" />,
  },
  WHATSAPP: {
    label: "WhatsApp",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
  },
};

interface InboxChannelBadgeProps {
  channel: InboxChannel;
  className?: string;
}

export function InboxChannelBadge({ channel, className }: InboxChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel] ?? {
    label: channel,
    className: "bg-slate-50 text-slate-700 border-slate-200",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
