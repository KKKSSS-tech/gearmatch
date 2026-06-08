// i18n のパリティ（辞書間のキー整合・翻訳網羅）を固定する回帰テスト。
import { describe, it, expect } from 'vitest'
import { ja } from '../ja'
import { en } from '../en'
import { ko } from '../ko'
import { zh } from '../zh'
import { zhTW } from '../zh-TW' // 変数名は zhTW（ハイフン不可）
import { es } from '../es'
import { fr } from '../fr'
import { de } from '../de'
import { STRENGTHS, SENSORS } from '../strengths'
import { CAMERAS } from '../../data/cameras'
import { LENSES } from '../../data/lenses'

// DICTS のキーは 'zh-TW'（ハイフン）。App.jsx と同じ並び。
const DICTS = { ja, en, ko, zh, 'zh-TW': zhTW, es, fr, de }
const DICT_NAMES = Object.keys(DICTS)

// strengths のプロパティキーは 'zh-TW'（ハイフン）。ja は元の日本語キーなので翻訳不要。
const STRENGTH_LANGS = ['en', 'ko', 'zh', 'zh-TW', 'es', 'fr', 'de']

describe('辞書間のトップレベルキー整合', () => {
  it('全8辞書が読み込めている', () => {
    expect(DICT_NAMES).toEqual(['ja', 'en', 'ko', 'zh', 'zh-TW', 'es', 'fr', 'de'])
    for (const name of DICT_NAMES) {
      expect(DICTS[name], `${name} 辞書が未定義`).toBeTruthy()
    }
  })

  it('全辞書のトップレベルキーが ja と完全一致', () => {
    const jaKeys = Object.keys(ja).sort()
    for (const name of DICT_NAMES) {
      const keys = Object.keys(DICTS[name]).sort()
      expect(keys, `${name} のキーが ja と不一致`).toEqual(jaKeys)
    }
  })

  it('辞書同士で過不足キーが無い（差分ゼロ）', () => {
    const jaSet = new Set(Object.keys(ja))
    for (const name of DICT_NAMES) {
      const set = new Set(Object.keys(DICTS[name]))
      const missing = [...jaSet].filter((k) => !set.has(k))
      const extra = [...set].filter((k) => !jaSet.has(k))
      expect(missing, `${name} に不足キー`).toEqual([])
      expect(extra, `${name} に余分キー`).toEqual([])
    }
  })
})

describe('languageOptions の整合', () => {
  it('全辞書で languageOptions が 8 要素', () => {
    for (const name of DICT_NAMES) {
      expect(DICTS[name].languageOptions, `${name}`).toHaveLength(8)
    }
  })

  it('languageOptions の value 列が全辞書で同一', () => {
    const jaValues = ja.languageOptions.map((o) => o.value)
    expect(jaValues).toEqual(['ja', 'en', 'ko', 'zh', 'zh-TW', 'es', 'fr', 'de'])
    for (const name of DICT_NAMES) {
      const values = DICTS[name].languageOptions.map((o) => o.value)
      expect(values, `${name} の languageOptions value`).toEqual(jaValues)
    }
  })
})

describe('オプション配列の要素数整合（選択肢の数が言語でズレない）', () => {
  // value を持つオプション配列はどの言語でも同じ件数・同じ value 列であるべき
  const OPTION_KEYS = [
    'regionOptions',
    'purposeOptions',
    'gearOptions',
    'brandOptions',
    'mountOptions',
    'subjectOptions',
    'conditionOptions',
    'gradeOptions',
    'priorityOptions',
    'sortCamera',
    'sortLens',
  ]

  for (const key of OPTION_KEYS) {
    it(`${key} の value 列が全辞書で同一`, () => {
      const jaValues = ja[key].map((o) => o.value)
      for (const name of DICT_NAMES) {
        const values = DICTS[name][key].map((o) => o.value)
        expect(values, `${name}.${key}`).toEqual(jaValues)
      }
    })
  }
})

describe('strengths.js の翻訳網羅', () => {
  it('STRENGTHS の全エントリが {en,ko,zh,zh-TW,es,fr,de} を持つ', () => {
    const missing = []
    for (const [jaKey, trans] of Object.entries(STRENGTHS)) {
      for (const lang of STRENGTH_LANGS) {
        if (typeof trans[lang] !== 'string' || trans[lang].length === 0) {
          missing.push(`${jaKey} -> ${lang}`)
        }
      }
    }
    expect(missing, `未翻訳の STRENGTHS:\n${missing.join('\n')}`).toEqual([])
  })

  it('SENSORS の全エントリが {en,ko,zh,zh-TW,es,fr,de} を持つ', () => {
    const missing = []
    for (const [jaKey, trans] of Object.entries(SENSORS)) {
      for (const lang of STRENGTH_LANGS) {
        if (typeof trans[lang] !== 'string' || trans[lang].length === 0) {
          missing.push(`${jaKey} -> ${lang}`)
        }
      }
    }
    expect(missing, `未翻訳の SENSORS:\n${missing.join('\n')}`).toEqual([])
  })

  it('STRENGTHS / SENSORS は ja キー（翻訳元）を別途持たない（ja は元キーそのもの）', () => {
    // 念のため：各エントリに 'ja' プロパティを足していないこと（仕様）
    for (const trans of Object.values(STRENGTHS)) {
      expect(trans).not.toHaveProperty('ja')
    }
    for (const trans of Object.values(SENSORS)) {
      expect(trans).not.toHaveProperty('ja')
    }
  })
})

describe('strengths がデータの全 strength / sensor をカバーしている', () => {
  // データ側(CAMERAS/LENSES)で実際に使われている strengths/sensor がすべて
  // 翻訳辞書(STRENGTHS/SENSORS)に存在することを確認する。
  // 新製品追加時に翻訳漏れ（カードで日本語のまま出る等）を検知する回帰テスト。
  const usedStrengths = new Set()
  const usedSensors = new Set()
  for (const p of [...CAMERAS, ...LENSES]) {
    for (const s of p.strengths || []) usedStrengths.add(s)
    if (p.sensor) usedSensors.add(p.sensor)
  }

  it('STRENGTHS はオブジェクトで 1 件以上', () => {
    expect(typeof STRENGTHS).toBe('object')
    expect(Object.keys(STRENGTHS).length).toBeGreaterThan(0)
  })

  it('データで使われる全 strengths が STRENGTHS に存在する', () => {
    const missing = [...usedStrengths].filter((s) => !STRENGTHS[s])
    expect(missing, `STRENGTHS に未登録の strength:\n${missing.join('\n')}`).toEqual([])
  })

  it('データで使われる全 sensor が SENSORS に存在する', () => {
    const missing = [...usedSensors].filter((s) => !SENSORS[s])
    expect(missing, `SENSORS に未登録の sensor:\n${missing.join('\n')}`).toEqual([])
  })
})
