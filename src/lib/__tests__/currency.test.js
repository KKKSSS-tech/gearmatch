// 通貨整形・換算・予算プリセットの回帰テスト。
import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatMoney,
  toYen,
  toLocal,
  currencySymbol,
  getBudgetPresets,
} from '../currency'

describe('formatMoney（記号位置・桁区切り）', () => {
  it('米・日は記号前置', () => {
    expect(formatMoney(1000, 'us')).toBe('$1,000')
    expect(formatMoney(1000, 'jp')).toBe('¥1,000')
  })

  it('ユーロ圏(de/fr/es/it)は記号後置（" €"）', () => {
    expect(formatMoney(1000, 'de').endsWith(' €')).toBe(true)
    expect(formatMoney(1000, 'fr').endsWith(' €')).toBe(true)
    expect(formatMoney(1000, 'es').endsWith(' €')).toBe(true)
    expect(formatMoney(1000, 'it').endsWith(' €')).toBe(true)
    // 前置になっていない
    expect(formatMoney(1000, 'de').startsWith('€')).toBe(false)
  })

  it('桁区切りがロケール準拠（独 "1.000" / 仏 "1 000" / 米 "1,000"）', () => {
    // 独：ピリオド区切り
    expect(formatMoney(1000, 'de')).toContain('1.000')
    // 仏：スペース区切り（通常スペース or NBSP/NNBSP のいずれか）
    expect(/1\s000/.test(formatMoney(1000, 'fr'))).toBe(true)
    // 米：カンマ区切り
    expect(formatMoney(1000, 'us')).toContain('1,000')
  })

  it('小数は四捨五入して整数表示', () => {
    expect(formatMoney(999.6, 'us')).toBe('$1,000')
    expect(formatMoney(1000.4, 'us')).toBe('$1,000')
  })

  it('未知の地域は日本(¥)にフォールバック', () => {
    expect(formatMoney(1000, 'zz')).toBe('¥1,000')
  })
})

describe('formatPrice（円→現地通貨表記）', () => {
  it('円価格を各国通貨の現地表記に換算', () => {
    // 米：$ 前置・カンマ
    expect(formatPrice(150000, 'us').startsWith('$')).toBe(true)
    // 独：€ 後置
    expect(formatPrice(150000, 'de').endsWith(' €')).toBe(true)
    // 日：¥ 前置・そのまま
    expect(formatPrice(150000, 'jp')).toBe('¥150,000')
  })

  it('レート換算が効いている（同じ円でも国で金額が変わる）', () => {
    const yen = 1000000
    // 米ドル換算は円の生値より小さい数値、韓国ウォンは大きい数値になる
    const us = toLocal(yen, 'us')
    const kr = toLocal(yen, 'kr')
    expect(us).toBeLessThan(yen)
    expect(kr).toBeGreaterThan(yen)
  })
})

describe('toLocal / toYen の往復', () => {
  it('円→現地→円 が概ね整合（丸め誤差の範囲）', () => {
    for (const region of ['us', 'de', 'kr', 'tw', 'cn', 'jp']) {
      const yen = 200000
      const local = toLocal(yen, region)
      const back = toYen(local, region)
      // レート換算の丸めにより多少ずれるが、5%以内に収まる
      const diff = Math.abs(back - yen) / yen
      expect(diff).toBeLessThan(0.05)
    }
  })

  it('現地→円→現地 も概ね整合', () => {
    for (const region of ['us', 'de', 'kr']) {
      const local = 2000
      const yen = toYen(local, region)
      const back = toLocal(yen, region)
      const diff = Math.abs(back - local) / local
      expect(diff).toBeLessThan(0.05)
    }
  })

  it('日本(rate=1)は往復で完全一致', () => {
    expect(toLocal(123456, 'jp')).toBe(123456)
    expect(toYen(123456, 'jp')).toBe(123456)
  })

  it('未知の地域は日本扱い（rate=1）', () => {
    expect(toLocal(1000, 'zz')).toBe(1000)
    expect(toYen(1000, 'zz')).toBe(1000)
  })
})

describe('currencySymbol', () => {
  it('各国の通貨記号を返す', () => {
    expect(currencySymbol('us')).toBe('$')
    expect(currencySymbol('jp')).toBe('¥')
    expect(currencySymbol('de')).toBe('€')
    expect(currencySymbol('kr')).toBe('₩')
    expect(currencySymbol('uk')).toBe('£')
  })
  it('未知の地域は ¥ にフォールバック', () => {
    expect(currencySymbol('zz')).toBe('¥')
  })
})

describe('getBudgetPresets', () => {
  it('各要素に valueYen と label を持つ', () => {
    const presets = getBudgetPresets('us', 'No limit', 'Under ')
    expect(presets.length).toBeGreaterThan(1)
    for (const p of presets) {
      expect(p).toHaveProperty('valueYen')
      expect(p).toHaveProperty('label')
      expect(typeof p.label).toBe('string')
    }
  })

  it('末尾は上限なし(Infinity)で、ラベルは noLimitLabel', () => {
    const presets = getBudgetPresets('us', 'No limit', 'Under ')
    const last = presets[presets.length - 1]
    expect(last.valueYen).toBe(Infinity)
    expect(last.label).toBe('No limit')
  })

  it('Infinity を除いた valueYen は昇順かつ有限の数値', () => {
    const presets = getBudgetPresets('jp', '上限なし', '〜')
    const finite = presets.filter((p) => p.valueYen !== Infinity)
    for (let i = 1; i < finite.length; i++) {
      expect(finite[i].valueYen).toBeGreaterThan(finite[i - 1].valueYen)
      expect(Number.isFinite(finite[i].valueYen)).toBe(true)
    }
  })

  it('ラベルは現地表記（米は $ 前置・prefix 付き、独は € 後置）', () => {
    const us = getBudgetPresets('us', 'No limit', 'Under ')
    expect(us[0].label.startsWith('Under $')).toBe(true)
    const de = getBudgetPresets('de', 'Kein Limit', 'Bis ')
    expect(de[0].label.startsWith('Bis ')).toBe(true)
    expect(de[0].label.endsWith(' €')).toBe(true)
  })

  it('prefix 省略時はそのまま金額ラベル', () => {
    const jp = getBudgetPresets('jp', '上限なし')
    expect(jp[0].label.startsWith('¥')).toBe(true)
  })

  it('未知の地域は日本のプリセット（円換算）にフォールバック', () => {
    const zz = getBudgetPresets('zz', '上限なし', '〜')
    // 日本のプリセット(jp)と同じ valueYen 列になる（rate=1, jp プリセット）
    const jp = getBudgetPresets('jp', '上限なし', '〜')
    expect(zz.map((p) => p.valueYen)).toEqual(jp.map((p) => p.valueYen))
  })
})
