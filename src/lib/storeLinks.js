// 国ごとの「お店」リスト。used:true は中古/フリマ専門＝新品検索では除外する（新品なのに中古店の偽「新品」価格が最安に出る不整合を防ぐ）。
// urlFor は、機種名(エンコード済み)から その店の検索ページURL を作る関数。
// 新品〜中古まで幅広くリサーチできるよう、各国の主要店＋中古店＋フリマを揃える。
const STORES = {
  jp: [
    { name: '楽天',         urlFor: (q) => `https://search.rakuten.co.jp/search/mall/${q}/` },
    { name: 'Amazon',       urlFor: (q) => `https://www.amazon.co.jp/s?k=${q}` },
    { name: 'ヨドバシ',     urlFor: (q) => `https://www.yodobashi.com/?word=${q}` },
    { name: 'ビックカメラ', urlFor: (q) => `https://www.biccamera.com/bc/category/?q=${q}` },
    { name: '価格.com',     urlFor: (q) => `https://kakaku.com/search_results/${q}/` },
    { name: 'マップカメラ', urlFor: (q) => `https://www.mapcamera.com/search?keyword=${q}` },
    { name: 'キタムラ',     urlFor: (q) => `https://shop.kitamura.jp/ec/list?keyword=${q}` },
    { name: 'フジヤカメラ', urlFor: (q) => `https://www.fujiya-camera.co.jp/shop/goods/search.aspx?search.x=1&keyword=${q}` },
    { name: 'メルカリ',     used: true, urlFor: (q) => `https://jp.mercari.com/search?keyword=${q}&status=on_sale` },
  ],
  us: [
    { name: 'Amazon',  urlFor: (q) => `https://www.amazon.com/s?k=${q}` },
    { name: 'B&H',     urlFor: (q) => `https://www.bhphotovideo.com/c/search?q=${q}` },
    { name: 'Adorama', urlFor: (q) => `https://www.adorama.com/l/?searchinfo=${q}` },
    { name: 'KEH',     used: true, urlFor: (q) => `https://www.keh.com/shop/catalogsearch/result/?q=${q}` },
    { name: 'MPB',     used: true, urlFor: (q) => `https://www.mpb.com/en-us/search?q=${q}` },
    { name: 'eBay',    used: true, urlFor: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}` },
  ],
  uk: [
    { name: 'Amazon', urlFor: (q) => `https://www.amazon.co.uk/s?k=${q}` },
    { name: 'WEX',    urlFor: (q) => `https://www.wexphotovideo.com/search/?text=${q}` },
    { name: 'MPB',    used: true, urlFor: (q) => `https://www.mpb.com/en-uk/search?q=${q}` },
    { name: 'eBay',   used: true, urlFor: (q) => `https://www.ebay.co.uk/sch/i.html?_nkw=${q}` },
  ],
  de: [
    { name: 'Amazon',     urlFor: (q) => `https://www.amazon.de/s?k=${q}` },
    { name: 'MediaMarkt', urlFor: (q) => `https://www.mediamarkt.de/de/search.html?query=${q}` },
    { name: 'MPB',        used: true, urlFor: (q) => `https://www.mpb.com/de-de/search?q=${q}` },
    { name: 'eBay',       used: true, urlFor: (q) => `https://www.ebay.de/sch/i.html?_nkw=${q}` },
  ],
  kr: [
    { name: 'Coupang', urlFor: (q) => `https://www.coupang.com/np/search?q=${q}` },
    { name: 'Naver',   urlFor: (q) => `https://search.shopping.naver.com/search/all?query=${q}` },
    { name: 'Gmarket', urlFor: (q) => `https://browse.gmarket.co.kr/search?keyword=${q}` },
    { name: '번개장터', used: true, urlFor: (q) => `https://m.bunjang.co.kr/search/products?q=${q}` },
  ],
  fr: [
    { name: 'Amazon',      urlFor: (q) => `https://www.amazon.fr/s?k=${q}` },
    { name: 'Fnac',        urlFor: (q) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}` },
    { name: 'Digit-Photo', urlFor: (q) => `https://www.digit-photo.com/recherche.html?keyword=${q}` },
    { name: 'MPB',         used: true, urlFor: (q) => `https://www.mpb.com/fr-fr/search?q=${q}` },
    { name: 'eBay',        used: true, urlFor: (q) => `https://www.ebay.fr/sch/i.html?_nkw=${q}` },
  ],
  it: [
    { name: 'Amazon',     urlFor: (q) => `https://www.amazon.it/s?k=${q}` },
    { name: 'MediaWorld', urlFor: (q) => `https://www.mediaworld.it/it/search.html?query=${q}` },
    { name: 'MPB',        used: true, urlFor: (q) => `https://www.mpb.com/it-it/search?q=${q}` },
    { name: 'eBay',       used: true, urlFor: (q) => `https://www.ebay.it/sch/i.html?_nkw=${q}` },
  ],
  es: [
    { name: 'Amazon',     urlFor: (q) => `https://www.amazon.es/s?k=${q}` },
    { name: 'MediaMarkt', urlFor: (q) => `https://www.mediamarkt.es/es/search.html?query=${q}` },
    { name: 'Fnac',       urlFor: (q) => `https://www.fnac.es/SearchResult/ResultList.aspx?Search=${q}` },
    { name: 'MPB',        used: true, urlFor: (q) => `https://www.mpb.com/es-es/search?q=${q}` },
    { name: 'eBay',       used: true, urlFor: (q) => `https://www.ebay.es/sch/i.html?_nkw=${q}` },
  ],
  au: [
    { name: 'Amazon',     urlFor: (q) => `https://www.amazon.com.au/s?k=${q}` },
    { name: 'digiDIRECT', urlFor: (q) => `https://www.digidirect.com.au/search?q=${q}` },
    { name: "Ted's",      urlFor: (q) => `https://www.teds.com.au/catalogsearch/result/?q=${q}` },
    { name: 'MPB',        used: true, urlFor: (q) => `https://www.mpb.com/en-au/search?q=${q}` },
    { name: 'eBay',       used: true, urlFor: (q) => `https://www.ebay.com.au/sch/i.html?_nkw=${q}` },
  ],
  ca: [
    { name: 'Amazon',  urlFor: (q) => `https://www.amazon.ca/s?k=${q}` },
    { name: "Henry's", urlFor: (q) => `https://www.henrys.com/search?keywords=${q}` },
    { name: 'Vistek',  urlFor: (q) => `https://www.vistek.ca/search?q=${q}` },
    { name: 'MPB',     used: true, urlFor: (q) => `https://www.mpb.com/en-ca/search?q=${q}` },
    { name: 'eBay',    used: true, urlFor: (q) => `https://www.ebay.ca/sch/i.html?_nkw=${q}` },
  ],
  cn: [
    { name: '京東(JD)', urlFor: (q) => `https://search.jd.com/Search?keyword=${q}` },
    { name: '天猫',     urlFor: (q) => `https://list.tmall.com/search_product.htm?q=${q}` },
    { name: '淘宝',     urlFor: (q) => `https://s.taobao.com/search?q=${q}` },
    { name: '闲鱼',     used: true, urlFor: (q) => `https://www.goofish.com/search?q=${q}` },
  ],
  tw: [
    { name: '蝦皮',       urlFor: (q) => `https://shopee.tw/search?keyword=${q}` },
    { name: 'momo',       urlFor: (q) => `https://www.momoshop.com.tw/search/searchShop.jsp?keyword=${q}` },
    { name: 'PChome',     urlFor: (q) => `https://ecshweb.pchome.com.tw/search/v3.3/?q=${q}` },
    { name: 'Yahoo奇摩',  urlFor: (q) => `https://tw.buy.yahoo.com/search/product?p=${q}` },
    { name: '旋轉拍賣',   used: true, urlFor: (q) => `https://www.carousell.tw/search/${q}` },
  ],
  sg: [
    { name: 'Shopee',    urlFor: (q) => `https://shopee.sg/search?keyword=${q}` },
    { name: 'Lazada',    urlFor: (q) => `https://www.lazada.sg/catalog/?q=${q}` },
    { name: 'Amazon',    urlFor: (q) => `https://www.amazon.sg/s?k=${q}` },
    { name: 'Carousell', used: true, urlFor: (q) => `https://www.carousell.sg/search/${q}` },
  ],
}

// 店舗検索で見つかりやすいよう、機種名から検索ノイズ（(中古) などの括弧書き）を取り除く
function cleanQuery(name) {
  return name
    .replace(/[（(][^）)]*[）)]/g, ' ') // (中古) / （…） を除去
    .replace(/[αΑ]/g, 'a') // ソニー「α」等のギリシャ文字は検索で latin "a" に正規化（各国の店で見つかりやすい＝%CE%B1 化を防ぐ）
    .replace(/\s+/g, ' ')
    .trim()
}

// 国コードと機種名から、お店リンクの一覧（[{ name, url }]）を作って返す。
//   condition='new' のときは中古/フリマ専門店(used:true)を除外＝新品検索に中古店の偽価格が混ざらない。
export function getStoreLinks(region, productName, condition) {
  const all = STORES[region] || STORES.jp // 未選択なら日本のお店
  const stores = condition === 'new' ? all.filter((s) => !s.used) : all
  const query = encodeURIComponent(cleanQuery(productName)) // 検索ノイズを除いてURL化
  return stores.map((s) => ({ name: s.name, url: s.urlFor(query) }))
}
