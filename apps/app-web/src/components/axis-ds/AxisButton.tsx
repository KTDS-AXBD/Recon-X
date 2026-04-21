import { Button } from "@/components/ui/button";
import { forwardRef, type ComponentProps } from "react";

export type AxisButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";

type ShadcnVariant = ComponentProps<typeof Button>["variant"];

export interface AxisButtonProps extends Omit<ComponentProps<typeof Button>, "variant"> {
  variant?: AxisButtonVariant;
}

const VARIANT_MAP: Record<AxisButtonVariant, ShadcnVariant> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
  outline: "outline",
};

export const AxisButton = forwardRef<HTMLButtonElement, AxisButtonProps>(
  ({ variant = "primary", ...props }, ref) => (
    <Button ref={ref} variant={VARIANT_MAP[variant]} {...props} />
  ),
);
AxisButton.displayName = "AxisButton";
