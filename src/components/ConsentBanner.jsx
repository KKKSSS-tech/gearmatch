import { useState } from 'react'
import { adsEnabled, getConsent, setConsent } from '../lib/thirdParty'

// 広告が設定済み(adsEnabled)で、まだ同意/拒否を選んでいないときだけ出すクッキー同意バー。
// EU等の個人化広告は同意なしに出さない方針。広告が未設定の開発中・審査前は表示しない。
//   t        … 辞書（多言語の文言）
//   onPrivacy… プライバシーポリシーを開くコールバック
function ConsentBanner({ t, onPrivacy }) {
  const [visible, setVisible] = useState(() => adsEnabled && getConsent() === null)
  if (!visible) return null

  // オプトアウト方式：広告は既定で読み込み済み。同意はそのまま閉じるだけ、拒否は再読込で広告を止める。
  const accept = () => {
    setConsent('granted')
    setVisible(false)
  }
  const decline = () => {
    setConsent('denied')
    window.location.reload()
  }

  return (
    <div className="consent-banner" role="region" aria-label={t.privacyPolicy}>
      <p className="consent-text">
        {t.consentText}{' '}
        <button type="button" className="consent-link" onClick={onPrivacy}>
          {t.privacyPolicy}
        </button>
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-decline" onClick={decline}>
          {t.consentDecline}
        </button>
        <button type="button" className="consent-accept" onClick={accept}>
          {t.consentAccept}
        </button>
      </div>
    </div>
  )
}

export default ConsentBanner
