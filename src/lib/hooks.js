import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

// ── Towns ─────────────────────────────────────────────────────────────────────
export function useTowns() {
  const [towns,   setTowns]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('towns')
      .select('*')
      .order('name')
      .then(({ data }) => { setTowns(data || []); setLoading(false) })
  }, [])

  return { towns, loading }
}

// ── Spots for a town ──────────────────────────────────────────────────────────
export function useSpots(townId) {
  const [spots,   setSpots]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!townId) return
    setLoading(true)
    const { data } = await supabase
      .from('spots_with_stamps')   // view joins stamp_cards for current user
      .select('*')
      .eq('town_id', townId)
      .eq('active', true)
      .order('name')
    setSpots(data || [])
    setLoading(false)
  }, [townId])

  useEffect(() => { fetch() }, [fetch])

  return { spots, loading, refetch: fetch }
}

// ── Single spot ───────────────────────────────────────────────────────────────
export function useSpot(spotId) {
  const [spot,    setSpot]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!spotId) return
    supabase
      .from('spots_with_stamps')
      .select('*')
      .eq('id', spotId)
      .single()
      .then(({ data }) => { setSpot(data); setLoading(false) })
  }, [spotId])

  return { spot, loading }
}

// ── Scan QR / add stamp ───────────────────────────────────────────────────────
export function useStamp() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function addStamp(spotId) {
    setLoading(true)
    setError(null)

    try {
      // 0. Check if this user already scanned this spot today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: todayVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('spot_id', spotId)
        .gte('created_at', todayStart.toISOString())
        .maybeSingle()

      if (todayVisit) {
        setLoading(false)
        return { perkEarned: false, alreadyScanned: true }
      }

      // 1. Insert visit row
      const { error: visitErr } = await supabase
        .from('visits')
        .insert({ user_id: session.user.id, spot_id: spotId })

      if (visitErr) {
        // 23505 = unique constraint violation — race condition backstop
        if (visitErr.code === '23505') {
          setLoading(false)
          return { perkEarned: false, alreadyScanned: true }
        }
        throw visitErr
      }

      // 2. Upsert stamp card (increment stamps)
      const { data: existing } = await supabase
        .from('stamp_cards')
        .select('id, stamps, lifetime')
        .eq('user_id', session.user.id)
        .eq('spot_id', spotId)
        .single()

      // Get spot to know the required stamps
      const { data: spot } = await supabase
        .from('spots')
        .select('stamps_required')
        .eq('id', spotId)
        .single()

      const currentStamps  = existing?.stamps  ?? 0
      const currentLifetime = existing?.lifetime ?? 0
      const newStamps = (currentStamps + 1) >= spot.stamps_required ? 0 : currentStamps + 1
      // Reset to 0 when card is complete (perk earned)
      const perkEarned = currentStamps + 1 >= spot.stamps_required

      if (existing) {
        await supabase
          .from('stamp_cards')
          .update({ stamps: newStamps, lifetime: currentLifetime + 1 })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('stamp_cards')
          .insert({ user_id: session.user.id, spot_id: spotId, stamps: 1, lifetime: 1 })
      }

      return { perkEarned }
    } catch (err) {
      setError(err.message)
      return { perkEarned: false, error: err }
    } finally {
      setLoading(false)
    }
  }

  return { addStamp, loading, error }
}

// ── Submit feedback ───────────────────────────────────────────────────────────
export function useFeedback() {
  const { session } = useAuth()

  async function submitFeedback({ spotId, mood, note }) {
    return supabase.from('feedback').insert({
      user_id: session.user.id,
      spot_id: spotId,
      mood,
      note,
    })
  }

  return { submitFeedback }
}

// ── Consumer: all stamp cards ─────────────────────────────────────────────────
export function useMyCards() {
  const { session } = useAuth()
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    supabase
      .from('stamp_cards')
      .select('*, spots(*, towns(*))')
      .eq('user_id', session.user.id)
      .order('lifetime', { ascending: false })
      .then(({ data }) => { setCards(data || []); setLoading(false) })
  }, [session])

  return { cards, loading }
}

// ── Owner: their spot ─────────────────────────────────────────────────────────
export function useMySpot() {
  const { session } = useAuth()
  const [spot,    setSpot]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('spots')
      .select('*, towns(*)')
      .eq('owner_id', session.user.id)
      .eq('active', true)
      .single()
    setSpot(data)
    setLoading(false)
  }, [session])

  useEffect(() => { fetch() }, [fetch])

  return { spot, loading, refetch: fetch }
}

// ── Owner: create / update spot ───────────────────────────────────────────────
export function useManageSpot() {
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function createSpot(spotData) {
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('spots')
      .insert({ ...spotData, owner_id: session.user.id })
      .select()
      .single()
    setSaving(false)
    if (error) setError(error.message)
    return { data, error }
  }

  async function updateSpot(spotId, updates) {
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('spots')
      .update(updates)
      .eq('id', spotId)
      .eq('owner_id', session.user.id)
      .select()
      .single()
    setSaving(false)
    if (error) setError(error.message)
    return { data, error }
  }

  async function deleteSpot(spotId) {
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', spotId)
      .eq('owner_id', session.user.id)
    setSaving(false)
    if (error) setError(error.message)
    return { error }
  }

  return { createSpot, updateSpot, deleteSpot, saving, error }
}

// ── Owner: dashboard stats ────────────────────────────────────────────────────
export function useDashboardStats(spotId) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!spotId) return

    async function fetchAll() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const [
        { count: todayVisits },
        { count: weekVisits },
        { data: customers },
        { count: stampsThisWeek },
        { count: perksRedeemed },
        { data: weekVisitRows },
      ] = await Promise.all([
        supabase.from('visits').select('*', { count:'exact', head:true }).eq('spot_id', spotId).gte('created_at', todayISO),
        supabase.from('visits').select('*', { count:'exact', head:true }).eq('spot_id', spotId).gte('created_at', weekAgo.toISOString()),
        supabase.from('spot_customer_stats').select('*').eq('spot_id', spotId).order('visit_count', { ascending:false }),
        supabase.from('visits').select('*', { count:'exact', head:true }).eq('spot_id', spotId).gte('created_at', weekAgo.toISOString()),
        supabase.from('stamp_cards').select('*', { count:'exact', head:true }).eq('spot_id', spotId).eq('stamps', 0).gt('lifetime', 0),
        supabase.from('visits').select('created_at').eq('spot_id', spotId).gte('created_at', weekAgo.toISOString()),
      ])

      // Bucket real visits into Mon–Sun counts for the bar chart, instead
      // of ever showing fabricated numbers when a spot is brand new.
      const dayBuckets = [0, 0, 0, 0, 0, 0, 0] // Mon=0 ... Sun=6
      ;(weekVisitRows || []).forEach(row => {
        const jsDay = new Date(row.created_at).getDay() // 0=Sun ... 6=Sat
        const mondayFirstIndex = (jsDay + 6) % 7         // shift so Mon=0 ... Sun=6
        dayBuckets[mondayFirstIndex]++
      })
      const todayMondayFirstIndex = (new Date().getDay() + 6) % 7

      setStats({
        todayVisits:  todayVisits  ?? 0,
        weekVisits:   weekVisits   ?? 0,
        customers:    customers    ?? [],
        stampsThisWeek: stampsThisWeek ?? 0,
        perksRedeemed: perksRedeemed ?? 0,
        activeCustomers: customers?.length ?? 0,
        weekChart: dayBuckets,
        todayIndex: todayMondayFirstIndex,
      })
      setLoading(false)
    }

    fetchAll()
  }, [spotId])

  return { stats, loading }
}

// ── Owner: recent visits (realtime) ──────────────────────────────────────────
export function useRealtimeVisits(spotId) {
  const [visits, setVisits] = useState([])

  useEffect(() => {
    if (!spotId) return

    // Fetch last 10 recent visits
    supabase
      .from('visits')
      .select('*, profiles(full_name, avatar)')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setVisits(data || []))

    // Subscribe to new visits in realtime
    const channel = supabase
      .channel(`visits:${spotId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'visits',
        filter: `spot_id=eq.${spotId}`,
      }, async (payload) => {
        // Fetch the profile for the new visit
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar')
          .eq('id', payload.new.user_id)
          .single()

        setVisits(prev => [{ ...payload.new, profiles: profile }, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [spotId])

  return visits
}

// ── Owner: send offer ─────────────────────────────────────────────────────────
export function useSendOffer(spotId) {
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  // durationHours: a number, or null for "runs until I end it"
  async function sendOffer({ message, target, durationHours = null }) {
    setSending(true)
    const expires_at = durationHours
      ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
      : null

    const { error } = await supabase
      .from('offers')
      .insert({ spot_id: spotId, message, target, expires_at, active: true })
    setSending(false)
    if (!error) {
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    }
    return { error }
  }

  return { sendOffer, sending, sent }
}

// ── Owner: currently-running offers (and ending them early) ───────────────────
export function useLiveOffers(spotId) {
  const [offers,  setOffers]  = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOffers = useCallback(async () => {
    if (!spotId) return
    setLoading(true)
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('spot_id', spotId)
      .eq('active', true)
      .order('sent_at', { ascending: false })

    // Filter out ones that have already timed out. They're still `active` in the
    // DB (nothing sweeps them), but they're no longer live to customers — so the
    // owner shouldn't see them listed as running either.
    const now = Date.now()
    const live = (data || []).filter(o => !o.expires_at || new Date(o.expires_at).getTime() > now)
    setOffers(live)
    setLoading(false)
  }, [spotId])

  useEffect(() => { fetchOffers() }, [fetchOffers])

  async function endOffer(offerId) {
    const { error } = await supabase
      .from('offers')
      .update({ active: false })
      .eq('id', offerId)
    if (!error) await fetchOffers()
    return { error }
  }

  return { offers, loading, endOffer, refetch: fetchOffers }
}

// ── Owner: feedback ───────────────────────────────────────────────────────────
export function useOwnerFeedback(spotId) {
  const [feedback, setFeedback] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!spotId) return
    supabase
      .from('feedback')
      .select('*, profiles(full_name, avatar)')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setFeedback(data || []); setLoading(false) })
  }, [spotId])

  async function markRead(id) {
    await supabase.from('feedback').update({ read: true }).eq('id', id)
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, read: true } : f))
  }

  return { feedback, loading, markRead }
}

// ── Main Street feed (recent activity across a town) ─────────────────────────
export function useBlockFeed(townId) {
  const [feed,    setFeed]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!townId) return

    async function fetchFeed() {
      // Recent visits + offers from spots in this town
      const [{ data: visits }, { data: offers }] = await Promise.all([
        supabase
          .from('visits')
          .select('*, profiles(full_name, avatar), spots(name, emoji, town_id)')
          .eq('spots.town_id', townId)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('offers')
          .select('*, spots(name, emoji, town_id)')
          .eq('spots.town_id', townId)
          .eq('active', true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('sent_at', { ascending: false })
          .limit(10),
      ])

      const visitItems = (visits || [])
        .filter(v => v.spots)
        .map(v => ({
          id:     v.id,
          type:   'visit',
          emoji:  v.spots.emoji,
          name:   v.spots.name,
          text:   `${v.profiles?.full_name || 'Someone'} earned a stamp`,
          time:   v.created_at,
        }))

      const offerItems = (offers || [])
        .filter(o => o.spots)
        .map(o => ({
          id:     o.id,
          type:   'offer',
          emoji:  o.spots.emoji,
          name:   o.spots.name,
          text:   o.message,
          time:   o.sent_at,
        }))

      const combined = [...visitItems, ...offerItems]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 20)

      setFeed(combined)
      setLoading(false)
    }

    fetchFeed()
  }, [townId])

  return { feed, loading }
}

// ── Submit a town request ─────────────────────────────────────────────────────
export function useTownRequest() {
  const { session } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  async function submitRequest({ townName, state, note }) {
    setSubmitting(true)
    const { error } = await supabase.from('town_requests').insert({
      requested_by: session.user.id,
      town_name: townName,
      state,
      note,
    })
    setSubmitting(false)
    if (!error) setSubmitted(true)
    return { error }
  }

  return { submitRequest, submitting, submitted }
}

// ── Admin: manage towns ────────────────────────────────────────────────────────
export function useAdminTowns() {
  const [towns,   setTowns]   = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: townsData }, { data: requestsData }] = await Promise.all([
      supabase.from('towns').select('*').order('name'),
      supabase.from('town_requests').select('*, profiles(full_name)').order('created_at', { ascending: false }),
    ])
    setTowns(townsData || [])
    setRequests(requestsData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addTown({ name, state, emoji, population }) {
    const { error } = await supabase.from('towns').insert({ name, state, emoji, population, active: true })
    if (!error) await fetchAll()
    return { error }
  }

  async function toggleTownActive(townId, active) {
    const { error } = await supabase.from('towns').update({ active }).eq('id', townId)
    if (!error) await fetchAll()
    return { error }
  }

  async function deleteTown(townId) {
    // Check for existing spots AND profiles pointing at this town first, so
    // we can show a clear message instead of a raw foreign-key-violation
    // error from Postgres. Both `spots.town_id` and `profiles.town_id`
    // reference towns without ON DELETE CASCADE, by design — we don't want
    // a town delete to silently orphan a business or wipe someone's home
    // town off their account.
    const [{ count: spotCount }, { count: profileCount }] = await Promise.all([
      supabase.from('spots').select('id', { count: 'exact', head: true }).eq('town_id', townId),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('town_id', townId),
    ])

    if (spotCount > 0) {
      return { error: { message: `Can't delete — ${spotCount} business${spotCount===1?'':'es'} still listed in this town. Remove those spots first, or just deactivate the town instead.` } }
    }
    if (profileCount > 0) {
      return { error: { message: `Can't delete — ${profileCount} ${profileCount===1?'person has':'people have'} this set as their home town. Deactivating hides it from new signups without affecting existing members.` } }
    }

    const { error } = await supabase.from('towns').delete().eq('id', townId)
    if (!error) await fetchAll()
    return { error }
  }

  async function markRequestStatus(requestId, status) {
    const { error } = await supabase.from('town_requests').update({ status }).eq('id', requestId)
    if (!error) await fetchAll()
    return { error }
  }

  return { towns, requests, loading, addTown, toggleTownActive, deleteTown, markRequestStatus, refetch: fetchAll }
}

// ── Check if current user is an admin ─────────────────────────────────────────
export function useIsAdmin() {
  const { profile } = useAuth()
  return profile?.is_admin === true
}

// ── Founder badge: first 50 signups ───────────────────────────────────────────
export function useFounderStatus() {
  const { session } = useAuth()
  const [status, setStatus] = useState({ isFounder: false, rank: null, claimed: 0, loading: true })

  useEffect(() => {
    if (!session) { setStatus(s => ({ ...s, loading: false })); return }
    let cancelled = false

    async function load() {
      const [mine, count] = await Promise.all([
        supabase.rpc('my_founder_status'),
        supabase.rpc('founder_count'),
      ])
      if (cancelled) return
      const row = mine.data?.[0]
      setStatus({
        isFounder: row?.is_founder ?? false,
        rank:      row?.signup_rank ?? null,
        claimed:   count.data ?? 0,
        loading:   false,
      })
    }
    load()
    return () => { cancelled = true }
  }, [session])

  return status
}

// ── Admin: manage all spots (moderation) ──────────────────────────────────────
export function useAdminSpots() {
  const [spots,   setSpots]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSpots = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('spots')
      .select('*, towns(name, state), profiles(full_name)')
      .order('created_at', { ascending: false })
    setSpots(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSpots() }, [fetchSpots])

  async function deleteSpot(spotId) {
    const { error } = await supabase.from('spots').delete().eq('id', spotId)
    if (!error) await fetchSpots()
    return { error }
  }

  return { spots, loading, deleteSpot, refetch: fetchSpots }
}

