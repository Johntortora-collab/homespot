// Homespot — send push notifications for an offer.
//
// Deploy:  supabase functions deploy send-offer-push
//
// Called by the owner dashboard right after an offer row is inserted. It
// resolves the audience, fans out the pushes, and prunes dead subscriptions.
//
// Runs with the SERVICE ROLE key so it can read every subscriber's endpoint —
// that key must never reach the browser. It lives only in Supabase's function
// secrets, which is why this work can't happen client-side.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@gethomespot.app'

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: 'VAPID keys are not configured on the function.' }, 500)
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const { offerId } = await req.json()
    if (!offerId) return json({ error: 'offerId is required' }, 400)

    // Verify the CALLER owns the spot this offer belongs to. Without this,
    // anyone with the anon key could trigger a push to another business's
    // customer list — the whole point of the auth check.
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await asUser.auth.getUser()
    if (userErr || !user) return json({ error: 'Not signed in' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: offer, error: offerErr } = await admin
      .from('offers')
      .select('id, spot_id, message, target, spots(id, name, emoji, owner_id)')
      .eq('id', offerId)
      .single()

    if (offerErr || !offer) return json({ error: 'Offer not found' }, 404)
    if (offer.spots?.owner_id !== user.id) {
      return json({ error: 'That offer belongs to another business.' }, 403)
    }

    // Who should hear about this?
    const { data: recipients, error: recErr } = await admin
      .rpc('offer_recipients', { p_spot_id: offer.spot_id, p_target: offer.target })
    if (recErr) return json({ error: recErr.message }, 500)

    const userIds = (recipients ?? []).map((r: { user_id: string }) => r.user_id)
    if (userIds.length === 0) return json({ sent: 0, failed: 0, recipients: 0 })

    const { data: subs, error: subErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds)
    if (subErr) return json({ error: subErr.message }, 500)

    const payload = JSON.stringify({
      title: `${offer.spots?.emoji ?? '📍'} ${offer.spots?.name ?? 'A local spot'}`,
      body:  offer.message,
      url:   `/scan/${offer.spot_id}`,
      tag:   `offer-${offer.spot_id}`,
    })

    let sent = 0
    const dead: string[] = []

    // Fan out in parallel. One bad endpoint must not stop the rest, so every
    // failure is caught individually rather than letting Promise.all reject.
    await Promise.all((subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: any) {
        // 404/410 mean the browser threw the subscription away — uninstalled
        // app, cleared data, revoked permission. Those rows are garbage and
        // will fail forever if we keep them.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          dead.push(sub.id)
        } else {
          console.error('push failed', sub.id, err?.statusCode, err?.message)
        }
      }
    }))

    if (dead.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', dead)
    }

    return json({
      recipients: userIds.length,
      sent,
      failed: (subs?.length ?? 0) - sent,
      pruned: dead.length,
    })
  } catch (err) {
    console.error(err)
    return json({ error: (err as Error).message }, 500)
  }
})
