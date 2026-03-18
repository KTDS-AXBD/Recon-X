import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-3 text-3xl text-gray-300 dark:text-gray-600">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            "bg-blue-600 text-white hover:bg-blue-700",
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
