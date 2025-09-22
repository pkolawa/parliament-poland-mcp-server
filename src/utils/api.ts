
const SEJM_API_BASE = "https://api.sejm.gov.pl/sejm";

export async function makeSejmRequest<T>(endpoint: string): Promise<T | null> {
  const url = `${SEJM_API_BASE}${endpoint}`;
  const headers = { Accept: "application/json" };
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.error("Sejm API request error:", err);
    return null;
  }
}
