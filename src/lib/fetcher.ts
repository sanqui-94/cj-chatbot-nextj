/** Shared SWR fetcher for the session-guarded read route handlers. */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`);
    throw err;
  }
  return res.json() as Promise<T>;
}
