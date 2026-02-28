import React, { createContext, useContext } from "react";
import useSWR from "swr";
import { StorefrontConfig, StorefrontConfigSchema } from "@/lib/types/storefront-config";

const fetcher = async (url: string): Promise<StorefrontConfig> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load storefront config");
  const json = await res.json();
  return StorefrontConfigSchema.parse(json.data);
};

const StorefrontConfigContext = createContext<StorefrontConfig | null>(null);

export function StorefrontConfigProvider({
  botId,
  initialConfig,
  children,
}: {
  botId: string;
  initialConfig?: StorefrontConfig;
  children: React.ReactNode;
}) {
  const { data } = useSWR<StorefrontConfig>(
    `/api/storefront/${botId}/config`,
    fetcher,
    {
      fallbackData:      initialConfig,
      revalidateOnFocus: false,
      dedupingInterval:  60_000,
    }
  );

  if (!data) return null;

  return (
    <StorefrontConfigContext.Provider value={data}>
      {children}
    </StorefrontConfigContext.Provider>
  );
}

export function useStorefrontConfig(): StorefrontConfig {
  const ctx = useContext(StorefrontConfigContext);
  if (!ctx) throw new Error("useStorefrontConfig must be used inside StorefrontConfigProvider");
  return ctx;
}
