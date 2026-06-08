import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT, ADSENSE_SLOT, getConsent } from '../lib/thirdParty'

// 広告の“枠”。環境変数 VITE_ADSENSE_CLIENT が設定され、かつ利用者の同意があるときは
// 実際の Google AdSense ユニット(<ins class="adsbygoogle">)を描画する。
// それ以外（未設定／未同意＝開発中や審査前）は、これまで通り点線のプレースホルダー枠を出す。
//   label   … 「広告」などの見出し（多言語：辞書から）
//   note    … 補足テキスト
//   variant … 枠の形（banner=横長 / side=縦長 / inline=画面内）
function AdSlot({ label, note, variant = 'inline' }) {
  const insRef = useRef(null)
  // 設定済みかつ「拒否されていない」なら実広告（オプトアウト方式。thirdParty.initと整合）
  const showReal = !!ADSENSE_CLIENT && getConsent() !== 'denied'

  useEffect(() => {
    if (!showReal) return
    try {
      // AdSense にこの枠の描画を依頼
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
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
        data-ad-slot={ADSENSE_SLOT || undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    )
  }

  // プレースホルダーは利用者向け情報が無いので SR には読み上げさせない（重複ノイズ防止）
  return (
    <div className={`ad-slot ad-${variant}`} aria-hidden="true">
      <div className="ad-slot-label">{label}</div>
      <div className="ad-slot-note">{note}</div>
    </div>
  )
}

export default AdSlot
