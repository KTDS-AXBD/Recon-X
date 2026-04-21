import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AxisSelectOption {
  value: string;
  label: string;
}

export interface AxisSelectProps {
  options: AxisSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AxisSelect({ options, value, onValueChange, placeholder, disabled, className }: AxisSelectProps) {
  // exactOptionalPropertyTypes: pass only defined props
  const controlledProps: { value: string; onValueChange: (v: string) => void } | Record<string, never> =
    value !== undefined && onValueChange !== undefined
      ? { value, onValueChange }
      : {};
  return (
    <Select {...controlledProps} {...(disabled !== undefined ? { disabled } : {})}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
