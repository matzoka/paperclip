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

`setLocale(locale)` は選択を `localStorage` へ保存し `i18n.changeLanguage()` を呼ぶ。テストは `ui/src/i18n/locale-detection.test.ts`。

**(2026-09-13追記, MATZ-11続き)** `setLocale()` を呼び出す設定画面UIを `ui/src/pages/ProfileSettings.tsx`(個人プロフィール設定、優先順位3の最初の画面)に追加した。`supportedLocales`(約40言語)全件を選択肢とし、`ui/src/i18n/locale-names.ts` の `getLocaleDisplayName()`(`Intl.DisplayNames` ラッパー、ICU未対応環境ではロケールコードへフォールバック)で現在の表示言語における各言語名を表示する。同画面の静的文言(見出し・ラベル・エラーメッセージ)も合わせて `t()` 化した(`en.json`/`ja.json` の `settings.profile.*` / `settings.language.*`)。プレースホルダー `"Board"`(デフォルト表示名の例)は製品固有の慣用表記として翻訳していない。

**(2026-09-13追記, MATZ-11続き2)** `ui/src/pages/InstanceGeneralSettings.tsx`(インスタンス全体設定: デプロイ/認証状況、ログのユーザー名伏字、キーボードショートカット、バックアップ保持期間、AIフィードバック共有、サインアウト)を全面的に `t()` 化した。`settings.instanceGeneral.*` にキーを追加。

- 説明文冒頭の「有効な設定トピック一覧」(`log display, keyboard shortcuts, ...`)は、`Array.join` による英語専用の連結ロジックだったため、`Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" })` を使ったロケール依存の一覧整形に置き換えた(日本語では「、」区切りになり、英語の "and" 相当の接続表現に依存しない)。
- 日次/週次/月次のプリセット件数表示(`{{count}} days` 等)は i18next の複数形キー(`_one` / `_other`)を使うよう変更した。従来は週次・月次のみ `=== 1` の特別扱いがあり日次は無かったため、日次プリセット(3/7/14日)には実質差分は無いが、今後日次プリセットに1日が追加された場合でも複数形が自動的に正しく処理される。
- 開発者向けヒント文(ローカル環境での初回プロンプト再テスト方法)は、埋め込まれた `<code>` 要素(キー名・JSON行名)の位置は変えず、日本語では英語と語順を入れ替えた自然な文章になるよう各断片を訳した(`devHintPrefix` / `devHintMiddle` / `devHintSuffix` / `devHintEnd`)。`Trans` コンポーネントは本リポジトリで未使用のため、既存の断片結合パターンを踏襲した。

他の設定画面(`CompanySettings.tsx`・`PipelineSettings.tsx`・`PluginSettings.tsx`・`InstanceExperimentalSettings.tsx` 等)は未着手。

**(2026-09-13追記, MATZ-11続き3・担当交代後)** Claude Engineerがセッション利用上限に達したため、Copilot Engineerが引き継ぎ、優先順位3(設定関連画面)を継続した。

- `ui/src/pages/CompanySettings.tsx`(組織設定: 組織名・説明・ロゴ・保存ボタン・採用承認トグル・危険操作(アーカイブ確認ダイアログ含む))を全面的に `t()` 化。`settings.company.*` にキーを追加。
- 同画面が使う `ui/src/components/InteractionGovernancePanel.tsx`(対応ポリシー: 種別ごとの既定対応範囲・上限の設定パネル)も合わせて翻訳した。導入文の断片結合(`introPrefix`/`introAnyone`/`introMiddle`/`introDefaultPolicyEffect`/`introCapEffect`)は `InstanceGeneralSettings.tsx` の `devHint*` パターンを踏襲。ラベル・効果文言・列見出し・種別名・aria-label をすべて `settings.company.governance.*` に集約した。
- `ui/src/lib/interaction-audience.ts` の `resolverPolicyLabel()`(「Anyone」「Anyone except creator」「Human only」の短いラベル)を、共有 `app.interactionAudience.policyLabels.*` キーを参照するよう変更した。このラベルは `describeResolverAudience()` 内の `label` フィールドと `narrowedNote` の一文にも使われているため、カード単位のオーディエンス表示(Issue Thread Interactionカード・Attention Queue行、優先順位6の範囲)にも翻訳が波及する。ただし `describeResolverAudience()` 本体の文章(`summary`/`shortSummary`/`narrowedNote` の完全な文)・`RESOLVER_POLICY_EFFECTS`・`RESOLVER_POLICY_CHOICES` は本Issueの範囲外として未着手のまま残した(優先順位6着手時に対応)。ラベル参照は他のモジュールと同様、コンポーネント外のプレーン関数から呼べるよう `ui/src/i18n` がエクスポートするシングルトン `t()` を使用し、ロケール切り替え時に再計算されるよう関数化(モジュールロード時の定数から遅延評価する関数へ変更)した。
- 各設定画面・ページに共通する `{ label: "Settings", href: "/company/settings" }` パンくずは、13箇所以上の別ページに同一の未翻訳文字列があるため、今回は変更していない(一部だけ翻訳すると画面遷移中に表記が揺れるため、まとめて対応する方が良いと判断)。次にこのパンくずへ着手する場合は全ページ一括で行うこと。

### コミット・PR

- 前回コメント時点の commit `8469c8b89` の後続として本変更をコミットする。
- PR: https://github.com/matzoka/paperclip/pull/1(既存PRに自動反映)

### テスト結果(Copilot Engineer継続分)

- 依存関係が未インストールの状態から引き継いだため、`pnpm install --no-frozen-lockfile` を実行(既存の `patchedDependencies` ロックファイル不整合のため `--frozen-lockfile` は不可。前回同様 `pnpm-lock.yaml` は復元し未commitのまま維持)。
- `ui`: `npx vitest run src/pages/CompanySettings.test.tsx src/components/InteractionGovernancePanel.test.tsx src/lib/interaction-audience.test.ts src/i18n` → InteractionGovernancePanel 14/14、i18n 17/17、interaction-audience 全件 pass。`CompanySettings.test.tsx`(実体は `CompanyEnvironments` のテスト、本変更では対象コンポーネント未変更)は間欠的に3/4失敗することがあったが、変更前のコミットに `git stash` で戻して同テストを複数回実行しても同様に間欠的に失敗する(3回中1〜2回失敗)ことを確認済み。前回コメントで報告済みの既存flakyと一致し、本変更が原因ではない。
- `ui`: `npx tsc -b` → エラーなし。
- `pnpm run i18n:scan` → `CompanySettings.tsx` / `InteractionGovernancePanel.tsx` は検出候補から消えたことを確認。
- 全ロケールJSON構文確認: 問題なし。
- モノレポ全体の `pnpm test`/`pnpm typecheck` は今回も未実施(このサンドボックスのNode 22.23.2がリポジトリ要求の24.11+と不一致のため)。`ui` パッケージ単体の `npx vitest run`(全593ファイル、非対話dotレポーター)も試みたが、このサンドボックスでは60分超経過しても完了しなかったため中断した(jsdom環境での大量の `act()` 警告出力が主因とみられる、本変更由来のエラーではない)。次担当は、より高速な環境、または対象を絞った実行(`--project` や変更ファイルに関連するディレクトリ単位)で全体テストを完了させることを推奨する。

### 未完了範囲(次の作業、Copilot Engineer時点)

- 優先順位3(設定関連画面)は `ProfileSettings.tsx`・`InstanceGeneralSettings.tsx`・`CompanySettings.tsx` が完了。`PipelineSettings.tsx`(3400行超)・`PluginSettings.tsx`(1200行超)・`InstanceExperimentalSettings.tsx`(676行)は未着手。
- 優先順位4以降(アクセス権・秘密情報・破壊的操作の警告・Issue/Task/Goal/Agent業務画面等)は未着手。
- 共通パンくず `"Settings"`(13箇所以上)は未翻訳のまま。まとめて対応すること。
- `ui/src/lib/interaction-audience.ts` の `describeResolverAudience()` 本体の文章化・`RESOLVER_POLICY_EFFECTS`・`RESOLVER_POLICY_CHOICES` は優先順位6(Issue Thread Interaction関連business画面)着手時に翻訳すること。

**(2026-09-13追記, MATZ-11続き4・担当交代: Copilot Engineer → Claude Engineer)** セッション再開後、Copilot Engineerが完了させた `CompanySettings.tsx`/`InteractionGovernancePanel.tsx` の翻訳(commit `aa38dd1d1`)を確認した上で、直前の未完了項目に挙げられていた共通パンくず `"Settings"` をまとめて対応した。

- 新規共有キー `app.breadcrumbs.settings`(en: "Settings" / ja: "設定")を追加。
- 対象は次の16箇所(全て `setBreadcrumbs([...])` 内の `{ label: "Settings"[, href: "/company/settings"] }`): `CompanySettings.tsx`・`ProfileSettings.tsx`・`InstanceGeneralSettings.tsx`(以上3件は既存の `useTranslation` 済みファイル)、`PipelineSettings.tsx`(パンくず末尾の単独ラベル、`href`なし)、および新たに `useTranslation` を追加した `InstanceAccess.tsx`・`AdapterManager.tsx`・`InstanceExperimentalSettings.tsx`・`CompanySettingsPluginPage.tsx`・`PluginSettings.tsx`・`CompanyImport.tsx`・`CompanyEnvironments.tsx`・`PluginManager.tsx`・`CompanyAccess.tsx`(`CompanyAccess`/`CompanyAccessLegacyRoute` の2コンポーネント分)・`CompanyExport.tsx`。
- 併せて `ProfileSettings.tsx` のパンくず2件目 `"Profile"` も既存の `settings.profile.title` キーへ置き換えた(既存キーの再利用、新規キー追加なし)。
- このパンくずの兄弟ラベル(`"Access"`・`"Adapters"`・`"Plugins"`・`"Members"`・`"Import"`・`"Export"`・`"Environments"`・`"Experimental"`・`"Organization"`・`"Instance settings"`・`"Plugin Details"` 等)は、優先順位4(アクセス権・Adapter等)以降の該当画面着手時にまとめて翻訳する方針とし、今回は意図的に対象外とした(「共通パンくず "Settings"」という具体的な引き継ぎ事項の範囲に絞り、無秩序な一括置換を避けるため)。

### 未完了範囲(次の作業、Claude Engineer時点)

- 優先順位3(設定関連画面)の残り: `PipelineSettings.tsx`(3400行超)・`PluginSettings.tsx`(1200行超)・`InstanceExperimentalSettings.tsx`(676行、現時点でパンくずの"Settings"のみ翻訳済み、本文は未着手)は本体が未着手。
- 優先順位4以降(アクセス権・秘密情報・破壊的操作の警告・Issue/Task/Goal/Agent業務画面等)は未着手。上記16箇所のパンくずの兄弟ラベルは、対応する画面の優先順位が来たタイミングでまとめて翻訳すること。
- `ui/src/lib/interaction-audience.ts` の `describeResolverAudience()` 本体の文章化・`RESOLVER_POLICY_EFFECTS`・`RESOLVER_POLICY_CHOICES` は優先順位6(Issue Thread Interaction関連business画面)着手時に翻訳すること。

**(2026-09-13追記, MATZ-27・Squad方式移行後の最初の工程)** Multica Issue MATZ-12以降、残作業をSquad方式(1子Issue・1 Stage・直列進行)へ移行した。本工程(MATZ-27、Stage 1)は `PipelineSettings.tsx` のうち、パイプライン一覧・選択・ページヘッダー・作成/名称変更/アーカイブ等の「パイプライン基本操作」に範囲を限定して翻訳した。Stage詳細エディタ内部(Instructions/Automation/Secrets/Advanced/Activity/History等の各タブとStage削除ダイアログ)は後続工程(Stage 2: MATZ-13、Stage 3: MATZ-14)へ意図的に残している。

- 新規キー `settings.pipeline.*` を追加(`breadcrumb`・`guards.*`・`header.*`・`stageList.*`・`toast.*`・`archive.*`)。
- 対象にした具体的な範囲:
  - ページ上部のパンくず先頭「Pipelines」ラベル(`settings.pipeline.breadcrumb`)。
  - 未選択・組織未選択・Pipeline未検出時のガード文言(`EmptyState` message)。
  - ページヘッダー: 「Back to board」リンク、「Pipeline actions」ドロップダウン(タイトル属性・Restore pipeline項目)、パイプライン名/説明の入力欄(`sr-only`ラベル・`aria-label`・placeholder)、「Save details」ボタンと保存中表示、保存成功トースト「Pipeline updated」。
  - ステージ一覧バー(パイプライン内のステージ全体を横並びで表示する部分。パイプラインそのものの一覧ではなく、1パイプライン内のステージ構成を俯瞰・選択する導線): 空状態メッセージと「Add first stage」、各ステージボタンの `aria-label`(警告件数を含む複数形キー)、可視の警告バッジ、「Step N」ラベル、「New entries paused」バッジ、「View queue」リンク、「Insert stage after {name}」の `aria-label`、ステージ追加成功トースト「Stage added」。
  - アーカイブ操作: メニュー項目・ダイアログタイトル(`settings.pipeline.archive.title` を3箇所で再利用)、ダイアログ本文、確認用テキスト入力のラベル・`aria-label`、Cancel/Archiving中/確認ボタン、復元成功トースト「Pipeline restored」。
- 意図的に対象外とした範囲(Stage詳細エディタ内部、Stage 2/3の担当範囲):
  - `StageSubSidebar`(Instructions/Automation/Secrets/Activity/Historyのタブナビゲーション、"Stage section(s)")。
  - 選択中ステージのフォーム本体(Name/Step type/承認設定/Automation/変数トークン/実行Workspace/「Break into smaller pieces」/Transitions/Children等、`i18n:scan` 実測で41件以上)。
  - 「Delete stage」ダイアログ一式(ボタン・タイトル・本文・Move existing items to等)は、MATZ-14の説明文が明示的に「Stage削除」を自Stageの範囲としているため、本工程では触れていない。
  - `saveStage`/`saveStageEnv`/`saveStrictTransitions`/`deleteStage` の各トースト(Stage/Advanced/Secrets領域の保存・削除に付随するため)。
- 用語: 「Pipeline」は「パイプライン」(既存訳語なし、新規に採用)。ステージ一覧バーの可視ラベルは原文が "Step N" のため「ステップ N」と訳し、操作系の名詞(Add/Delete/Insert stage 等、Stage詳細エディタ側の担当分含む)は「ステージ」で統一する方針とした(英語UI自体が両方の語を混在させているため、日本語でも文脈により使い分ける)。

### テスト結果(MATZ-27)

- 依存関係インストール: `pnpm install --no-frozen-lockfile`(このNode 22.23.2サンドボックスでは前回同様 `--frozen-lockfile` 不可)。`pnpm-lock.yaml` はテスト実行後 `git checkout --` で復元し、未commitのまま維持(前回踏襲)。
- `ui`: `npx vitest run src/pages/PipelineSettings.test.ts src/i18n` → 全24件pass。
- `ui`: `npx tsc -b` → エラーなし。
- `pnpm run i18n:scan` → `PipelineSettings.tsx` の検出件数は46件(すべてStage詳細エディタ内部、`--json` 出力で全件確認済み)。本工程で対象にした範囲の文字列は検出0件になったことを確認。
- 全ロケールJSON構文確認: 全43ロケールでパース成功を確認。
- モノレポ全体の `pnpm test`/`pnpm typecheck` は今回も未実施(前回同様の理由、Node要求バージョン不一致とサンドボックスでの全体テスト所要時間の問題)。今回の変更は1ファイル+ロケールJSONの追記のみのため、対象を絞った実行で十分と判断した。

### 未完了範囲(次の作業、MATZ-27完了時点)

- 優先順位3の残り: `PipelineSettings.tsx` のStage詳細エディタ内部(Stage 2: MATZ-13が対象)、Secrets・Advanced・Activity・History・Stage削除・残りの未i18n候補整理(Stage 3: MATZ-14が対象)。`PluginSettings.tsx`(Stage 4: MATZ-15)・`InstanceExperimentalSettings.tsx`(Stage 5: MATZ-16)は未着手。
- 優先順位4以降は引き続き未着手(Stage 6以降で対応予定)。
- 共通パンくず兄弟ラベル・`interaction-audience.ts` の残課題は従来どおり据え置き。

**(2026-09-13追記, MATZ-13・Squad方式 Stage 2)** MATZ-27(Stage 1)のチェックポイントcommit `b9915d2a1` から継続し、`PipelineSettings.tsx` のStage詳細エディタのうち「Instructions/Automation」タブ本体(`activeStageSection === "instructions"` の範囲)を翻訳した。Secrets・Advanced(Transitions/Children)・Activity・History の各タブ、`StageSubSidebar` のタブナビゲーション自体(共通ラベル、次工程でまとめて対応)、および「Delete stage」ダイアログは、Issue説明文の指示どおりMATZ-14へ意図的に残した。

- 新規キー `settings.pipeline.stageEditor.*` を追加(`stageKind.*`・`executionWorkspaceOptions.*`・`toolbar.*`・`fields.*`・`automation.*`・`variableTokens.*`・`breakdown.*`)。
- 対象にした具体的な範囲:
  - Stageツールバー: 「新規登録を一時停止/再開」ボタン、「Delete {stage name}」ボタン(title/aria-label)。
  - Stage基本設定: Name、Step type(ドロップダウンの選択肢ラベル・説明文を含む)、Review時のApprover選択(placeholder/noneLabel/検索/空状態)、Review outcomes(承認/却下/修正依頼の移動先セレクト、修正依頼・却下時のメモ要求トグル、移動先未設定時のヒント)。
  - Automation本体: 「アイテムがこのステップに入ったとき」〜担当エージェント選択〜「この指示を実行し次のステップへ進める」の文、Project context(プロジェクト/ワークスペース選択、フォールバック表示、既定ワークスペース未設定時のヒント)、Execution workspace(モード選択肢・既存ワークスペース選択・新規作成/既定ワークスペース表示・再利用元の表示・保存前チェックのヒント)、Issue titleフィールドとその変数トークンヘルパー、breakdown有効時の「エージェントは何を判断すべきか」見出し、Instructionsエディタのプレースホルダー(通常時/分割時)、自動化未設定時のEmptyStateメッセージ。
  - 変数トークンヘルパー(`AutomationVariableTokenHelper`/`CarriedFieldTokenHelper`、いずれも本ファイル内で定義されたローカルコンポーネント): デフォルトラベル「Available variables」、「Already available on child items」、トークン挿入ボタンのtitle/aria-label、変数グループ名(Pipeline and stage/Current item/Item fields)、各変数のlabel/description(Pipeline ID/key/name、Stage ID/key/name、Item title/body/ID/key/title alias/version)、プレビューtitleの「Example: …」「From …」。`buildAutomationVariableGroups()`・`automationVariablePreviewTitle()` はモジュールスコープの関数のため、コンポーネント側の `t` を引数として渡す方式にした(`RoutineVariablesEditor`/`RoutineVariablesHint` はこのファイル外の共有コンポーネントで他の未翻訳画面からも使われているため、本工程では対象外のまま残した)。
  - Break into smaller pieces(breakdownSettingsCard、`activeStageSection === "instructions"` 内でレンダリングされるため本工程の対象と判断): タイトル・説明・トグル、各設定行(作成先パイプライン/開始ステージ/呼び方/Carry over/移動先/Wait)のラベル・placeholder・aria-label・ヒント文、"selected"/"selected pipeline"/"destination"/"existing workspace" 等のフォールバック文言。
  - `STAGE_KIND_OPTIONS`・`STAGE_EXECUTION_WORKSPACE_OPTIONS` はモジュールスコープの定数から `buildStageKindOptions(t)`/`buildExecutionWorkspaceOptions(t)` 関数へ変更し、コンポーネント内で `useMemo(() => …, [t])` として都度生成する方式にした(`ui/src/lib/interaction-audience.ts` の `resolverPolicyLabels()` と同様の「モジュールスコープの定数を遅延評価関数へ変える」パターンを踏襲。ただしこのファイルはコンポーネント内に hook 由来の `t` を既に持つため、シングルトン `t()` のインポートではなく引数渡しを選んだ)。
- 意図的に対象外とした範囲(次工程 MATZ-14の担当範囲):
  - `StageSubSidebar` のタブナビゲーション(Automation/Advanced/Secrets/Activity/Historyの共通ラベル一式、"Stage section(s)")。MATZ-27に続き、一部だけ翻訳すると表記が揺れるため今回も触れていない。
  - `activeStageSection === "advanced"` の中身(Transitions: 「Strictly enforce transitions」トグルとその説明文、`transitionTargetsControl`(Allowed next steps一覧、"Always available"ラベル)/ Children: Block children・Advance childrenの各トグルと説明文)。
  - `activeStageSection === "secrets"` / `"activity"` / `"history"` の中身(それぞれ別コンポーネント `StageSecretsPanel`/`StageEventsList`/`PipelineStageHistoryPanel` 経由)。
  - 「Delete stage」ダイアログ一式(タイトル・本文・"Move existing items to"・ボタン)。Issue説明文が「最終ダイアログは後続Issueへ残す」と明記しているため。
- 用語: 「Piece」を新規に「ピース」と訳し、用語集に追加(§6参照)。「this case」は本ファイル内で既存の「item(アイテム)」と同一概念を指すため、新語を導入せず「このアイテム」に統一した。

### テスト結果(MATZ-13)

- 依存関係インストール: `pnpm install --no-frozen-lockfile`(前回同様、このNode 22.23.2サンドボックスでは `--frozen-lockfile` 不可)。`pnpm-lock.yaml` はテスト実行後 `git checkout --` で復元し、未commitのまま維持。
- `ui`: `npx vitest run src/pages/PipelineSettings.test.ts src/i18n` → 全24件pass。
- `ui`: `npx tsc -b` → エラーなし。
- `pnpm run i18n:scan` → `PipelineSettings.tsx` の検出件数は46件→12件に減少。残り12件はすべて上記「意図的に対象外とした範囲」(`StageSubSidebar`・Advanced内Transitions/Children・Delete stageダイアログ)に属することを `--json` 出力で確認済み。
- 全ロケールJSON構文確認: 全40ロケールでパース成功を確認。
- 新規追加キーの棚卸し: `settings.pipeline.stageEditor.*` の全キーがコード側から参照されていることを確認(モジュールスコープの `tokens` 変数によるテンプレートリテラル参照分を含む)。
- モノレポ全体の `pnpm test`/`pnpm typecheck` は今回も未実施(前回までと同様の理由)。今回の変更は1ファイル+ロケールJSON2件+本ドキュメントのみのため、対象を絞った実行で十分と判断した。

### 未完了範囲(次の作業、MATZ-13完了時点)

- 優先順位3の残り: `PipelineSettings.tsx` のStage詳細エディタのうち、Secrets・Advanced(Transitions/Children)・Activity・History・`StageSubSidebar`タブナビゲーション・Delete stageダイアログ(Stage 3: MATZ-14が対象)。`PluginSettings.tsx`(Stage 4: MATZ-15)・`InstanceExperimentalSettings.tsx`(Stage 5: MATZ-16)は未着手。
- 優先順位4以降は引き続き未着手(Stage 6以降で対応予定)。
- 共通パンくず兄弟ラベル・`interaction-audience.ts` の残課題は従来どおり据え置き。

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
| Pipeline | パイプライン | — |
| Stage | ステージ | UI見出しの序数表示(例: "Step 1")は「ステップ」を使う。操作動詞を伴う名詞(Add/Delete/Insert stage等)は「ステージ」で統一。 |
| Piece | ピース | Stageの「Break into smaller pieces(小さな単位に分割)」機能が生成する分割単位。ユーザーが呼び方をカスタマイズできる項目(`breakdownPieceNoun`)自体は訳さないが、固定文言側は「ピース」で統一(MATZ-13)。 |

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
