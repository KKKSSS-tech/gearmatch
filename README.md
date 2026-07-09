# Gear Match

[![CI](https://github.com/KKKSSS-tech/gearmatch/actions/workflows/ci.yml/badge.svg)](https://github.com/KKKSSS-tech/gearmatch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/KKKSSS-tech/gearmatch)](https://github.com/KKKSSS-tech/gearmatch/releases)

Gear Match is an open-source React/Vite web app that helps people choose
cameras and lenses from practical needs: subject, budget, region, shooting
style, and preferred mount or manufacturer.

- Live app: https://gearmatch-steel.vercel.app
- Repository: https://github.com/KKKSSS-tech/gearmatch
- License: MIT
- Stack: React, Vite, JavaScript, CSS, Vitest, ESLint
- Locales: Japanese, English, Korean, Simplified Chinese, Traditional Chinese,
  Spanish, French, German
- Regions: Japan, US, UK, Germany, Korea, France, Italy, Spain, Australia,
  Canada, China, Taiwan, Singapore

The project is early-stage, but it is maintained publicly and is being shaped
into a reusable OSS resource for camera/lens recommendation data, multilingual
UX, and region-aware store-search routing.

## Why This Exists

Camera buying is hard for beginners because sensor size, mount compatibility,
budget, used-market condition, autofocus, video specs, and lens ecosystem all
interact. Gear Match turns those tradeoffs into a guided questionnaire and
returns explainable recommendations with search links for each supported
region.

## Open Source Status

This repository now includes the core OSS maintenance files:

- [License](./LICENSE)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)
- [Data Model](./docs/DATA_MODEL.md)
- [Project Status](./docs/PROJECT_STATUS.md)

Useful contribution areas include product data corrections, verified product
images, translation fixes, recommendation scoring tests, accessibility cleanup,
and documentation for the data model.

## Development

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
```

---

# ギアマッチ（Gear Match）

撮りたいものから、自分にちょうどいい **カメラ・レンズ** を見つけられる多言語Webアプリです。
4つの質問に答えるだけで、用途・予算・地域に合った機材をおすすめし、その機材を **各国の主要ECサイトの検索ページ** に送り出します（=送客）。

- 8言語対応：日本語 / English / 한국어 / 中文(简体) / 繁體中文 / Español / Français / Deutsch
- 13地域対応：日本・アメリカ・イギリス・ドイツ・韓国・フランス・イタリア・スペイン・オーストラリア・カナダ・中国・台湾・シンガポール

---

## 1. これは何のツール？ / 収益モデル

カメラ選びは「マウントが…」「センサーサイズが…」と専門用語が多くて初心者にはハードルが高い。
ギアマッチは、**専門知識ゼロでも質問に答えるだけ** で候補が絞れるように作った診断ツールです。

ユーザー体験は4ステップのウィザード形式：

1. **言語＋地域を選ぶ**（intro）
2. **用途＋機材を選ぶ**（gear … 写真/動画、カメラ/レンズ、メーカー・マウント、被写体、こだわり16項目）
3. **予算・状態を選ぶ**（budget … 新品/中古、中古ランク）
4. **結果**（results … おすすめ機材カード一覧 → 各販売店の検索ページへリンク）

### 収益モデル

- **広告**：画面内に広告枠を複数配置しています（Google AdSense を想定）。枠を多めに置くのは **意図的な仕様** です。
- **送客（将来の課金）**：結果カードから各国ECの検索ページへユーザーを送ります。将来的にこの送客を課金化する想定です。
- **アフィリエイトは使いません。** 販売店リンクは「その機種名で検索した結果ページ」への純粋な送客リンクです。

> 補足：商品リンクは `src/lib/storeLinks.js` で国ごとに定義しています。新品検索のときは中古/フリマ専門店（`used:true`）を自動的に除外し、中古店の偽「新品」価格が混ざらないようにしています。

---

## 2. 技術スタック

| 項目 | 採用 |
|------|------|
| ビルドツール | [Vite](https://vitejs.dev/) |
| UIライブラリ | React 19（JavaScript / JSX。TypeScriptは未使用） |
| スタイル | プレーンCSS（`src/index.css` / `src/App.css`） |
| Lint | ESLint |
| テスト | Vitest（導入済み・下記「テスト」参照） |
| 状態管理 | Reactの `useState` のみ（外部ライブラリなし） |

依存は最小限です（`react` / `react-dom` のみ。ルーターや状態管理ライブラリは入れていません）。

---

## 3. ディレクトリ構成

```
camera-finder-app/
├─ index.html              … Viteのエントリ。<title> やフォント読み込み
├─ package.json            … スクリプト・依存関係
├─ vite.config.js          … Viteの設定
├─ eslint.config.js        … ESLintの設定
├─ build-images.mjs        … 製品名→Wikimedia画像URL を収集して images.js を生成（※再実行注意・下記参照）
├─ build-images-safe.mjs   … 画像が無い製品にだけ高信頼一致の画像を"追記"（既存は不変・誤画像ゼロ優先）
├─ build-step-images.mjs   … ステップ画面用の画像生成
│
├─ public/                 … そのまま配信される静的ファイル（ビルドで dist/ にコピー）
│  ├─ ads.txt              … AdSense用（自分のパブリッシャーIDに要書き換え）
│  ├─ robots.txt           … クローラ許可 + Sitemap の場所
│  ├─ sitemap.xml          … サイトマップ（公開URLに要書き換え）
│  └─ favicon.svg / icons.svg
│
└─ src/
   ├─ main.jsx             … Reactの起動ポイント
   ├─ App.jsx              … 4ステップのウィザード本体（画面の流れ・状態）
   │
   ├─ components/          … 画面部品（UI）
   │  ├─ ResultCard.jsx    … 結果の機材カード（価格比較・レーダーチャート）
   │  ├─ AdSlot.jsx        … 広告枠（未設定時はプレースホルダ。公開時に実広告タグが入る）
   │  ├─ RadarChart.jsx    … 性能バランスの六角形グラフ
   │  ├─ ChipGroup.jsx / OptionChip.jsx … 選択肢ボタン
   │  └─ Icon.jsx
   │
   ├─ lib/                 … ロジック（UIなし）
   │  ├─ search.js         … 検索の心臓部。絞り込み→加点→おすすめ順で並べる
   │  ├─ storeLinks.js     … 国ごとの販売店リストと検索URL生成
   │  └─ currency.js       … 通貨記号・予算プリセット・価格表示
   │
   ├─ data/                … 製品データ。「セグメント」を結合して使う
   │  ├─ cameras.js        … segments/cam_*.js を結合（重複名は先勝ちで除去）
   │  ├─ lenses.js         … segments/lens_*.js を結合
   │  ├─ segments/         … ブランド/マウント別のデータ片（cam_sony.js, lens_sony_e.js …）
   │  ├─ images.js         … 製品名→製品画像URL（build-images.mjs が自動生成）
   │  ├─ stepImages.js     … ステップ画面の画像
   │  └─ years.js          … 製品名→発売年（新しさ判定・発売前除外に使用）
   │
   └─ i18n/                … 多言語辞書（8言語）。すべて同じキー構造
      ├─ ja.js / en.js / ko.js / zh.js / zh-TW.js / es.js / fr.js / de.js
      └─ strengths.js      … 製品の強み（strengths）の多言語表示
```

### データの考え方（セグメント結合）

製品データは1つの巨大ファイルではなく、ブランド/マウントごとの「セグメント」（`src/data/segments/`）に分割しています。
`cameras.js` / `lenses.js` がそれらを `import` して結合し、**重複した製品名は先に出てきたものを優先（先勝ち）** して除去します。
これにより、データを足すときは該当セグメントだけ編集すればよく、衝突も起きにくくなっています。

---

## 4. セットアップ（開発手順）

前提：[Node.js](https://nodejs.org/)（LTS版でOK）がインストール済みであること。

```bash
# 1. 依存パッケージをインストール（最初の1回）
npm install

# 2. 開発サーバを起動 → ブラウザで http://localhost:5173 を開く
npm run dev

# 3. 本番用にビルド（dist/ に出力される）
npm run build

# 4. ビルド結果をローカルで確認（本番に近い状態でプレビュー）
npm run preview

# 5. コードのチェック（書き方の問題を検出）
npm run lint
```

> 初心者向けメモ：普段の開発は `npm run dev` だけでOK。コードを保存すると自動でブラウザに反映されます（HMR）。`npm run build` と `npm run preview` は「公開前の最終確認」で使います。

### テスト（Vitest）

テストランナーとして **Vitest** が `devDependencies` に入っています。実行は次の通り：

```bash
npm test            # 1回だけ実行（CI向け／= vitest run）
npm run test:watch  # ウォッチモードで実行
```

> テストは **Vitest**。`src/lib/__tests__/`（検索ロジック・通貨・店舗リンク）と `src/i18n/__tests__/`（多言語キー整合）に **96件** のテストがあり、3ラウンドのQAで直した挙動の回帰を防いでいます。検索ロジック（`src/lib/search.js`）等は副作用のない純粋関数なのでテストに向いています。新しいロジックを足したら対応テストも追加してください。

---

## 5. 広告（AdSense）の有効化手順

広告は `src/components/AdSlot.jsx` の枠として配置済みです。環境変数が未設定の間は **点線のプレースホルダ枠** が出るだけで、実広告は出ません。
実広告を出すには、AdSenseの審査を通し、環境変数を設定する必要があります。

### 手順

1. **Google AdSense アカウントを作成**（[https://www.google.com/adsense/](https://www.google.com/adsense/)）。
2. **審査に必要なものを揃える**：
   - **独自ドメイン**（`*.vercel.app` などの無料サブドメインは審査に通りにくい。独自ドメイン推奨）
   - **プライバシーポリシーのページ**（広告/計測でデータを扱う旨を明記。AdSenseの必須要件）
   - **十分なコンテンツ**（中身の薄いサイトは落ちやすい）
   - **`ads.txt` の設置**（`public/ads.txt`。下記参照）
3. **`.env` に発行されたIDを設定**：
   ```
   VITE_ADSENSE_CLIENT=ca-pub-自分のパブリッシャーID
   VITE_ADSENSE_SLOT=広告ユニットID   # 任意。未設定なら自動広告フォーマット
   ```
   （変数の詳細は `.env.example` を参照）
4. **`public/ads.txt` を書き換える**：
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   の `pub-XXXXXXXXXXXXXXXX` を **自分のパブリッシャーID**（`ca-pub-` の `ca-` を除いた `pub-…` 部分）に置き換えます。
   これはAdSenseが「この広告枠は本物の所有者のものだ」と確認するためのファイルで、サイト直下（`https://あなたのドメイン/ads.txt`）に置く必要があります。`public/` に置けばビルド時に自動で配信されます。
5. **デプロイ**（下記「デプロイ手順」）。本番の環境変数にも `VITE_ADSENSE_CLIENT` を登録します。

### EU向けの注意（重要）

EU/EEA・英国のユーザーに広告を出す場合、**同意管理（CMP / Consent Management Platform）** の導入が法的に必要です。
AdSenseの管理画面から Google認定のCMPを有効化するか、自前のCMPを設置してください。
（`VITE_PLAUSIBLE_DOMAIN` を使うアクセス計測の方は Cookie を使わないため、計測単体ではEUの同意は不要です。広告とは別物である点に注意。）

> AdSenseタグや広告の実描画ロジック（`AdSlot` への実装、`index.html` へのスクリプト挿入）は別作業で実装されます。本READMEは環境変数の規約と運用手順をまとめたものです。

---

## 6. アクセス計測（Plausible Analytics）

[Plausible](https://plausible.io/) は **Cookieを使わない** 軽量なアクセス解析です。Cookieを使わないため、EUのCookie同意バナーが不要で導入が簡単です。

`.env`（本番は各サービスの環境変数）に、計測したいドメインを設定するだけ：

```
VITE_PLAUSIBLE_DOMAIN=gearmatchworld.org
```

- `https://` やスラッシュは不要、ドメイン名だけを書きます。
- 未設定なら計測は行われません。
- 計測スクリプトの読み込みは別作業で `index.html` 側に実装されます。

---

## 7. デプロイ手順

このアプリは **静的サイト（SPA）** としてビルドされるので、Vercel / Netlify どちらでも数分で公開できます。
リポジトリには両方の設定ファイル（`vercel.json` / `netlify.toml`）が同梱済みです。

### 共通の前提

- ビルドコマンド：`npm run build`
- 出力ディレクトリ：`dist`
- SPAのため「存在しないパスも index.html を返す」フォールバックが必要（設定ファイルで対応済み）。

### A. Vercel

**GitHub連携（おすすめ）**
1. GitHubにこのリポジトリをpush。
2. [Vercel](https://vercel.com/) で「New Project」→ リポジトリを選択。
3. Framework は **Vite** が自動検出されます（Build=`npm run build` / Output=`dist`）。
4. **Settings → Environment Variables** で `VITE_ADSENSE_CLIENT` などを登録。
5. Deploy。`vercel.json` の `rewrites` により全ルートが `/` に書き換えられSPAが正しく動きます。

**CLIで行う場合**
```bash
npm i -g vercel
vercel          # 初回は対話で設定 → プレビューデプロイ
vercel --prod   # 本番デプロイ
```

### B. Netlify

1. [Netlify](https://www.netlify.com/) で「Add new site → Import an existing project」→ GitHubリポジトリを選択。
2. `netlify.toml` があるので Build=`npm run build` / Publish=`dist` が自動で入ります（手動でも同じ値を設定可）。
3. **Site settings → Environment variables** で `VITE_ADSENSE_CLIENT` などを登録。
4. Deploy。`netlify.toml` の `[[redirects]]`（`/* → /index.html` 200）でSPAのルーティングが効きます。

> どちらの場合も、`.env` ファイルそのものはアップロードしません。環境変数は **各サービスの管理画面** に同じ名前で登録します（`VITE_` で始まる値だけがフロントに渡ります＝秘密情報は入れないこと）。

### 本番ドメイン

本番ドメインは **`https://gearmatchworld.org/`** に設定済みです（`index.html` の canonical/OG、`public/sitemap.xml` の `<loc>`、`public/robots.txt` の `Sitemap:` を反映済み）。別ドメインに変える場合はこの3ファイルを書き換えてください。

- 残りの任意作業：`https://gearmatchworld.org/og-image.png`（SNSシェア時のカード画像 1200×630）を `public/og-image.png` として用意するとシェアの見栄えが良くなります。未用意でもサイトは正常に動きます。

---

## 8. データ更新

製品画像・ステップ画像を更新するスクリプトがあります：

```bash
npm run update:data
```

中身は `node build-images.mjs && node build-step-images.mjs` です。
`build-images.mjs` は製品名から **Wikipedia / Wikimedia Commons の製品画像URL** を集めて `src/data/images.js` を**まるごと再生成**します（直リンク可・ライセンスが明確な画像のみ。誤画像はブランド＋型番一致で除外）。

> ⚠️ **`build-images.mjs` の再実行は要注意。** あいまい検索を含むため、過去のQAで**手作業で削除した誤画像が復活する恐れ**があります。`src/data/images.js` のキュレーション済みエントリを壊さないよう、通常は再実行しないでください。画像を増やしたいときは、次の **`build-images-safe.mjs`（追記専用・安全版）** を使います。

### 画像の安全な追記：`build-images-safe.mjs`

`build-images.mjs` を再実行せずに、**画像が無い製品にだけ**高信頼の製品写真を**追記**するスクリプトです。既存エントリは絶対に上書き・削除しません（追記後に不変条件を検査し、`src/data/images.js.bak` に退避も取ります）。

誤画像を出さないための厳格な判定（`build-images.mjs` より固い）：

1. あいまい検索を使わず、英語Wikipedia の **完全一致タイトル**（`titles=` ＋ `redirects=1`）で記事を解決。
2. 解決後の正式タイトルにブランド＋型番が含まれることを確認（**兄弟機種へのリダイレクトを除外**。例: `X-H2`→`X-H2S`、`EOS Ra`→`EOS R` は不採用）。
3. 記事本文が camera/lens 系の語を含むことを確認（同名の別物を除外）。
4. リード画像の**ファイル名**にもブランド＋型番が含まれることを確認。ロゴ/図表/SVG は除外。
5. 最終URLが **HTTP 200 かつ `Content-Type: image/*`** であることを実検証してから採用。

```bash
# 1) ドライラン：採用候補（製品名→URL）を一覧表示するだけ（ファイルは変更しない）
node build-images-safe.mjs

# 2) 確認OKなら追記（既存エントリは不変。新規キーのみ追加）
node build-images-safe.mjs --write
```

### 既知の制限：製品画像のカバー率

実際の製品画像があるのは **70 / 370（約19%）** です（`build-images-safe.mjs` で主要な現行人気機種＝Canon EOS R系・Nikon Z系・Fujifilm X系・Sony α系などを安全に追記済み）。画像が見つからない製品は、アプリ側で 📷 のプレースホルダにフォールバックします（壊れた画像は出ません）。

残り（主に交換レンズや旧機種）は無料ソースに記事が無いため、**将来的に有料/商用の商品画像APIで埋める前提**です。候補（`build-images-safe.mjs` 冒頭コメントにも列挙）：

- **楽天 商品検索API**（要アプリID。日本の現行カメラ/レンズに強く、商品画像URLが取れる）
- **Yahoo!ショッピング 商品検索API**（同上。日本向け在庫が厚い）
- **各メーカーのプレスキット/ニュースルーム**（公式の製品写真。利用規約の確認が必要）

> これらは確証の持てる一致のみ採用する方針（誤画像ゼロが最優先）。導入時も「ドライラン→人の確認→追記」の流れを踏襲してください。

---

## 9. 多言語（i18n）と地域

### 8言語

辞書は `src/i18n/` にあり、**全言語が同じキー構造** です（`ja.js` をベースに各言語へ翻訳）。

| コード | 言語 |
|--------|------|
| `ja` | 日本語 |
| `en` | English |
| `ko` | 한국어 |
| `zh` | 中文（简体） |
| `zh-TW` | 繁體中文 |
| `es` | Español |
| `fr` | Français |
| `de` | Deutsch |

新しい翻訳キーを足すときは、**8言語すべてに同じキーを追加** してください（キーがずれると表示崩れの原因になります）。製品の強み（strengths）の訳は `src/i18n/strengths.js` にまとめています。

### 13地域

地域は「どの国のECサイトに送客するか」を決めます（`src/lib/storeLinks.js`）：

日本(jp) / アメリカ(us) / イギリス(uk) / ドイツ(de) / 韓国(kr) / フランス(fr) / イタリア(it) / スペイン(es) / オーストラリア(au) / カナダ(ca) / 中国(cn) / 台湾(tw) / シンガポール(sg)

言語と地域は独立して選べます（例：英語UIで日本のECに送客、など）。通貨・予算プリセットは `src/lib/currency.js` が地域に応じて切り替えます。

---

## 10. 設計上の意図的な仕様

レビュー指摘で「やりすぎでは？」と見えるかもしれない点も、以下は **意図した仕様** です（変更しないこと）：

- **広告枠を多めに配置** … 収益（広告）が主目的のため。
- **予算は厳格に絞る** … 予算オーバーの機材は結果に出しません。予算内に該当が無ければ結果は空（`noResults` を表示）。「ちょっとだけオーバー」も出さないのは、価格でガッカリさせない方針。
- **約7秒のリサーチ中演出** … 結果を出す前に「条件照合→絞り込み→スコアリング→並べ替え」のアニメを見せます（`RESEARCH_MS = 7000`）。スキップも可能。
- **こだわり16項目** … 軽さ/新しさ/コスパ/画質/暗所/手ブレ補正/動画/RAW動画/Vlog/連写/防塵防滴/ボケ/超望遠/マクロ/瞳AF/星空。カメラ専用・レンズ専用の項目は、選んだ機材に応じて自動で出し分けます。
- **8言語対応** … 海外マーケットも狙うため。

---

## 11. 品質・QA履歴（要約）

公開準備にあたり、複数のエージェントによるレビュー / QA を **複数ラウンド** 実施済みです。主な観点：

- **検索ロジックの整合性**：予算フィルタ・表示価格・スコアリングで「中古係数」を統一し、「予算内なのに表示されない／予算オーバーなのに出る」不整合を解消。
- **被写体マッチの精度**：焦点距離の数値で構造的に判定（マーケ文言に頼らない）。誤タグの中望遠単焦点をポートレートで拾い、野鳥では拾わない等。
- **送客リンクの正しさ**：新品検索では中古/フリマ店を除外。検索ノイズ（括弧書きやギリシャ文字α）を正規化して各国の店で見つかりやすく。
- **i18nキーの一貫性**：8言語で同一キー構造を維持。
- **アクセシビリティ**：プレースホルダ広告枠は `aria-hidden` でスクリーンリーダーのノイズを防止。
- **自動テスト**：Vitest を導入済み（純粋関数中心の検索ロジックを対象に拡充可能）。

---

## ライセンス / クレジット

- 製品画像は Wikipedia / Wikimedia Commons の、直リンク可・ライセンスが明確なものを使用しています。
- 本プロジェクトは学習・実験を兼ねた個人開発プロジェクトです。
