"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
        },
        classNames: {
          success: "!bg-sage-very-light !border-sage-light !text-sage-dark",
          error: "!bg-red-50 !border-red-200 !text-red-700",
          info: "!bg-blue-light !border-blue/30 !text-blue",
          warning: "!bg-gold-light !border-gold/30 !text-gold-dark",
        },
      }}
    />
  );
}
