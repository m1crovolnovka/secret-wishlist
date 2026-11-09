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

function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
}

/**
 * Telegram Desktop can hang forever on viewport.mount() (safe-area event bug).
 * Never await it without a hard timeout — otherwise the Mini App stays on a white screen.
 */
export async function initTelegram() {
  try {
    initSdk()

    // Tell Telegram to swap its loader for our UI as early as possible
    if (can(miniApp.mount)) miniApp.mount()
    if (can(miniApp.ready)) miniApp.ready()

    if (can(themeParams.mount)) themeParams.mount()

    if (can(viewport.mount)) {
      await withTimeout(
        typeof viewport.mount === 'function' ? viewport.mount({ timeout: 800 }) : viewport.mount(),
        1000,
      )
      try {
        if (can(viewport.expand)) viewport.expand()
      } catch {
        // ignore
      }
    }

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
    try {
      if (can(miniApp.ready)) miniApp.ready()
    } catch {
      // ignore
    }
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
    const fromLp =
      lp.startParam ||
      lp.tgWebAppStartParam ||
      lp.start_param ||
      ''
    if (fromLp) return String(fromLp)
  } catch {
    // outside Telegram / old client
  }
  try {
    const tg = window.Telegram?.WebApp
    const fromTg = tg?.initDataUnsafe?.start_param || ''
    if (fromTg) return String(fromTg)
  } catch {
    // ignore
  }
  const q = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
  return (
    q.get('startapp') ||
    q.get('tgWebAppStartParam') ||
    hash.get('tgWebAppStartParam') ||
    ''
  )
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
