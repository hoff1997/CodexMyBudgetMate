"use client";

import { useState, useMemo } from "react";
import { Share2, Copy, MessageCircle, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  title: string;
  text: string;
  className?: string;
  iconClassName?: string;
  buttonClassName?: string;
}

// Social platform icons as simple SVGs
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function SMSIcon({ className }: { className?: string }) {
  return (
    <MessageCircle className={className} />
  );
}

export function ShareMenu({
  title,
  text,
  iconClassName,
  buttonClassName,
}: ShareMenuProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate share options - memoized to avoid recalculating on every render
  const shareOptions = useMemo(() => {
    const encodedText = encodeURIComponent(text);

    return [
      {
        name: "WhatsApp",
        icon: WhatsAppIcon,
        color: "text-[#25D366]",
        hoverBg: "hover:bg-[#25D366]/10",
        url: `https://wa.me/?text=${encodedText}`,
      },
      {
        name: "Messenger",
        icon: MessengerIcon,
        color: "text-[#0084FF]",
        hoverBg: "hover:bg-[#0084FF]/10",
        // For Messenger, we just share the text directly
        url: `https://www.facebook.com/dialog/share?display=popup&quote=${encodedText}&href=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`,
      },
      {
        name: "Facebook",
        icon: FacebookIcon,
        color: "text-[#1877F2]",
        hoverBg: "hover:bg-[#1877F2]/10",
        url: `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`,
      },
      {
        name: "Messages",
        icon: SMSIcon,
        color: "text-[#34C759]",
        hoverBg: "hover:bg-[#34C759]/10",
        url: `sms:?body=${encodedText}`,
      },
    ];
  }, [text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Recipe copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "shrink-0 p-1.5 rounded-full hover:bg-sage-very-light transition-colors",
            buttonClassName
          )}
          title="Share"
        >
          <Share2 className={cn("w-4 h-4 text-sage", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-text-medium px-2 py-1">Share via</p>

          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={() => handleShare(option.url)}
              className={cn(
                "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm",
                option.hoverBg
              )}
            >
              <option.icon className={cn("w-5 h-5", option.color)} />
              <span className="text-text-dark">{option.name}</span>
            </button>
          ))}

          <div className="border-t border-silver-light my-1" />

          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm hover:bg-sage-very-light"
          >
            {copied ? (
              <Check className="w-5 h-5 text-sage" />
            ) : (
              <Copy className="w-5 h-5 text-text-medium" />
            )}
            <span className="text-text-dark">{copied ? "Copied!" : "Copy to clipboard"}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
