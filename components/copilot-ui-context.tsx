"use client";

import * as React from "react";

type CopilotUIContextValue = {
  openCopilot: () => void;
};

const CopilotUIContext = React.createContext<CopilotUIContextValue | null>(null);

export function CopilotUIProvider(props: {
  children: React.ReactNode;
  openCopilot: () => void;
}) {
  const value = React.useMemo(
    () => ({ openCopilot: props.openCopilot }),
    [props.openCopilot],
  );
  return (
    <CopilotUIContext.Provider value={value}>{props.children}</CopilotUIContext.Provider>
  );
}

export function useCopilotUI(): CopilotUIContextValue {
  const ctx = React.useContext(CopilotUIContext);
  if (!ctx) {
    return { openCopilot: () => {} };
  }
  return ctx;
}
