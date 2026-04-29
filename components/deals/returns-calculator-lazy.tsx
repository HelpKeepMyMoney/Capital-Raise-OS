"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const ReturnsCalculatorLazy = dynamic(
  () => import("@/components/deals/returns-calculator").then((m) => ({ default: m.ReturnsCalculator })),
  {
    ssr: false,
    loading: () => <Skeleton className="min-h-[320px] w-full rounded-2xl" />,
  },
);
