export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
   const response = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
   });
   if (!response.ok) {
      // TODO get JSON error payload if available
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
   }
   return response.json() as Promise<T>;
}
