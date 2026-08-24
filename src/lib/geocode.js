/**
 * Address → coordinates, via OpenStreetMap's Nominatim.
 *
 * Free, no API key, no billing account. The trade-off is their usage policy:
 * one request per second, no bulk jobs, and identify yourself. That's fine for
 * geocoding a town's worth of businesses one at a time from the admin page —
 * it would not be fine for geocoding on every page load, which is exactly why
 * the result gets stored on the spot row instead.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

let lastCall = 0

// Nominatim asks for max one request per second. Spacing them here means a
// rapid sequence of taps queues politely instead of getting the app blocked.
async function throttle() {
  const wait = Math.max(0, 1100 - (Date.now() - lastCall))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastCall = Date.now()
}

/**
 * @returns {{ lat:number, lng:number, label:string } | null}
 */
export async function geocode({ address, town, state, name }) {
  if (!address?.trim()) return null

  // Including the town and state matters more than it looks: "1053 Raritan Rd"
  // alone matches roads in several states. The business name is deliberately
  // left out of the query — Nominatim indexes addresses, and a name it doesn't
  // recognize makes the whole search miss rather than narrowing it.
  const parts = [address.trim(), town, state, 'USA'].filter(Boolean)
  const q = parts.join(', ')

  await throttle()

  const url = `${NOMINATIM}?${new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
    addressdetails: '0',
  })}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`)

  const results = await res.json()
  if (!results?.length) return null

  const hit = results[0]
  const lat = parseFloat(hit.lat)
  const lng = parseFloat(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return { lat, lng, label: hit.display_name || q }
}
