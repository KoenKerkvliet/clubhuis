export function supportsAppBadge() {
  return typeof navigator.setAppBadge === 'function'
}

export async function setAppBadge(count: number) {
  if (!navigator.setAppBadge || !navigator.clearAppBadge) return

  try {
    if (count > 0) await navigator.setAppBadge(count)
    else await navigator.clearAppBadge()
  } catch {
    // Badges zijn een extraatje; een apparaat dat ze weigert mag de app niet blokkeren.
  }
}

export async function requestBadgePermission() {
  if (!('Notification' in window)) return supportsAppBadge()
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}
