// 外部スクリプト（広告 / アクセス解析）の読み込み制御。
// Publisher metadata verifies ownership; delivery still requires Google approval.
// VITE_ADSENSE_SLOT is required for manual units. Empty slots are not Auto ads.
// Google-certified regional CMP configuration is separate from local opt-in.

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-9932958665424466'
export const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || ''
export const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || ''

// Configured publisher ID does not mean that Google has approved the site.
export const adsEnabled = !!ADSENSE_CLIENT

const CONSENT_KEY = 'gm-consent-v2' // Reset legacy opt-out choices; ask explicitly.
export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) || null
  } catch {
    return null
  }
}
export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    /* ストレージ不可環境は無視 */
  }
}

let adsLoaded = false
// Load once after opt-in; this does not replace Google's certified regional CMP.
export function loadAdSense() {
  if (adsLoaded || !ADSENSE_CLIENT || getConsent() !== 'granted') return
  if (document.querySelector('script[src*="pagead/js/adsbygoogle.js"]')) {
    adsLoaded = true
    return
  }
  adsLoaded = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}

let plausibleLoaded = false
// Plausible（cookieレス・個人情報を集めない）。同意不要なので設定があれば常時読み込む。
export function loadPlausible() {
  if (plausibleLoaded || !PLAUSIBLE_DOMAIN) return
  plausibleLoaded = true
  const s = document.createElement('script')
  s.defer = true
  s.setAttribute('data-domain', PLAUSIBLE_DOMAIN)
  s.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(s)
}

// カスタムイベント送信（送客クリック等の計測＝送客課金の根拠データ用）。
// Plausible があればそれ、無ければ gtag、どちらも無ければ何もしない（安全な no-op）。
export function track(event, props) {
  try {
    if (typeof window === 'undefined') return
    if (typeof window.plausible === 'function') window.plausible(event, props ? { props } : undefined)
    else if (typeof window.gtag === 'function') window.gtag('event', event, props || {})
  } catch {
    /* 計測失敗はユーザー操作を妨げない */
  }
}

// Do not request advertising until the visitor explicitly opts in.
// Site verification remains available through the static publisher meta tag.
export function initThirdParty() {
  loadPlausible()
  if (adsEnabled && getConsent() === 'granted') loadAdSense()
}
