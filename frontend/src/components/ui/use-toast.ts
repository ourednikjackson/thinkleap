// Re-export toast functionality from toast.tsx with direct relative path
import { toast, useToast as useToastImpl } from "./toast"

export const useToast = useToastImpl
export { toast }
