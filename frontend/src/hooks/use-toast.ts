"use client"

// This file is a compatibility layer to help migrate from the old toast system
// to sonner. It provides a similar API to the old useToast hook.

import { toast as sonnerToast } from "sonner";

export type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Simplified compatibility function
export function toast(props: ToastProps) {
  const { title, description, variant } = props;
  
  if (variant === "destructive") {
    return sonnerToast.error(title as string, {
      description: description as string,
    });
  }
  
  return sonnerToast(title as string, {
    description: description as string,
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss
  };
}