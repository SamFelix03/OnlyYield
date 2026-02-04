export function getEthereumProvider(): any {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum || null;
}

