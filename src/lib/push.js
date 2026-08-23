import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Push needs three separate things to be true, and they fail for different
// reasons — so callers get the reason, not just false.
export function pushSupport() {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' }

  const hasSW   = 'serviceWorker' in navigator
  const hasPush = 'PushManager' in window
  if (!hasSW || !hasPush) return { ok: false, reason: 'unsupported' }

  const ua    = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches

  // iOS 16.4+ supports web push, but ONLY for apps added to the home screen.
  // In Safari the API objects exist yet subscribing always fails, so check
  // this before showing an opt-in the person cannot complete.
  if (isIOS && !isStandalone) return { ok: false, reason: 'ios-needs-install' }

  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'not-configured' }

  return { ok: true, reason: null }
}

export function permissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission   // 'default' | 'granted' | 'denied'
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

// The VAPID public key travels as base64url but PushManager wants raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

function keyToBase64(subscription, name) {
  const key = subscription.getKey(name)
  if (!key) return null
  return window.btoa(String.fromCharCode(...new Uint8Array(key)))
}

/**
 * Ask permission, subscribe, and store the subscription.
 * MUST be called from a click handler — browsers reject a permission prompt
 * that isn't tied to a user gesture, and Safari does so permanently.
 */
export async function subscribeToPush() {
  const support = pushSupport()
  if (!support.ok) return { error: support.reason }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { error: 'denied' }

  const registration = await registerServiceWorker()
  if (!registration) return { error: 'unsupported' }
  await navigator.serviceWorker.ready

  // Reuse an existing browser-level subscription if there is one; creating a
  // second for the same device just orphans the first.
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,   // required — Chrome rejects silent push outright
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not-signed-in' }

  const p256dh = keyToBase64(subscription, 'p256dh')
  const auth   = keyToBase64(subscription, 'auth')
  if (!p256dh || !auth) return { error: 'bad-subscription' }

  // Conflict on endpoint: the same device re-subscribing updates its row
  // rather than piling up duplicates that would each get their own copy.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 300),
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  if (error) return { error: error.message }
  return { error: null }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()

    if (subscription) {
      // Remove the row FIRST. If the order were reversed and the delete
      // failed, the server would keep pushing to a dead endpoint forever.
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      await subscription.unsubscribe()
    }
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

// Is THIS device subscribed? Permission alone isn't enough — someone can grant
// permission on their phone and still be unsubscribed on their laptop.
export async function isSubscribedHere() {
  try {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
