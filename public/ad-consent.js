// One loader for article pages. The finder uses its React consent controls.
(() => {
  if (document.getElementById('root')) return
  const key = 'gm-consent-v2'
  let choice = null
  try { choice = localStorage.getItem(key) || null } catch { /* ask without storage */ }
  const english = document.documentElement.lang === 'en'
  const choose = (value) => {
    try { localStorage.setItem(key, value) } catch { return }
    window.location.reload()
  }
  const reset = document.createElement('button')
  reset.textContent = english ? 'Change ad consent' : '広告の同意を変更'
  reset.addEventListener('click', () => choose(''))
  const footer = document.querySelector('footer')
  if (footer) footer.appendChild(reset)
  if (choice === 'granted') {
    if (document.querySelector('script[src*="pagead/js/adsbygoogle.js"]')) return
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9932958665424466'
    document.head.appendChild(script)
  } else if (!choice) {
    const banner = document.createElement('section')
    banner.className = 'gm-consent'
    banner.setAttribute('aria-label', english ? 'Advertising preferences' : '広告の設定')
    const text = document.createElement('p')
    text.textContent = english ? 'Allow Google advertising to load? You can read this site without ads. ' : 'Googleの広告を読み込みますか？拒否してもすべての記事と診断を利用できます。'
    const policy = document.createElement('a')
    policy.href = '/privacy.html'
    policy.textContent = english ? 'Privacy details' : '詳しい取り扱い'
    text.appendChild(policy)
    banner.appendChild(text)
    for (const [label, value] of [[english ? 'Decline' : '拒否する', 'denied'], [english ? 'Allow' : '同意する', 'granted']]) {
      const button = document.createElement('button')
      button.textContent = label
      button.addEventListener('click', () => choose(value))
      banner.appendChild(button)
    }
    document.body.appendChild(banner)
  }
})()
