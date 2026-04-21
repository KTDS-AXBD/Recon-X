import { Input } from "@/components/ui/input";
import { forwardRef, type ComponentProps } from "react";

export interface AxisInputProps extends ComponentProps<typeof Input> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const AxisInput = forwardRef<HTMLInputElement, AxisInputProps>(
  ({ label, helperText, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <Input
        ref={ref}
        className={error ? `border-destructive ${className ?? ""}`.trim() : className}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  ),
);
AxisInput.displayName = "AxisInput";
