"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Lightbulb, Sparkles, BookOpen, MessageCircle, HelpCircle } from "lucide-react";
import { RemyAvatar } from "@/components/onboarding/remy-tip";

interface FAQ {
  question: string;
  answer: string;
}

interface HelpContent {
  intro?: string;
  coaching?: string[];
  tips?: string[];
  features?: string[];
  faqs?: FAQ[];
}

interface RemyHelpButtonProps {
  title: string;
  content: HelpContent;
  variant?: "default" | "compact";
}

export function RemyHelpButton({ title, content, variant = "default" }: RemyHelpButtonProps) {
  const [open, setOpen] = useState(false);

  const hasContent =
    (content.coaching && content.coaching.length > 0) ||
    (content.tips && content.tips.length > 0) ||
    (content.features && content.features.length > 0) ||
    (content.faqs && content.faqs.length > 0);

  if (!hasContent) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "compact" ? (
          <button
            type="button"
            className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-sage-very-light hover:bg-sage-light border border-sage-light/50 transition-colors"
          >
            <RemyAvatar pose="small" size="sm" className="!w-7 !h-7 !border-0 !shadow-none" />
            <span className="text-sm font-medium text-text-medium">Help</span>
            <HelpCircle className="h-4 w-4 text-sage" />
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-2 h-10 pl-1 pr-4 rounded-full bg-sage-very-light hover:bg-sage-light border border-sage-light/50 transition-colors"
          >
            <RemyAvatar pose="small" size="sm" className="!w-8 !h-8 !border-0 !shadow-none" />
            <span className="text-sm font-medium text-text-medium">Help</span>
            <HelpCircle className="h-5 w-5 text-sage" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <RemyAvatar pose="small" size="sm" className="!w-12 !h-12" />
            <div>
              <SheetTitle className="text-lg">{title} Help</SheetTitle>
              <p className="text-sm text-text-medium">
                Remy's here to help you out
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Intro Paragraph (if provided) */}
          {content.intro && (
            <div className="bg-sage-very-light rounded-lg p-4 border border-sage-light">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-sage" />
                <h3 className="font-medium text-sage-dark">From Remy</h3>
              </div>
              <p className="text-sm text-text-medium">{content.intro}</p>
              {content.coaching && content.coaching.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {content.coaching.map((message, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-medium"
                    >
                      <span className="text-sage mt-0.5">•</span>
                      {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Coaching Messages (standalone - when no intro) */}
          {!content.intro && content.coaching && content.coaching.length > 0 && (
            <div className="bg-sage-very-light rounded-lg p-4 border border-sage-light">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-sage" />
                <h3 className="font-medium text-sage-dark">Coaching</h3>
              </div>
              <div className="space-y-2">
                {content.coaching.map((message, i) => (
                  <p key={i} className="text-sm text-text-medium">
                    "{message}"
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tips Section */}
          {content.tips && content.tips.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-gold" />
                <h3 className="font-medium text-text-dark">Quick Tips</h3>
              </div>
              <ul className="space-y-2">
                {content.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-medium"
                  >
                    <span className="text-gold mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features Section */}
          {content.features && content.features.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue" />
                <h3 className="font-medium text-text-dark">Features</h3>
              </div>
              <ul className="space-y-2">
                {content.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-medium"
                  >
                    <span className="text-blue mt-1">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAQs Section */}
          {content.faqs && content.faqs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-sage" />
                <h3 className="font-medium text-text-dark">FAQs</h3>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {content.faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-sm text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-text-medium">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-silver-light">
            <p className="text-xs text-text-light text-center">
              Need more help? Check out our{" "}
              <a href="/help" className="text-sage hover:underline">
                Help Center
              </a>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
