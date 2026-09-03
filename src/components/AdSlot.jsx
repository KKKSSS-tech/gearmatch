import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOT, getConsent } from '../lib/thirdParty'

// 広告の“枠”。環境変数 VITE_ADSENSE_CLIENT が設定され、かつ利用者の同意があるときは
// 実際の Google AdSense ユニット(<ins class="adsbygoogle">)を描画する。
// 未設定・未同意では空の広告枠を表示しない。
//   label   … 「広告」などの見出し（多言語：辞書から）
//   note    … 補足テキスト
//   variant … 枠の形（banner=横長 / side=縦長 / inline=画面内）
function AdSlot({ variant = 'inline' }) {
  const insRef = useRef(null)
  const requestedRef = useRef(false)
  // A valid manual slot and explicit opt-in are both required.
  const showReal = /^ca-pub-\d{16}$/.test(ADSENSE_CLIENT) && /^\d+$/.test(ADSENSE_SLOT) && getConsent() === 'granted'

  useEffect(() => {
    if (!showReal || requestedRef.current || insRef.current?.getAttribute('data-ad-status')) return
    try {
      requestedRef.current = true
      // AdSense にこの枠の描画を依頼
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      requestedRef.current = false
      /* ローダー未到達などは無視（次回描画で回復） */
    }
  }, [showReal])

  if (showReal) {
    return (
      <ins
        ref={insRef}
        className={`adsbygoogle ad-slot ad-${variant}`}
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    )
  }

  // No placeholder or invalid unit request before configuration and consent.
  return null
}

export default AdSlot
