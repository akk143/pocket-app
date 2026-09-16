import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { fetchExchangeRates, SUPPORTED_CURRENCIES } from "../lib/currency";

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  rates: Record<string, number> | null;
  isLoadingRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    const saved = localStorage.getItem("pocket_currency");
    if (saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)) {
      return saved;
    }
    return "VND"; // Default
  });
  
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoadingRates(true);

    fetchExchangeRates().then((fetchedRates) => {
      if (mounted) {
        setRates(fetchedRates);
        setIsLoadingRates(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    localStorage.setItem("pocket_currency", code);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, isLoadingRates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
