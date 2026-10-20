import { toast as sonnerToast } from "sonner";

export function useToast() {
  return { 
    toast: (msg: any) => {
      if (msg.variant === "destructive") {
        sonnerToast.error(msg.title, { description: msg.description });
      } else {
        sonnerToast.success(msg.title, { description: msg.description });
      }
    } 
  };
}

export const toast = (msg: any) => {
  if (msg.variant === "destructive") {
    sonnerToast.error(msg.title, { description: msg.description });
  } else {
    sonnerToast.success(msg.title, { description: msg.description });
  }
}
