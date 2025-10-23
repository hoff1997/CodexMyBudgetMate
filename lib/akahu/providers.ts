export type AkahuAccount = {
  connection?: {
    status?: string;
    institution?: {
      name?: string;
    };
  };
};

export function deriveProvidersFromAccounts(items: AkahuAccount[]) {
  const providers = new Map<string, { status: string }>();
  items.forEach((item) => {
    const provider = item.connection?.institution?.name ?? "Akahu";
    const status = item.connection?.status ?? "connected";
    const current = providers.get(provider);
    if (!current) {
      providers.set(provider, { status });
    } else if (current.status !== "connected") {
      providers.set(provider, { status });
    }
  });
  return providers;
}
