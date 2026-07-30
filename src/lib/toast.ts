export const TOAST_EVENT = 'clubhuis:toast'

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }))
}
