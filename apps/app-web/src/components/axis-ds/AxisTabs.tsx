import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ReactNode } from "react";

export interface AxisTab {
  value: string;
  label: string;
  content: ReactNode;
}

export interface AxisTabsProps {
  tabs: AxisTab[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export function AxisTabs({ tabs, defaultValue, value, onValueChange, className }: AxisTabsProps) {
  // exactOptionalPropertyTypes: build props object without undefined values
  const fallback = defaultValue ?? tabs[0]?.value ?? "";
  const tabsProps =
    value !== undefined
      ? ({ value, ...(onValueChange !== undefined ? { onValueChange } : {}), ...(className !== undefined ? { className } : {}) } as Parameters<typeof Tabs>[0])
      : ({ defaultValue: fallback, ...(className !== undefined ? { className } : {}) } as Parameters<typeof Tabs>[0]);

  return (
    <Tabs {...tabsProps}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
