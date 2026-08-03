import type { Messages } from './messages'

export const ja: Messages = {
  locale: 'ja',
  app: {
    loading: '蔵書を読み込んでいます…',
    loadError: (message) => `蔵書を読み込めませんでした：${message}`,
    incompatibleNotice:
      'ブラウザに保存されている蔵書データは旧バージョンのアプリで作成されたもので、' +
      '読み込めなくなりました。お手数ですが、エクスポートをもう一度アップロードしてください。',
    replaceLibrary: '蔵書を切り替える',
    navAria: 'ビュー',
  },
  nav: {
    shelf: '本棚',
    timeline: '入手と読書',
    knowledge: '知の地図',
    network: 'タグネットワーク',
    languages: '言語の流れ',
    years: '出版年×入手年',
    pace: '読書ペース',
    canon: '正典リスト',
  },
  upload: {
    intro: (
      <>
        <em>Tsundoku</em>
        （積ん読）。買っては積み、読むのはいつか — 心当たりのある方のためのアプリです。LibraryThing の蔵書を八つの連動するビューで探索します。実寸どおりに描いた本棚から、年表、タグネットワーク、言語の流れまで — どのビューも、そのまま他のすべてのビューの絞り込みになります。中心にある問いはひとつ。<em>手に入れた</em>本と
        <em>読んだ</em>本のあいだの差は、自分について何を物語るのでしょうか。
      </>
    ),
    title: '蔵書を読み込む',
    ltIntro: (
      <>
        このアプリは、自分の蔵書をカタログ化するオンラインサービス{' '}
        <a href="https://www.librarything.com" target="_blank" rel="noopener noreferrer">
          LibraryThing
        </a>{' '}
        のエクスポートを読み込みます。
        <a href="https://www.librarything.com/export.php" target="_blank" rel="noopener noreferrer">
          librarything.com/export.php
        </a>{' '}
        で蔵書を <strong>JSON</strong> 形式でエクスポートし、そのファイルをここで読み込んでください。処理はすべてブラウザ内で完結し、ファイルが
        <strong>お使いの端末の外に出ることはありません</strong>。
      </>
    ),
    dropHere: 'エクスポートファイルをここにドラッグ、または',
    chooseFile: 'ファイルを選択',
    working: '正規化しています…',
    backToLoaded: '読み込み済みの蔵書に戻る',
    errorPrefix: 'エラー：',
    errInvalidJson: '有効な JSON ファイルではありません。',
    errTooLarge: (mbFmt, limitMbFmt) =>
      `ファイルサイズが ${mbFmt} MB あります — 上限は ${limitMbFmt} MB です。LibraryThing では絞り込んだエクスポート（たとえば特定のコレクションだけ）も作成できます。`,
    errTooMany: (maxFmt) =>
      `エクスポートに ${maxFmt} 件を超えるエントリが含まれています。` +
      'ビューはすべてをメモリ上に保持するため、絞り込んだエクスポートをご利用ください（LibraryThing はコレクション単位でのエクスポートに対応しています）。',
    errNotAnExport: 'LibraryThing のエクスポートではありません（書籍 ID をキーとする JSON オブジェクトが必要です）',
    errNoBooks: 'LibraryThing のエクスポートではありません — 書籍のエントリが含まれていません',
  },
  report: {
    title: '蔵書の準備ができました',
    note:
      '読み込みの際、カタログの小さな不整合を直しました — 縦横が入れ替わった判型、欠けた項目、' +
      '壊れた特殊文字などです。修正が黙って行われることはありません。データに何が行われたかは、' +
      'この一覧でそのまま確認できます。',
    entries: 'エントリ',
    media: '媒体',
    read: '読了',
    readValue: (readFmt, knownFmt, datedFmt, minYear) =>
      `${readFmt}（読了年判明 ${knownFmt} 点、うち ${datedFmt} 点は日付まで判明${minYear !== null ? `、${minYear}年以降` : ''}）`,
    pagesTotal: '総ページ数',
    readDays: '読書期間',
    readDaysValue: (median, p90, max) => `通常 ${median} 日、${p90} 日を超えることはまれ、最長 ${max} 日`,
    tags: 'タグ',
    tagsValue: (normFmt, rawFmt) => `統合後 ${normFmt} 件（エクスポート内 ${rawFmt} 件）`,
    dimsSwapped: '判型の縦横入れ替わり',
    dimsSwappedValue: (sortedFmt, discardedFmt) => `${sortedFmt} 件を修正、${discardedFmt} 件を破棄`,
    dimsEstimated: '判型の推定',
    dimsEstimatedValue: (nFmt) => `${nFmt} 冊（ページ数から）`,
    origLangInferred: '原語の補完',
    origLangInferredValue: (nFmt) => `${nFmt} 冊（出版言語から）`,
    entitiesDecoded: '特殊文字の修復',
    entitiesDecodedValue: (nFmt) => `${nFmt} 件`,
    bulkImport: '一括インポートを検出',
    bulkImportValue: (nFmt) => `${nFmt} 件`,
    toLibrary: '蔵書を開く',
    otherFile: '別のファイルを選択',
  },
  media: {
    book: '書籍',
    ebook: '電子書籍',
    film: '映画',
    vinyl: 'レコード',
  },
  ddc: {
    labels: {
      0: '総記・情報学',
      1: '哲学・心理学',
      2: '宗教',
      3: '社会科学',
      4: '言語',
      5: '自然科学',
      6: '技術・医学',
      7: '芸術・娯楽',
      8: '文学',
      9: '歴史・地理',
    },
    short: {
      0: '情報学',
      1: '哲学',
      2: '宗教',
      3: '社会科学',
      4: '言語',
      5: '自然科学',
      6: '技術',
      7: '芸術',
      8: '文学',
      9: '歴史',
    },
  },
  lang: {
    other: 'その他',
    unknown: '不明',
  },
  filter: {
    tag: (v) => `タグ：${v}`,
    language: (label) => `言語：${label}`,
    originalLanguage: (label) => `原語：${label}`,
    ddcTop: (label) => `分野：${label}`,
    mediaType: (label) => `媒体：${label}`,
    collection: (v) => `コレクション：${v}`,
    author: (v) => `著者：${v}`,
    award: (v) => `リスト：${v}`,
    acquired: (from, to) => `入手：${from}〜${to}年`,
    read: (from, to) => `読了：${from}〜${to}年`,
    edition: (from, to) => `出版：${from}〜${to}年`,
    statusRead: 'ステータス：読了',
    statusUnread: 'ステータス：未読',
  },
  chips: {
    regionAria: '適用中の絞り込み',
    removeAria: (label) => `絞り込みを解除：${label}`,
    clearAll: 'すべての絞り込みを解除',
  },
  filterEditor: {
    openAria: 'フィルターを追加',
    title: 'フィルター',
    status: 'ステータス',
    medium: '媒体',
    collection: 'コレクション',
    read: '読了',
    unread: '未読',
    close: '閉じる',
  },
  empty: {
    title: '現在の絞り込みに該当するタイトルはありません',
    active: '適用中の絞り込み：',
    release: '解除',
  },
  summary: {
    titles: 'タイトル',
    read: 'うち読了',
    pages: 'ページ',
    filteredFrom: (totalFmt) => `全 ${totalFmt} 点から絞り込み`,
  },
  coverage: {
    frame: (covered, total, unit) => (
      <>
        {total} {unit}のうち {covered} {unit}は
      </>
    ),
    unitTitles: '点',
    unitTags: 'タグ',
  },
  detail: {
    original: '原題',
    editionYear: 'この版の出版年',
    language: '言語',
    originalLanguage: '原語',
    pages: 'ページ数',
    ddc: '分野',
    acquired: '入手',
    read: '読了',
    readTagged: (year) => `${year}年（年タグ）`,
    rating: '評価',
    boughtAt: '購入先',
    series: 'シリーズ',
    isbn: 'ISBN',
    tags: 'タグ',
    toggleFilterAria: (label) => `絞り込み「${label}」を切り替え`,
    filterByAuthorAria: (name) => `著者「${name}」で絞り込む`,
    viewOnLt: 'LibraryThing で見る ↗',
    coverAlt: (title) => `表紙: ${title}`,
    coverLoad: 'OpenLibrary から表紙を読み込む',
    coverNote: '読み込み時に ISBN が covers.openlibrary.org に送信されます。同意は一度だけで済み、フッターでいつでも解除できます。',
    coverNone: '表紙なし',
    coverZoomAria: '表紙を拡大',
    viewOnOl: 'OpenLibrary で見る ↗',
    close: '閉じる',
  },
  rangeForm: {
    dimensionAria: '期間フィルターの対象',
    acquired: '入手',
    read: '読書',
    from: '開始',
    to: '終了',
    submit: '期間で絞り込む',
  },
  views: {
    shelf: {
      title: '本棚',
      coverage: (estimatedFmt, unmeasuredFmt, nonBooksFmt) => (
        <>
          本棚に並んでいます。うち {estimatedFmt} 冊は判型をページ数から推定したものです（半透明・破線の輪郭）。判型もページ数もない {unmeasuredFmt} 冊は下段に、書籍以外の {nonBooksFmt} 点は表示していません。
        </>
      ),
      sort: '並び順',
      color: '色分け',
      sortLabels: { acquired: '入手', author: '著者', height: '高さ', ddc: '分野' },
      colorLabels: { ddc: '分野', language: '言語', readStatus: '読了状況', acquiredYear: '入手年' },
      svgAria: (countFmt) => `${countFmt} 冊が並ぶ本棚`,
      estimatedSuffix: '（判型は推定）',
      estimatedShort: '判型は推定',
      unmeasuredAria: '判型情報のない本',
      unmeasuredTitle: (countFmt) =>
        `判型もページ数もなく推定できない本（${countFmt} 冊）— 一律サイズで、実寸ではありません`,
      legendAria: '色の凡例',
      noInfo: '記載なし',
      legendRead: '読了',
      legendUnread: '未読（輪郭のみ）',
      noAcqYear: '入手年なし',
      decade: (decade) => `${decade}年代`,
    },
    timeline: {
      title: '入手と読書',
      coverage: (readKnownFmt, taggedOnlyFmt) => (
        <>
          入手年がわかっています。読了年があるのは {readKnownFmt} 点、うち {taggedOnlyFmt} 点は年タグによるものです。
        </>
      ),
      noYears: '現在の絞り込みで入手年か読了年を持っています。',
      svgAria: '年ごとの入手（上向き）と読書（下向き）',
      maxGap: (year) => `開き最大：${year}年`,
      brushAcquired: '入手',
      brushRead: '読書',
      unreadSvgAria: '未読の蔵書の累積',
      unreadPanelLabel: '未読の蔵書（入手年のあるタイトルのみ）',
      legendAcquired: '入手',
      legendReadDated: '読了（日付あり）',
      legendReadTagged: '読了（年タグ）',
      filterUnread: '未読のみに絞り込む',
      hint:
        '期間の選択：グラフ上を水平にドラッグします — 基準線より上は入手年、下は読了年で絞り込みます。' +
        'クリックで単年を選択、Esc で選択を取り消します。',
      tooltipAcquired: (countFmt) => `入手 ${countFmt} 点`,
      andMore: (countFmt) => `…ほか ${countFmt} 点`,
      tooltipUnread: (countFmt) => `未読の蔵書 ${countFmt} 点`,
    },
    knowledge: {
      title: '知の地図',
      coverage: (deltaFmt) => (
        <>DDC 分類と入手年の両方を持っています（入手年はあるが DDC のないものが {deltaFmt} 点）。</>
      ),
      noData: '現在の絞り込みで DDC 分類と入手年の両方を持っています。',
      controlsAria: '表示方法',
      absolute: '実数',
      share: '割合',
      smooth: '3年平均',
      svgAria: '入手年ごとの DDC 主要区分',
      streamTitle: (ddcClass, label, countFmt) => `${ddcClass} ${label}：${countFmt} 点`,
      hint:
        '期間の選択：グラフ上を水平にドラッグすると入手年で絞り込み、Esc で取り消します。' +
        '流れをクリックすると、その分野で絞り込みます。',
    },
    network: {
      title: 'タグネットワーク',
      coverage: (minCount, yearTagsFmt, statusFmt, seriesFmt) => (
        <>
          {minCount} 点以上のタイトルに付いており、ネットワークに表示されています。非表示：年タグ {yearTagsFmt} 件、状態を示すタグ {statusFmt} 件、シリーズ略号 {seriesFmt} 件。
        </>
      ),
      minCountLabel: 'タイトル数の下限：',
      searchPlaceholder: 'タグを検索…',
      searchAria: 'タグを検索',
      zoomLabel: 'ズーム：',
      zoomAria: 'ズーム倍率',
      fit: '全体表示',
      unisolate: (tag) => `分離を解除（${tag}）`,
      svgAria: '同時に付けられたタグのネットワーク',
      nodeAria: (tag, countFmt) => `タグ「${tag}」、${countFmt} 点`,
      nodeTitle: (tag, countFmt) =>
        `${tag}：${countFmt} 点（クリックで絞り込み、Shift+クリックで周辺を分離表示）`,
    },
    languages: {
      title: '言語の流れ',
      coverage: (inferredFmt) => (
        <>
          出版言語が記録されています。うち {inferredFmt} 点は原語が未記録のため、出版言語をそのまま原語とみなしています（登録上の慣例）。
        </>
      ),
      noData: '現在の絞り込みで出版言語を持っています。',
      svgAria: '原語から出版言語への流れ',
      linkLabel: (source, target, countFmt) => `${source} → ${target}：${countFmt} 点`,
      linkAriaFilter: (label) => `${label}。Enter でこの組み合わせに絞り込みます。`,
      origSide: '原語',
      edSide: '出版言語',
      nodeAria: (side, lang, countFmt) => `${side}「${lang}」、${countFmt} 点`,
      nodeTitle: (side, lang, countFmt) => `${side}「${lang}」：${countFmt} 点（クリックでこの言語のみに絞り込み）`,
    },
    years: {
      title: '出版年×入手年',
      coverage: (
        <>
          両方の年がわかっています。注意：これは作品の年ではなく<em>この版</em>の出版年です — レクラム文庫のソポクレスなら 1998年と数えます。
        </>
      ),
      noData: '現在の絞り込みで出版年と入手年の両方を持っています（1900年以降）。',
      underflow: (countFmt) => `1900年より前の版 ${countFmt} 点は表示していません。`,
      svgAria: '出版年×入手年のヒートマップ',
      axisEdition: 'この版の出版年 →',
      axisAcquired: '入手年 →',
      edition: '出版',
      acquired: '入手',
      edFromAria: '出版年（開始）',
      edToAria: '出版年（終了）',
      acqFromAria: '入手年（開始）',
      acqToAria: '入手年（終了）',
      submit: '範囲で絞り込む',
      tooltip: (ed, acq, countFmt) => `${ed}年の版を ${acq}年に入手：${countFmt} 点`,
      tooltipEdition: (year, countFmt) => `${year}年の版：${countFmt} 点`,
      tooltipAcquired: (year, countFmt) => `${year}年に入手：${countFmt} 点`,
    },
    pace: {
      title: '読書ペース',
      coverage: '読書期間とページ数の両方がわかっています — 意識して記録したものに偏っています。',
      discarded: (countFmt) => <>期間が負の {countFmt} 件は破棄しました。</>,
      noData: (pointsFmt) => (
        <>現在の絞り込みで開始日と終了日を持っています（うち {pointsFmt} 点はページ数もあり）。</>
      ),
      facetToggle: '言語別に表示',
      svgAria: (langLabel) => `ページ数と読書期間${langLabel ? `（${langLabel}）` : ''}`,
      rateLabel: (rate) => `${rate} ページ/日`,
      dotAria: (title, pagesFmt, daysFmt) => `${title}：${pagesFmt} ページを ${daysFmt} 日で読了`,
      dotTitle: (title, pagesFmt, daysFmt, suspect) =>
        `${title} — ${pagesFmt} ページ / ${daysFmt} 日${suspect ? '（100日超：通読したかは不明）' : ''}`,
      axisPages: 'ページ',
      axisDays: '日数',
      note: '白抜きの点は 100日超 — 通読したかどうかわからないため、ペースの目安にはしないでください。',
    },
    canon: {
      title: '正典リストとの照合',
      coverage:
        '少なくとも一つのリストに載っています。数字は「所蔵」の数であって「リストを読破した」数では' +
        'ありません — 各リストの総数はエクスポートからはわかりません。',
      noData: '現在の絞り込みで受賞リストか正典リストに載っています。',
      showLists: '表示するリスト：',
      onlyUnread: '未読のみ → 読書リスト',
      counts: (ownedFmt, readFmt) => `所蔵 ${ownedFmt} 冊 · 読了 ${readFmt} 冊`,
    },
  },
  footer: {
    license: 'MIT ライセンス',
    embedded: '同梱フォントとライブラリのライセンス',
    covers: 'OpenLibrary の表紙',
    languageAria: '言語',
  },
}
