
const SEJM_API_BASE = "https://api.sejm.gov.pl/sejm";

export async function makeSejmRequest<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T | null> {
  const url = new URL(`${SEJM_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers = { Accept: "application/json" };
  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error("Sejm API request error:", err);
    return null;
  }
}
