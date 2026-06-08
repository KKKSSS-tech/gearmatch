// 外部スクリプト（広告 / アクセス解析）の読み込み制御。
// 環境変数が設定されているときだけ有効化する＝未設定の開発中は広告プレースホルダのまま・解析も無し。
//   VITE_ADSENSE_CLIENT … Google AdSense のパブリッシャーID（ca-pub-XXXX）。これがあると本番広告が出せる。
//   VITE_ADSENSE_SLOT   … （任意）広告ユニットのスロットID。無ければ自動広告フォーマット。
//   VITE_PLAUSIBLE_DOMAIN … （任意）Plausible のドメイン。cookieレスなのでEUでも同意不要で計測できる。

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || ''
export const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || ''
export const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || ''

// 広告が「設定済み（出せる状態）」か。これが false の間は同意バナーも出さない（無意味なため）。
export const adsEnabled = !!ADSENSE_CLIENT

const CONSENT_KEY = 'gm-consent' // 'granted' | 'denied'
export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY)
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
// AdSense ローダーを1回だけ読み込む（同意が得られてから呼ぶ＝EU配慮）。
export function loadAdSense() {
  if (adsLoaded || !ADSENSE_CLIENT) return
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

// 起動時の初期化：解析は常時。広告は「設定済み」かつ「明示的に拒否されていない」なら読み込む
// （＝オプトアウト方式。AdSense審査クローラにも広告コードが見え、承認を通しやすい）。
// ※ EUの厳格な同意管理が必要になったら、Google認定CMPの導入を検討（README参照）。
export function initThirdParty() {
  loadPlausible()
  if (adsEnabled && getConsent() !== 'denied') loadAdSense()
}
