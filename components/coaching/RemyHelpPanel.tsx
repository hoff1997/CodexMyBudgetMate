"use client";

import { useState } from "react";
import { X, Lightbulb, BookOpen, MessageCircle } from "lucide-react";
import Image from "next/image";
import { usePageCoaching } from "@/lib/coaching/hooks/usePageCoaching";
import { RemyHelpButton } from "./RemyHelpButton";

interface RemyHelpPanelProps {
  pageId: string;
}

export function RemyHelpPanel({ pageId }: RemyHelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tips" | "features" | "faqs">("tips");
  const coaching = usePageCoaching(pageId);

  if (!coaching) return null;

  return (
    <>
      {/* Trigger Button */}
      <RemyHelpButton onClick={() => setIsOpen(true)} />

      {/* Slide-out Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-white shadow-xl z-50 flex flex-col animate-slide-in-right">
            {/* Header with Remy */}
            <div className="relative px-4 py-4 border-b border-[#E5E7EB] bg-gradient-to-br from-[#E2EEEC] to-[#D4E8E4]">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 p-1 hover:bg-white/50 rounded"
              >
                <X className="w-5 h-5 text-[#6B6B6B]" />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md bg-white flex-shrink-0">
                  <Image
                    src="/Images/remy-welcome.png"
                    alt="Remy"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-[#3D3D3D]">Remy</h2>
                  <p className="text-xs text-[#5A7E7A]">
                    Your paddling partner 🛶
                  </p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    {coaching.pageName}
                  </p>
                </div>
              </div>
            </div>

            {/* Remy's Intro - Speech bubble */}
            <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <div className="relative bg-white rounded-lg p-3 shadow-sm border border-[#E5E7EB]">
                <div className="absolute -top-2 left-6 w-3 h-3 bg-white border-l border-t border-[#E5E7EB] transform rotate-45" />
                <p className="text-sm text-[#6B6B6B] leading-relaxed">
                  {coaching.remyIntro}
                </p>
              </div>
            </div>

            {/* Purpose */}
            <div className="px-4 py-2 border-b border-[#E5E7EB]">
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-1">
                What&apos;s this page for?
              </p>
              <p className="text-sm text-[#3D3D3D]">{coaching.purpose}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E5E7EB]">
              <button
                onClick={() => setActiveTab("tips")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === "tips"
                    ? "text-[#5A7E7A] border-b-2 border-[#5A7E7A] bg-white"
                    : "text-[#9CA3AF] hover:text-[#6B6B6B]"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
                Tips
              </button>
              <button
                onClick={() => setActiveTab("features")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === "features"
                    ? "text-[#5A7E7A] border-b-2 border-[#5A7E7A] bg-white"
                    : "text-[#9CA3AF] hover:text-[#6B6B6B]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                Features
              </button>
              <button
                onClick={() => setActiveTab("faqs")}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === "faqs"
                    ? "text-[#5A7E7A] border-b-2 border-[#5A7E7A] bg-white"
                    : "text-[#9CA3AF] hover:text-[#6B6B6B]"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
                FAQs
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "tips" && (
                <div className="space-y-3">
                  {coaching.quickTips.map((tip, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[#5A7E7A] mt-0.5 flex-shrink-0">
                        💡
                      </span>
                      <p className="text-sm text-[#6B6B6B] leading-relaxed">
                        {tip}
                      </p>
                    </div>
                  ))}

                  {coaching.commonMistakes && coaching.commonMistakes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                      <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-2">
                        Watch out for
                      </p>
                      {coaching.commonMistakes.map((mistake, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <span className="text-[#6B9ECE] mt-0.5 flex-shrink-0">
                            ⚠️
                          </span>
                          <p className="text-sm text-[#6B6B6B]">{mistake}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "features" && (
                <div className="space-y-4">
                  {coaching.features.map((feature) => (
                    <div
                      key={feature.id}
                      className="pb-4 border-b border-[#E5E7EB] last:border-b-0"
                    >
                      <h4 className="font-medium text-[#3D3D3D] text-sm mb-1">
                        {feature.name}
                      </h4>
                      <p className="text-xs text-[#6B6B6B] mb-2">{feature.what}</p>
                      <div className="bg-[#F9FAFB] rounded p-2 space-y-1">
                        <p className="text-xs">
                          <span className="text-[#5A7E7A] font-medium">
                            Why it matters:
                          </span>{" "}
                          {feature.why}
                        </p>
                        <p className="text-xs">
                          <span className="text-[#5A7E7A] font-medium">
                            How to use:
                          </span>{" "}
                          {feature.how}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "faqs" && (
                <div className="space-y-2">
                  {coaching.faqs.map((faq, i) => (
                    <details key={i} className="group">
                      <summary className="text-sm font-medium text-[#3D3D3D] cursor-pointer hover:text-[#5A7E7A] py-2 pr-4 list-none">
                        <span className="flex items-start gap-2">
                          <span className="text-[#5A7E7A]">Q:</span>
                          <span>{faq.question}</span>
                        </span>
                      </summary>
                      <div className="text-sm text-[#6B6B6B] pb-3 pl-5 leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with small Remy */}
            <div className="px-4 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center gap-2">
              <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="/Images/remy-small.png"
                  alt=""
                  fill
                  className="object-cover object-top"
                />
              </div>
              <p className="text-xs text-[#9CA3AF] italic">
                I keep things steady while you chart the course.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
