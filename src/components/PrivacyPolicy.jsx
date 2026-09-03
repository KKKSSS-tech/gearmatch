import { useEffect, useRef } from 'react'

// プライバシーポリシーのモーダル。AdSense 審査の要件でもある。
// 文言は日本語(ja)と英語(en・それ以外のフォールバック)を内蔵（将来 各言語へ拡張可）。
//   lang … 表示言語コード / t … 辞書(見出し・閉じる) / onClose … 閉じる
function PrivacyPolicy({ lang, t, onClose }) {
  const modalRef = useRef(null)
  // onClose は呼び出し側でインライン生成され毎レンダー変わるので、ref 経由で“最新版”を呼ぶ。
  // これでグローバルな keydown リスナーはモーダルの生存中に一度だけ張れば済む（再バインド churn を回避）。
  // ※ ref への代入はレンダー中ではなく effect 内で行う（React の作法）。
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // アクセシブルなモーダル：開いたら内部へフォーカス／Tabを内側に閉じ込め（フォーカストラップ）／
  // Escで閉じる／閉じたら開く前の要素（フッターのリンク等）へフォーカスを戻す。
  useEffect(() => {
    const prevFocus = document.activeElement
    const getFocusable = () =>
      modalRef.current
        ? [...modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
            (el) => !el.disabled && el.offsetParent !== null
          )
        : []
    const firstEl = getFocusable()[0]
    if (firstEl) firstEl.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const items = getFocusable()
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [])

  const ja = lang === 'ja'
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.privacyPolicy}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label={t.close || 'Close'}>
          ×
        </button>
        <h2 className="modal-title">{t.privacyPolicy}</h2>
        <div className="modal-body">
          {ja ? (
            <>
              <p>
                ギアマッチ（以下「本サービス」）は、カメラ・レンズ選びを支援する情報ツールです。
                本サービスはアカウント登録を必要とせず、運営者が氏名・メールアドレス等の個人情報を直接収集することはありません。
              </p>
              <h3>1. 利用するデータ</h3>
              <p>
                診断結果の計算は、お使いのブラウザ内で行います。一部の設定（同意状態など）はブラウザの
                localStorage に保存されます。アクセス解析が設定されている場合、操作イベントに選択項目などが含まれることがあります。
              </p>
              <h3>2. 広告について</h3>
              <p>
                本サービスは第三者配信の広告サービス（Google AdSense 等）を利用する場合があります。
                これらの事業者は、利用者の興味に応じた広告を表示するために Cookie 等を使用することがあります。
                広告 Cookie の利用は、画面下部のバナーでの同意に基づいて行われます。Google の広告における
                データ利用については Google のポリシーをご確認ください。
              </p>
              <h3>3. アクセス解析</h3>
              <p>
                利用状況の把握のため、Cookie を使わないプライバシー配慮型のアクセス解析（Plausible 等）を
                用いる場合があります。外部サービスへの通信や設定に応じた計測の詳細は、下記の詳しいポリシーをご確認ください。
              </p>
              <h3>4. 外部サイトへのリンク</h3>
              <p>
                結果ページには各販売店（EC サイト）の検索ページへのリンクが含まれます。リンク先での取り扱いは
                各サイトのプライバシーポリシーに従います。表示価格は目安であり、実際の価格はリンク先でご確認ください。
              </p>
              <h3>5. お問い合わせ・改定</h3>
              <p>
                詳しい取り扱いと公開の問い合わせ先は<a href="/privacy.html">プライバシーとお問い合わせ</a>をご覧ください。
              </p>
            </>
          ) : (
            <>
              <p>
                Gear Match (“the Service”) is an informational tool that helps you choose cameras and lenses.
                It requires no account, and the operator does not directly collect personal information such as
                your name or email address.
              </p>
              <h3>1. Data we use</h3>
              <p>
                Recommendation calculations run in your browser. Some settings (such as your consent choice)
                are stored in your browser’s localStorage. If analytics is configured, interaction events may
                include selected options.
              </p>
              <h3>2. Advertising</h3>
              <p>
                The Service may use third-party advertising (e.g. Google AdSense). These providers may use cookies
                to show ads relevant to your interests. Advertising cookies are used based on your choice in the
                banner at the bottom of the page. See Google’s policies for how Google uses data in advertising.
              </p>
              <h3>3. Analytics</h3>
              <p>
                We may use cookieless analytics (e.g. Plausible) to understand usage. See the detailed policy below
                for external requests and measurement that depends on the site's configuration.
              </p>
              <h3>4. Links to external sites</h3>
              <p>
                Result pages include links to retailers’ (e-commerce) search pages. Their handling of your data is
                governed by each site’s own privacy policy. Displayed prices are estimates; confirm the actual
                price on the linked site.
              </p>
              <h3>5. Contact &amp; changes</h3>
              <p>
                See <a href="/privacy.html#english">Privacy &amp; contact</a> for details and our public contact channel.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
