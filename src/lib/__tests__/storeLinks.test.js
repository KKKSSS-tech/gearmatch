// 店舗リンク生成の回帰テスト。
import { describe, it, expect } from 'vitest'
import { getStoreLinks } from '../storeLinks'

// 中古/フリマ専門店の名前（used:true のもの）。new 検索では出てはいけない。
const USED_ONLY_STORES = [
  'MPB',
  'eBay',
  'KEH',
  'メルカリ',
  'Carousell',
  '闲鱼',
  '旋轉拍賣',
  '번개장터',
]

const ALL_REGIONS = ['jp', 'us', 'uk', 'de', 'kr', 'fr', 'it', 'es', 'au', 'ca', 'cn', 'tw', 'sg']

describe('getStoreLinks: condition による中古店の出し分け', () => {
  it("condition='new' は中古/フリマ専門店を一切含まない（全地域）", () => {
    for (const region of ALL_REGIONS) {
      const links = getStoreLinks(region, 'Sony α7 IV', 'new')
      const names = links.map((l) => l.name)
      for (const used of USED_ONLY_STORES) {
        expect(names, `region=${region} に中古店 ${used} が混入`).not.toContain(used)
      }
    }
  })

  it("condition='used' は中古/フリマ専門店を含む（存在する地域で）", () => {
    // us は KEH/MPB/eBay を持つ
    const us = getStoreLinks('us', 'Sony α7 IV', 'used').map((l) => l.name)
    expect(us).toContain('MPB')
    expect(us).toContain('eBay')
    expect(us).toContain('KEH')
    // jp はメルカリを持つ
    const jp = getStoreLinks('jp', 'Sony α7 IV', 'used').map((l) => l.name)
    expect(jp).toContain('メルカリ')
    // kr は번개장터、cn は闲鱼、tw は旋轉拍賣、sg は Carousell
    expect(getStoreLinks('kr', 'X', 'used').map((l) => l.name)).toContain('번개장터')
    expect(getStoreLinks('cn', 'X', 'used').map((l) => l.name)).toContain('闲鱼')
    expect(getStoreLinks('tw', 'X', 'used').map((l) => l.name)).toContain('旋轉拍賣')
    expect(getStoreLinks('sg', 'X', 'used').map((l) => l.name)).toContain('Carousell')
  })

  it("condition='new' は 'used' より店舗数が少ない（中古店ぶん減る）", () => {
    for (const region of ALL_REGIONS) {
      const newCount = getStoreLinks(region, 'X', 'new').length
      const usedCount = getStoreLinks(region, 'X', 'used').length
      expect(newCount).toBeLessThanOrEqual(usedCount)
    }
  })

  it("condition 未指定（new 以外）は中古店も含む（used 扱い）", () => {
    const us = getStoreLinks('us', 'Sony α7 IV').map((l) => l.name)
    expect(us).toContain('MPB')
  })
})

describe('getStoreLinks: 機種名の正規化', () => {
  it('α(ギリシャ文字)は a に正規化され URL に %CE%B1 が出ない', () => {
    const links = getStoreLinks('us', 'Sony α7 IV', 'new')
    for (const l of links) {
      expect(l.url).not.toContain('%CE%B1') // α のエンコード
      expect(l.url).not.toContain('%CE%91') // Α(大文字アルファ)
    }
    // a に置換されているので、検索クエリに "a7" が含まれる（amazon の k= など）
    const amazon = links.find((l) => l.name === 'Amazon')
    expect(amazon.url.toLowerCase()).toContain('a7')
  })

  it('(中古) などの括弧書きは検索クエリから除去される', () => {
    const links = getStoreLinks('jp', 'Sony α7 IV（中古）', 'used')
    for (const l of links) {
      // 「中古」の文字（エンコード or 生）が URL に残らない
      expect(l.url).not.toContain(encodeURIComponent('中古'))
      expect(l.url).not.toContain('中古')
      // 括弧も残らない
      expect(l.url).not.toContain(encodeURIComponent('（'))
      expect(l.url).not.toContain(encodeURIComponent('）'))
    }
  })

  it('半角括弧 (RF) などの注記も除去される', () => {
    const links = getStoreLinks('us', 'Sigma 28-70mm F2.8 (RF)', 'new')
    const amazon = links.find((l) => l.name === 'Amazon')
    // "RF" の括弧書きが消えている（クエリに ( ) が残らない）
    expect(amazon.url).not.toContain('%28') // (
    expect(amazon.url).not.toContain('%29') // )
  })
})

describe('getStoreLinks: 全地域の健全性', () => {
  it('全13地域で https の URL を返す（name/url を持つ）', () => {
    for (const region of ALL_REGIONS) {
      const links = getStoreLinks(region, 'Sony α7 IV', 'new')
      expect(links.length, `region=${region}`).toBeGreaterThan(0)
      for (const l of links) {
        expect(typeof l.name).toBe('string')
        expect(l.url.startsWith('https://'), `region=${region} ${l.name}: ${l.url}`).toBe(true)
      }
    }
  })

  it('未知の地域は日本のお店にフォールバック', () => {
    const zz = getStoreLinks('zz', 'Sony α7 IV', 'new').map((l) => l.name)
    const jp = getStoreLinks('jp', 'Sony α7 IV', 'new').map((l) => l.name)
    expect(zz).toEqual(jp)
  })

  it('検索クエリは URL エンコードされている（スペースが生で残らない）', () => {
    const links = getStoreLinks('us', 'Canon EOS R5 Mark II', 'new')
    for (const l of links) {
      // 生のスペースが URL に残っていない（%20 か + にエンコード）
      expect(/\s/.test(l.url.split('?')[1] || '')).toBe(false)
    }
  })
})
