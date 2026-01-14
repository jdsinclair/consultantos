"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DealModeContextType {
  dealModeEnabled: boolean;
  toggleDealMode: () => void;
}

const DealModeContext = createContext<DealModeContextType | undefined>(undefined);

export function DealModeProvider({ children }: { children: ReactNode }) {
  const [dealModeEnabled, setDealModeEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("dealModeEnabled");
    if (stored === "true") {
      setDealModeEnabled(true);
    }
    setMounted(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("dealModeEnabled", dealModeEnabled.toString());
    }
  }, [dealModeEnabled, mounted]);

  const toggleDealMode = () => {
    setDealModeEnabled((prev) => !prev);
  };

  return (
    <DealModeContext.Provider value={{ dealModeEnabled, toggleDealMode }}>
      {children}
    </DealModeContext.Provider>
  );
}

export function useDealMode() {
  const context = useContext(DealModeContext);
  if (context === undefined) {
    throw new Error("useDealMode must be used within a DealModeProvider");
  }
  return context;
}
