# 日本語化 (i18n) 方針

このドキュメントは `matzoka/paperclip` Fork における日本語化作業の設計方針・用語集・運用ルールを記録する。担当Agentが交代しても表記・設計判断が引き継げるよう、変更判断の正本として本ファイルを更新すること。

関連: Multica Issue [MATZ-9](../../../..) (親Issue・承認方針), MATZ-10 (調査結果), MATZ-11 (本実装)。

## 1. 全体方針

- 本家 `paperclipai/paperclip` の更新を継続的に取り込めることを最優先する。翻訳は独立ファイル (`ui/src/i18n/locales/ja.json`) に閉じ、JSXへの変更は「文言を `t("key")` に置き換える」最小差分に留める。
- 新しいi18nフレームワークは導入しない。既存の `i18next` / `react-i18next` / `ui/src/i18n/` をそのまま拡張する。
- 基準ロケールは `en`。重点翻訳言語は `ja`。他の約40言語は無理に追従せず、未翻訳キーは `fallbackLng: en` により英語表示する。
- サーバー側 (`server/src`) には現段階で新しいi18n機構を導入しない。既知のサーバーエラーはUI側の翻訳マップ (`ui/src/i18n/server-error-messages.ts`) で日本語化し、未知のエラーは英語原文をそのまま表示する。

## 2. 実装優先順位

1. i18n基盤・fallback方式(本Issueで着手)
2. 初回セットアップ／onboarding
3. 設定関連画面
4. アクセス権・秘密情報・Adapter等の重要設定
5. 削除・停止・変更等の破壊的操作に関する警告・確認ダイアログ
6. Issue／Task／Goal／Agent等の主要業務画面
7. 状態表示・Toast・既知エラー
8. ツールチップ・補足説明
9. その他一般画面

重要操作・設定画面は可能な限り100%、アプリ全体では意味のあるユーザー向け文言の80〜90%以上の日本語化を最終目標とする。無秩序な一括置換は行わず、優先順位順に小さく検証可能なコミットで進める。

## 3. i18nキー命名規則

- キーはドット区切りの階層構造。第1階層はおおむね画面／機能単位 (`app`, `onboarding`, `settings`, `access`, `adapters`, `issues` 等)。
- `camelCase` を使用し、末尾に用途を表す語を付ける: `title` / `description` / `confirm` / `cancel` / `placeholder` / `ariaLabel` / `tooltip` / `error.<code>` など。
- 既存キーを流用できる場合は新規キーを作らず再利用する(例: 同じ文言が複数画面に出る場合)。
- コード側で `t("key", { defaultValue: "English text" })` の形を使う場合、`defaultValue` は `en.json` の値と一致させる。両者がずれると英語版のメンテナンスが二重管理になるため、`en.json` を更新した際は呼び出し側の `defaultValue` も合わせて更新する。

## 4. locale validation の変更点 (2026-09-13, MATZ-11)

`ui/src/i18n/locale-validation.ts` は元々、`en.json` に存在するキーを全ロケールに要求していた(欠落キーはエラー)。今回、以下のように変更した。

- **欠落キーは許容**する(エラーにしない)。`fallbackLng: en` により、翻訳が追いついていないロケール・キーは英語表示になる。
- **英語に存在しない未知キーの検出は維持**する(エラーのまま)。
- **interpolation placeholder (`{{name}}`) の整合性検証は維持**する(存在するキーに対してのみ)。
- **script / raw HTML / イベントハンドラ属性 / `javascript:` / `data:` / 想定外URL等の危険文字列検出は維持**する。
- **文字列長の上限チェックは維持**する。

対応するテストは `ui/src/i18n/locale-validation.test.ts` を更新。fallback契約自体の検証は `ui/src/i18n/fallback.test.ts` に独立したi18next最小構成のテストとして追加した。

## 5. ロケール検出・切り替え

`ui/src/i18n/index.ts` の `lng` は従来 `DEFAULT_LOCALE`("en")に固定されていた(切り替え手段が存在しなかった)。今回 `detectInitialLocale()` を追加し、次の優先順で初期ロケールを決定する。

1. `localStorage["paperclip.locale"]` に保存された手動選択(対応ロケールのみ有効)
2. ブラウザ/OSの `navigator.languages` / `navigator.language` に一致する対応ロケール
3. どちらも無ければ `en`

`setLocale(locale)` は選択を `localStorage` へ保存し `i18n.changeLanguage()` を呼ぶ。**現時点でこれを呼び出す設定画面UIはまだ存在しない**(優先順位3「設定関連画面」で追加予定)。テストは `ui/src/i18n/locale-detection.test.ts`。

## 6. 用語集

Paperclip内での意味を確認した上で選定した日本語訳。表記揺れを避けるため、新しい画面を翻訳する際は必ずこの表を参照する。

| 英語 | 日本語表記 | 使用方針 |
| --- | --- | --- |
| Agent | エージェント | 一般名詞として定着しているため訳語を使用。 |
| Issue | Issue(課題) | UI見出し等では「Issue」を残し、説明文でのみ「課題」を補足的に使う。Multica運用と合わせるため無理に「課題」へ統一しない。 |
| Task | タスク | — |
| Goal | ゴール | 「目標」より「ゴール」の方がPaperclip内の粒度(達成対象の成果物)に近い。 |
| Company | 会社 | Paperclip内では組織単位。既存の `ja.json`(`app.noCompanies.*`)が「会社」を使用済みのため統一する。 |
| Run | Run(実行) | 見出しは「Run」を残し、説明文で「実行」を補う。 |
| Backlog | バックログ | — |
| Todo | Todo | カンバン列名として定着しているため無理に訳さない。 |
| Adapter | アダプター | — |
| Workspace | ワークスペース | — |
| Skill | スキル | — |

製品固有概念として英語表記の方が理解しやすい場合(Issue, Run, Todo等)は無理に訳さない。今後、新しい概念語が出てきた場合はこの表に追記すること。

## 7. サーバー発エラーメッセージの扱い(方針決定・実装は未着手)

- `server/src/routes/*` 等が返すエラー文言の多くはURL・件数等を埋め込んだ動的文字列であり、固定文言の翻訳マップだけでは網羅できない。
- 承認済み方針(b): 既知のエラー(固定文言、または `ui/src/api/client.ts` の `ApiError.body.code` のような機械可読コード)をUI側の翻訳マップで日本語化し、マップに一致しない文言はそのまま英語で表示する(fallback)。サーバー側への新規i18n機構導入は現段階で行わない。
- 調査の結果、`ui/src/lib/skill-policy-denial.ts` の `classifySkillDenial()` のように、コードベースで分類済みの箇所がすでに存在する(`code`/`reason` による判定)。ここは翻訳マップ方式を適用しやすい候補だが、`title` が呼び出し側の `actionLabel`(英語)を埋め込む設計のため、`actionLabel` 自体の翻訳(呼び出し元ごとの対応)も合わせて必要になり、本Issueの範囲では未着手。
- 次に着手する場合は、(1) `code`/`reason` が機械可読で安定している箇所から優先し、(2) `actionLabel` 等の呼び出し側文字列も同時に `t()` 化する、という2点をセットで進めること。単独でマップだけ作ると翻訳とUI呼び出しがずれるため避ける。
- サーバー側が構造化エラーコードを返すようになれば、パターンマッチではなくコードベースの解決に切り替えるのが望ましい。これは本Issueの範囲外(必要なら別Issueで再検討)。

## 8. 未i18n化文字列の検出

`scripts/i18n-untranslated-scan.mjs` (ヒューリスティック検出、AST解析ではない)を参照。検出範囲・限界は同スクリプトのコメントおよび `pnpm run i18n:scan` の出力ヘッダーを参照。

## 9. Git運用

- `master`: `upstream/master` (`paperclipai/paperclip`) を fast-forwardのみで追従する専用ブランチ。直接コミットしない。
- `i18n/ja-base`: 日本語化の基幹ブランチ。`master` から分岐。
- `i18n/ja-<topic>`: 必要に応じたトピックブランチ。完了後 `i18n/ja-base` にマージ。
- 本家追従手順: `git fetch upstream && git checkout master && git merge --ff-only upstream/master && git push origin master`。その後 `i18n/ja-base` を rebase/merge。
- 衝突を避けるため、翻訳キー追加は「対象JSXの文言を `t()` に置き換える最小差分」＋「`ja.json` への追記」に限定し、無関係な構造変更を混在させない。

## 10. 進捗・引き継ぎ状況

進捗の正本はMulticaのIssue履歴 (MATZ-11とその後続) および本リポジトリのcommit/PRとする。各Agent交代時は該当Issueコメントに、完了範囲・未完了範囲・最新commit・テスト結果・既知の問題を記録すること。詳細な最新状況は MATZ-11 のコメント履歴を参照。
