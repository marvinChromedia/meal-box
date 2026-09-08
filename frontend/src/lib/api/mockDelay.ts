/** Small simulated latency so mock-backed hooks exercise real loading states, not instant resolution. */
export function mockDelay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
