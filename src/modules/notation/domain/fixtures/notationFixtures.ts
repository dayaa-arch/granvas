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
