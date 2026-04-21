import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";

export type AxisBadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

type ShadcnVariant = ComponentProps<typeof Badge>["variant"];

export interface AxisBadgeProps extends Omit<ComponentProps<typeof Badge>, "variant"> {
  variant?: AxisBadgeVariant;
}

const VARIANT_MAP: Record<AxisBadgeVariant, ShadcnVariant> = {
  default: "default",
  secondary: "secondary",
  success: "secondary",
  warning: "secondary",
  destructive: "destructive",
  outline: "outline",
};

export function AxisBadge({ variant = "default", ...props }: AxisBadgeProps) {
  return <Badge variant={VARIANT_MAP[variant]} {...props} />;
}
