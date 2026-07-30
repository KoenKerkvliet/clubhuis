export const NOTIFICATIONS_CHANGED_EVENT = 'clubhuis:notifications-changed'

export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
}
