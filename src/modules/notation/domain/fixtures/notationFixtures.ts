export const canonicalDemoSource = `@layout flow TB

# New product idea

Write thoughts. See structure.

[problem @scattered] Customer information is scattered
  -> [cause] Excel files are fragmented
  -> [cause] Team knowledge is siloed

[idea @unify] AI unifies notes and structure
[todo @interview] User interviews

@unify -> @scattered : solves

{Discovery}
  @scattered
  @interview`

export const allDiagnosticsSource = `  -> [node] Orphan child
[problem
[node]
[node @1invalid] Invalid ID
[node @duplicate] First duplicate
[node @duplicate] Second duplicate
@missing -> @duplicate
   [node] Invalid indentation
	[node] Tab indentation
@layout invalid
@layout flow TB
@layout flow LR
{Outer}
  {Inner}
  @missing
@duplicate -> @duplicate :
{}`

export const unicodeCrLfSource =
  '😀 intro\r\n[idea @emoji] 🚀 Plan\r\n  -> [todo] Done'

export const sourceWithBom = '\uFEFF[node] BOM boundary'

export const certaintyDemoSource = `@layout flow TB

# 解約の分析

先週のインタビューから、解約の原因を整理する。

[problem @churn] 解約が増えている
  !-> [cause] オンボーディングが長い
  ?-> [?hypothesis @price] 価格が高い
  ~-> [~cause] UI が古い

[!idea @onboarding] 初回設定を3ステップにする
[~idea @discount] 値下げする

@onboarding -> @churn : solves
@price ?-> @churn : maybe

{Validated}
  @onboarding`
