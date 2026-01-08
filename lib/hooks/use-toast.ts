/**
 * Toast hook wrapper for sonner
 * This provides a consistent API for displaying toasts across the application
 * Supports both shadcn/ui toast API (variant) and sonner methods
 */

import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: "default" | "destructive" | "success";
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  return {
    toast: (options: ToastOptions | string) => {
      if (typeof options === "string") {
        sonnerToast(options);
        return;
      }

      const { title, description, duration, action, variant } = options;
      const message = title || description || "";

      // Map variant to sonner methods
      if (variant === "destructive") {
        sonnerToast.error(message, {
          description: title ? description : undefined,
          duration,
        });
        return;
      }

      if (variant === "success") {
        sonnerToast.success(message, {
          description: title ? description : undefined,
          duration,
        });
        return;
      }

      if (action) {
        sonnerToast(message, {
          description: title ? description : undefined,
          duration,
          action: {
            label: action.label,
            onClick: action.onClick,
          },
        });
      } else {
        sonnerToast(message, {
          description: title ? description : undefined,
          duration,
        });
      }
    },
    success: (message: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      sonnerToast.success(message, {
        description: options?.description,
        duration: options?.duration,
      });
    },
    error: (message: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      sonnerToast.error(message, {
        description: options?.description,
        duration: options?.duration,
      });
    },
    info: (message: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      sonnerToast.info(message, {
        description: options?.description,
        duration: options?.duration,
      });
    },
    warning: (message: string, options?: Omit<ToastOptions, "title" | "variant">) => {
      sonnerToast.warning(message, {
        description: options?.description,
        duration: options?.duration,
      });
    },
    dismiss: (toastId?: string | number) => {
      sonnerToast.dismiss(toastId);
    },
  };
}

// Also export the raw toast function for direct usage
export { toast } from "sonner";
