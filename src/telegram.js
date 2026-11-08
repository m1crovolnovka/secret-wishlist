import {
  backButton,
  hapticFeedback,
  init as initSdk,
  miniApp,
  retrieveLaunchParams,
  retrieveRawInitData,
  swipeBehavior,
  themeParams,
  viewport,
} from '@telegram-apps/sdk'

let ready = false

function can(fn) {
  try {
    return typeof fn?.isAvailable === 'function' ? fn.isAvailable() : typeof fn === 'function'
  } catch {
    return false
  }
}

export async function initTelegram() {
  try {
    initSdk()
    if (can(miniApp.mount)) miniApp.mount()
    if (can(miniApp.ready)) miniApp.ready()
    if (can(viewport.mount)) {
      await viewport.mount()
      if (can(viewport.expand)) viewport.expand()
    }
    if (can(themeParams.mount)) themeParams.mount()
    if (can(swipeBehavior.mount)) {
      swipeBehavior.mount()
      if (can(swipeBehavior.disableVertical)) swipeBehavior.disableVertical()
    }
    if (can(backButton.mount)) backButton.mount()
    applySafeArea()
    applyTelegramTheme()
    ready = true
  } catch {
    ready = false
  }
  return ready
}

export function getInitData() {
  try {
    const raw = retrieveRawInitData()
    if (raw) return raw
  } catch {
    // ignore
  }
  try {
    const lp = retrieveLaunchParams()
    return lp.initDataRaw || ''
  } catch {
    return ''
  }
}

export function getStartParam() {
  try {
    const lp = retrieveLaunchParams()
    return lp.startParam || ''
  } catch {
    const q = new URLSearchParams(window.location.search)
    return q.get('startapp') || q.get('tgWebAppStartParam') || ''
  }
}

export function applyTelegramTheme() {
  try {
    const state = typeof themeParams.state === 'function' ? themeParams.state() : null
    if (!state) return
    const root = document.documentElement
    if (state.bgColor || state.backgroundColor) {
      root.style.setProperty('--tg-bg', state.bgColor || state.backgroundColor)
    }
    if (state.textColor) root.style.setProperty('--tg-text', state.textColor)
    if (state.buttonColor) root.style.setProperty('--tg-button', state.buttonColor)
    if (state.secondaryBgColor || state.secondaryBackgroundColor) {
      root.style.setProperty('--tg-secondary', state.secondaryBgColor || state.secondaryBackgroundColor)
    }
  } catch {
    // outside Telegram
  }
}

export function applySafeArea() {
  const root = document.documentElement
  root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)')
  root.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)')
  try {
    const insets =
      (typeof viewport.safeAreaInsets === 'function' && viewport.safeAreaInsets()) ||
      (typeof viewport.state === 'function' && viewport.state()?.safeAreaInsets)
    if (insets) {
      root.style.setProperty('--safe-top', `${insets.top || 0}px`)
      root.style.setProperty('--safe-bottom', `${insets.bottom || 0}px`)
    }
  } catch {
    // ignore
  }
}

export function haptic(type = 'light') {
  try {
    if (type === 'success' && can(hapticFeedback.notificationOccurred)) {
      hapticFeedback.notificationOccurred('success')
      return
    }
    if (can(hapticFeedback.impactOccurred)) hapticFeedback.impactOccurred(type === 'light' ? 'light' : 'medium')
  } catch {
    // ignore
  }
}

export function showBackButton(onClick) {
  try {
    if (!can(backButton.show)) return () => {}
    backButton.show()
    const off = can(backButton.onClick) ? backButton.onClick(onClick) : null
    return () => {
      try {
        off?.()
        if (can(backButton.hide)) backButton.hide()
      } catch {
        // ignore
      }
    }
  } catch {
    return () => {}
  }
}
