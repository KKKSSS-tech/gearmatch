import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

const source = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

describe('publisher readiness', () => {
  it('shows the stored planning price without fabricated retailer quotes', async () => {
    const { default: ResultCard } = await import('../../components/ResultCard.jsx')
    const { ja } = await import('../../i18n/ja.js')
    const html = renderToStaticMarkup(createElement(ResultCard, {
      item: { name: 'Test Camera', brand: 'Test', price: 100000 }, rank: 1,
      region: 'JP', condition: 'used', grade: ['A', 'B'], t: ja, lang: 'ja',
    }))
    expect(html).toContain('66,000')
    expect(html).not.toContain('price-amount')
    expect(html).not.toContain('price-summary-cheapest')
    expect(html).not.toContain('最安')
  })
  it('keeps verification metadata without unconditional ad requests on entry pages', () => {
    for (const file of ['index.html', 'public/about.html', 'public/guide.html', 'public/faq.html', 'public/en/about.html', 'public/en/guide.html', 'public/en/faq.html', 'public/field-guide.html', 'public/privacy.html']) {
      const html = source(file)
      expect(html).toContain('google-adsense-account')
      expect(html).not.toMatch(/<script[^>]+src="https:\/\/pagead2/)
    }
  })
  it('returns real 404s rather than rewriting every unknown URL to the finder', () => {
    expect(JSON.parse(source('vercel.json')).rewrites).toBeUndefined()
    expect(source('public/404.html')).toContain('noindex')
  })
  it('includes public static guidance and policy links in the HTML entry', () => {
    const html = source('index.html')
    expect(html).toContain('/field-guide.html')
    expect(html).toContain('/privacy.html')
    expect(html).toContain('リアルタイムに調べるサービスではありません')
  })
  it.each([null, '', 'denied', 'anything'])('does not load ads for consent %s', async (consent) => {
    vi.stubGlobal('localStorage', { getItem: () => consent })
    const appendChild = vi.fn()
    vi.stubGlobal('document', { head: { appendChild }, createElement: vi.fn() })
    const { loadAdSense } = await import('../thirdParty.js')
    loadAdSense()
    expect(appendChild).not.toHaveBeenCalled()
  })
  it('loads only once after explicit consent', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'granted' })
    const appendChild = vi.fn()
    vi.stubGlobal('document', { querySelector: () => null, head: { appendChild }, createElement: () => ({}) })
    const { loadAdSense } = await import('../thirdParty.js')
    loadAdSense(); loadAdSense()
    expect(appendChild).toHaveBeenCalledTimes(1)
  })
  it('does not create a manual unit without a slot ID', async () => {
    vi.stubEnv('VITE_ADSENSE_SLOT', '')
    vi.stubGlobal('localStorage', { getItem: () => 'granted' })
    const { default: AdSlot } = await import('../../components/AdSlot.jsx')
    expect(renderToStaticMarkup(createElement(AdSlot))).toBe('')
  })
})
