import { toast } from "sonner";

type ToastType = "success" | "error" | "info";

export function useToast(): {
   showToast: (type: ToastType, message: string) => void;
} {
   return {
      showToast: (type: ToastType, message: string): void => {
         switch (type) {
            case "success":
               toast.success(message);
               break;
            case "error":
               toast.error(message);
               break;
            case "info":
               toast(message);
               break;
         }
      },
   };
}
