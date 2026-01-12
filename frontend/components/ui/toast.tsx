import * as ToastPrimitive from "@radix-ui/react-toast";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = forwardRef<HTMLOListElement, ToastPrimitive.ToastViewportProps>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Viewport
      ref={ref}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3 outline-none",
        className
      )}
      {...props}
    />
  )
);

ToastViewport.displayName = "ToastViewport";

const Toast = forwardRef<HTMLLIElement, ToastPrimitive.ToastProps>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-slate-900",
        className
      )}
      {...props}
    />
  )
);

Toast.displayName = "Toast";

const ToastTitle = forwardRef<HTMLParagraphElement, ToastPrimitive.ToastTitleProps>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Title
      ref={ref}
      className={cn("text-sm font-semibold text-ink dark:text-mist", className)}
      {...props}
    />
  )
);

ToastTitle.displayName = "ToastTitle";

const ToastDescription = forwardRef<HTMLParagraphElement, ToastPrimitive.ToastDescriptionProps>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Description
      ref={ref}
      className={cn("text-xs text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  )
);

ToastDescription.displayName = "ToastDescription";

const ToastClose = forwardRef<HTMLButtonElement, ToastPrimitive.ToastCloseProps>(
  ({ className, ...props }, ref) => (
    <ToastPrimitive.Close
      ref={ref}
      className={cn(
        "ml-auto text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700 dark:text-slate-400",
        className
      )}
      {...props}
    />
  )
);

ToastClose.displayName = "ToastClose";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose
};
