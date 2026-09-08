# contextcheck
## AI Coding Configuration Intelligence Layer

**Document Type:** Product & Technical Master Specification  
**Product Stage:** MVP  
**Primary User:** Solo developers, vibecoders, AI-assisted developers  
**Strategy:** Local-first, CLI-first, cloud-optional  
**Status:** Implementation-ready  
**Specification Version:** 1.2

**Product:** ContextCheck
**Domain:** contextcheck.app
**GitHub:** contextcheck/contextcheck
**CLI:** npx contextcheck analyze

---

# 1. Product Definition

contextcheck, AI coding agents tarafından kullanılan coding instructions, rules ve skills dosyalarını analiz eden, versiyonlayan ve geliştiriciye bunların yapısı ile potansiyel context maliyeti hakkında açıklanabilir bilgiler veren local-first bir developer tool'dur.

Temel positioning:

> AI coding instructions için lint + version control + intelligence layer.

contextcheck AI coding agent'ın iç davranışını doğrudan ölçmez.

contextcheck, bir rule'un AI performansını yüzde olarak artırdığını veya azalttığını iddia etmez.

Ürün öncelikle geliştiricinin repository'sindeki AI configuration katmanını görünür, ölçülebilir ve yönetilebilir hale getirir.

---

# 2. Problem

Modern AI coding workflow'larında geliştiriciler giderek daha fazla configuration kullanıyor:

- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/*.mdc`
- `.cursor/rules/*.md`
- `SKILL.md`
- `.cursorrules`
- Copilot instructions
- Windsurf rules
- Roo Code rules
- project-specific instruction files

Bu dosyalar zaman içinde büyüyor.

Bunun sonucunda:

- duplicate instructions oluşabiliyor
- aynı bilgi birden fazla dosyada tekrar edilebiliyor
- instruction dosyaları gereğinden fazla büyüyebiliyor
- scope'lar karmaşıklaşabiliyor
- rule ile repository değişiklikleri arasındaki ilişki belirsizleşebiliyor
- configuration zaman içinde bakımsız hale gelebiliyor
- configuration değişikliklerinin Git history içinde izlenmesi zorlaşabiliyor
- geliştirici AI context'inin configuration tarafından yaklaşık ne kadar tüketildiğini bilmiyor

contextcheck'ın odağı:

**Configuration Intelligence.**

---

# 3. Product Thesis

> AI coding instructions are software configuration artifacts.

Dolayısıyla bunların:

- discovery
- parsing
- linting
- analysis
- review
- versioning
- observability

katmanlarına ihtiyacı vardır.

contextcheck bu configuration'ları birinci sınıf software artifact haline getirmeyi hedefler.

---

# 4. Product Principles

## 4.1 Local-first

İlk değer cloud account gerektirmeden sağlanmalıdır.

Repository ve instruction içerikleri varsayılan olarak cihazdan çıkmamalıdır.

## 4.2 Deterministic-first

MVP'deki analizler mümkün olduğunca deterministic olmalıdır.

LLM çağrısı gerektiren analizler MVP kapsamına alınmayacaktır.

## 4.3 Explainability over magic

Her finding:

- ne bulunduğunu
- neden bulunduğunu
- hangi dosyada bulunduğunu
- mümkünse neyin review edilmesi gerektiğini

açıklamalıdır.

## 4.4 Review, never blindly remove

contextcheck kullanıcı adına configuration silmez veya değiştirmez.

Özellikle security, authentication, payment veya deployment gibi düşük frekanslı ama kritik olabilecek kurallar "unused" veya "obsolete" olarak etiketlenmemelidir.

Bunun yerine:

**Review candidate**

olarak gösterilir.

## 4.5 No fake precision

MVP'de aşağıdakiler kullanılmayacaktır:

- Health Score
- AI Score
- Success Score
- causal impact percentage
- "%8 better"
- "%20 worse"

## 4.6 No unnecessary infrastructure

MVP için aşağıdakiler zorunlu değildir:

- backend
- database
- authentication
- vector database
- embeddings
- Redis
- background workers
- LLM API

---

# 5. Target Users

Primary:

- solo developers
- indie hackers
- vibecoders
- AI-assisted software engineers
- open-source developers

Özellikle birden fazla AI coding tool kullanan geliştiriciler hedef kullanıcıdır.

Secondary, future:

- startup engineering teams
- small engineering teams
- engineering managers
- developer experience teams
- AI coding governance teams

---

# 6. MVP Scope

MVP dört ana modülden oluşur:

### A. Discover

AI configuration dosyalarını bulur.

### B. Analyze

Bulunan configuration'ları deterministic olarak analiz eder.

### C. Review

Kullanıcıya açıklanabilir findings sunar.

### D. Version

AI configuration snapshot ve diff oluşturur.

Cloud MVP'nin temel çalışma gereksinimi değildir.

---

# 7. CLI

Ana kullanım:

```bash
contextcheck analyze
```

veya:

```bash
npx contextcheck analyze
```

İlk kullanımda account creation gerekmemelidir.

---

# 8. CLI Command Structure

MVP:

```text
contextcheck
├── analyze
├── snapshot
├── diff
└── config
```

Future:

```text
contextcheck
├── analyze
├── snapshot
├── diff
├── sync
├── cloud
└── impact
```

---

# 9. `contextcheck analyze`

Komut repository root üzerinden çalışır.

Örnek:

```bash
contextcheck analyze
```

Örnek çıktı:

```text
contextcheck

AI CONFIGURATION REPORT

Configuration files       23
Skills                     8
Estimated context      14,820 tokens

Potential Context Overhead
~4,210 tokens

FINDINGS

[REVIEW]
3 scoped rules have no matching file changes
in the analyzed Git history window.

[CONTEXT]
4 instruction files are unusually large.

[CAUTION]
1 configuration contains potentially high-stakes
instructions related to deployment/authentication.

[INFO]
2 sections appear duplicated across configuration files.

Run `contextcheck analyze --verbose` for details.
```

Bu çıktı:

```text
Your rules are wasting 4,210 tokens.
```

şeklinde yazılmamalıdır.

Doğru ifade:

```text
Potential Context Overhead
~4,210 tokens
```

---

# 10. Finding Taxonomy

contextcheck'daki `type`, `label` ve `severity` birbirinden farklı kavramlardır.

### Type

Finding'in teknik nedenidir.

### Label

CLI'da kullanıcıya gösterilen kategoridir.

### Severity

Finding'in önem seviyesidir.

Bunlar aşağıdaki şekilde sabitlenmiştir:

| Finding Type | CLI Label | Severity | Default Confidence |
|---|---|---|---|
| `duplicate` | `[INFO]` | `info` | `high` |
| `repetition` | `[INFO]` | `info` | `medium` |
| `large-file` | `[CONTEXT]` | `info` | `high` |
| `scoped-no-match` | `[REVIEW]` | `notice` | `medium` |
| `high-stakes` | `[CAUTION]` | `notice` | `medium` |
| `context-overhead` | `[CONTEXT]` | `info` | `medium` |

Bu mapping MVP'de normative'dir.

AI coding agent kendi severity veya label mapping'i oluşturamaz.

---

# 11. Severity Rules

### `info`

Bilgilendirici finding.

### `notice`

İncelenmesi faydalı olabilecek finding.

Kullanıcıya aksiyon önerilebilir ancak durum problem olarak sunulmamalıdır.

### `warning`

MVP analyzer tarafından normal koşullarda kullanılmayacaktır.

`warning` enum'da gelecekteki genişleme için bulunabilir, ancak MVP'deki analyzer rule'ları `warning` üretmeyecektir.

High-stakes finding:

```text
[CAUTION]
severity = notice
```

olmalıdır.

---

# 12. Finding Data Model

Findings artifact'ın içine gömülmeyecektir.

Configuration artifact yalnızca configuration'ı temsil eder.

Top-level report:

```ts
interface AnalysisReport {
  summary: AnalysisSummary
  artifacts: ConfigurationArtifact[]
  findings: Finding[]
}
```

Artifact:

```ts
interface ConfigurationArtifact {
  id: string
  type: ConfigurationType
  path: string
  content: string

  scope?: ConfigurationScope

  metadata: {
    sizeBytes: number
    estimatedTokens: number
    lineCount: number
  }
}
```

Finding:

```ts
interface Finding {
  id: string

  type:
    | "duplicate"
    | "repetition"
    | "large-file"
    | "scoped-no-match"
    | "high-stakes"
    | "context-overhead"

  label:
    | "INFO"
    | "CONTEXT"
    | "REVIEW"
    | "CAUTION"

  severity:
    | "info"
    | "notice"
    | "warning"

  confidence:
    | "high"
    | "medium"
    | "low"

  filePaths: string[]

  title: string

  description: string

  recommendation?: string
}
```

Cross-file findings tek bir finding olarak oluşturulur.

Örneğin duplicate:

```json
{
  "type": "duplicate",
  "label": "INFO",
  "severity": "info",
  "confidence": "high",
  "filePaths": [
    "CLAUDE.md",
    "AGENTS.md"
  ]
}
```

Aynı finding iki artifact'a kopyalanmaz.

---

# 13. Confidence Rules

Confidence teknik detection yönteminin güvenilirliğini ifade eder.

## High

Deterministic ve doğrudan doğrulanabilir sonuçlar.

Örnek:

- exact duplicate
- exact file size threshold
- exact path detection
- valid parsed glob
- exact token estimation result

## Medium

Deterministic yöntemle elde edilen ancak yorum gerektiren sonuçlar.

Örnek:

- repeated section
- scoped rule no-match
- high-stakes keyword detection
- context overhead aggregation

## Low

MVP analyzer tarafından mümkün olduğunca kullanılmamalıdır.

Low-confidence findings MVP'de üretilirse uncertainty açıkça gösterilmelidir.

Analyzer rule'ları yukarıdaki sınıflandırmaya uymalıdır.

---

# 14. Discovery Engine

Discovery engine repository'yi tarayarak desteklenen AI configuration formatlarını bulur.

MVP:

```text
CLAUDE.md
AGENTS.md
SKILL.md
.cursorrules
.cursor/rules/**
```

Future adapters:

```text
.github/copilot-instructions.md
.windsurf/**
.roo/**
```

Platform-specific logic adapter sistemi içinde tutulmalıdır.

---

# 15. Discovery Boundaries

Discovery recursive scanning sırasında aşağıdaki dizinleri varsayılan olarak taramayacaktır:

```text
.git
node_modules
vendor
dist
build
.next
out
coverage
.cache
tmp
temp
```

Amaç:

1. third-party dependency configuration'larının yanlışlıkla bulunmasını engellemek
2. generated output'u analiz etmemek
3. gereksiz filesystem traversal'ı azaltmak
4. performansı korumak

Örneğin:

```text
node_modules/some-package/CLAUDE.md
```

kullanıcının project configuration'ı olarak raporlanmamalıdır.

Discovery yalnızca repository/project scope içindeki kullanıcı configuration'ına odaklanmalıdır.

---

# 16. Normalized Configuration Model

```ts
interface ConfigurationArtifact {
  id: string
  type: ConfigurationType
  path: string
  content: string

  scope?: ConfigurationScope

  metadata: {
    sizeBytes: number
    estimatedTokens: number
    lineCount: number
  }
}
```

Types:

```ts
type ConfigurationType =
  | "rule"
  | "skill"
  | "instruction"
  | "agent-config"
  | "unknown"
```

Scope:

```ts
interface ConfigurationScope {
  patterns?: string[]
  alwaysApply?: boolean
}
```

---

# 17. Parsing

Parser platform-specific syntax'i normalized model'e dönüştürür.

Parser:

- frontmatter
- markdown
- plain text
- glob patterns
- supported metadata

işleyebilmelidir.

Parser hiçbir dosyanın içeriğini değiştirmez.

Bozuk syntax durumunda analyzer mümkün olduğunca partial result üretmelidir.

---

# 18. Repetition Detection

Markdown heading varsa:

```text
heading + normalized section content
```

karşılaştırılabilir.

Normalization:

- lowercase
- whitespace normalization
- line-ending normalization
- markdown formatting normalization

YAML frontmatter repetition detection'ın body comparison'ından çıkarılmalıdır.

Heading bulunmayan dosyalar için fallback zorunludur.

## Plain-text fallback

Özellikle `.cursorrules` gibi düz metin dosyalarında paragraph/block-based chunking kullanılmalıdır.

Fallback yaklaşımı:

1. boş satırlarla ayrılmış paragraph/block'ları ayır
2. çok kısa blokları ignore et
3. whitespace normalize et
4. normalize edilmiş block'ları karşılaştır
5. aynı deterministic text block'larını repetition candidate olarak işaretle

MVP semantic similarity kullanmaz.

Dolayısıyla semantic olarak benzer fakat textual olarak farklı iki instruction repetition olarak işaretlenmez.

---

# 19. Duplicate Detection

Exact duplicate deterministic olarak tespit edilir.

Duplicate comparison şu sırayla yapılmalıdır:

1. YAML frontmatter varsa çıkar.
2. Sadece document body alınır.
3. Body normalize edilir.
4. Normalize edilmiş body hash'lenir.
5. Hash değerleri karşılaştırılır.

**Duplicate hash comparison MUST strip YAML frontmatter before normalization; only body content is compared.**

Frontmatter'daki:

- `description`
- `alwaysApply`
- `globs`
- platform-specific metadata

farklı olsa bile aynı instruction body duplicate candidate olarak değerlendirilebilir.

Örnek:

```text
CLAUDE.md
AGENTS.md

Identical instruction body detected.
```

Bu finding:

```text
type = duplicate
label = INFO
severity = info
confidence = high
```

olmalıdır.

---

# 20. Large Instruction Detection

Dosya boyutu tek başına kötü değildir.

Default thresholds:

```text
> 2,000 estimated tokens
CONTEXT NOTICE

> 4,000 estimated tokens
CONTEXT WARNING
```

Ancak MVP taxonomy nedeniyle iki durumda da:

```text
label = CONTEXT
severity = info
```

kullanılır.

Örnek:

```text
[CONTEXT]

CLAUDE.md
Estimated size: ~4,800 tokens

This file is relatively large and may contribute
significantly to model context.
```

---

# 21. Token Estimation

Amaç exact model billing hesabı yapmak değildir.

Basit implementation:

```text
estimatedTokens = characterCount / 4
```

kullanabilir.

Daha sonra provider-specific tokenizer adapter eklenebilir.

Token değerleri yaklaşık olarak sunulur.

---

# 22. Context Overhead

Potential Context Overhead aşağıdaki deterministic sinyaller üzerinden hesaplanabilir:

- duplicate content
- repeated sections/blocks
- repeated instructions
- large configuration files
- overlapping configuration structures

MVP semantic redundancy tespit etmeyecektir.

Metrik:

```text
Potential Context Overhead
~4,210 tokens
```

şeklinde gösterilir.

“Wasted tokens” ifadesi kullanılmaz.

---

# 23. Scoped Rule Analysis

Scoped rule'lar Git history ile karşılaştırılabilir.

Örnek:

```text
globs:
  - "components/**/*.tsx"
```

Git history içerisinde eşleşen dosya değişiklikleri aranır.

Ancak bu analiz yalnızca yeterli Git history varsa yapılır.

---

# 24. Git History Sufficiency

Bu kural kritik bir first-run güvenlik mekanizmasıdır.

Default analysis window:

```text
90 days
```

Aşağıdaki durumlardan biri gerçekleşirse `scoped-no-match` findings üretilmeyecektir:

1. `git log --since=<window>` sonucu boşsa.
2. Repository'nin toplam commit history'si analiz window'undan daha kısaysa.
3. Repository shallow clone ise ve history sınırının analiz sonucunu etkileyebileceği tespit edilirse.
4. Git history analiz edilemeyecek kadar yetersizse.

Shallow clone detection için MVP implementation:

```text
.git/shallow
```

dosyasının varlığı kontrol edilmelidir.

Yeterli history bulunmadığında:

```text
[INFO]

Not enough Git history in this repository
to evaluate rule activity.

Scoped-rule review findings were skipped.
```

gösterilir.

Bu durumda `scoped-no-match` finding oluşturulmaz.

---

# 25. Scoped No-Match Finding

Yeterli Git history varsa ve scoped rule'un pattern'i analiz edilen history'de hiçbir matching file change bulamazsa:

```text
[REVIEW]

No matching file changes detected
for this rule in the analyzed Git history window.

This does NOT mean the rule is unused.
Consider reviewing its scope and purpose.
```

Finding:

```text
type = scoped-no-match
label = REVIEW
severity = notice
confidence = medium
```

olmalıdır.

Hiçbir koşulda:

```text
Unused rule
```

veya:

```text
Obsolete rule
```

yazılmamalıdır.

---

# 26. High-Stakes Detection

High-stakes heuristic üç kaynağı kontrol edecektir:

1. file path
2. scope/glob patterns
3. file content

Keyword matching case-insensitive olmalıdır.

Örnek keyword kategorileri:

```text
security
auth
authentication
authorization
permission
permissions
secret
secrets
credential
credentials
payment
payments
billing
deploy
deployment
production
database
migration
infrastructure
```

Herhangi bir keyword:

- path içinde
- glob pattern içinde
- content içinde

bulunursa high-stakes candidate oluşturulabilir.

Örnek:

```text
[CAUTION]

Potentially high-stakes configuration detected.

This instruction appears related to authentication.

Review manually before modifying or removing it.
```

Finding:

```text
type = high-stakes
label = CAUTION
severity = notice
confidence = medium
```

Bu sistem security classifier değildir.

---

# 27. High-Stakes False Positive Policy

Keyword match tek başına:

```text
Critical
Dangerous
Security vulnerability
```

gibi ifadeler üretmemelidir.

Amaç:

**Potentially high-stakes**

uyarısı vermektir.

Kullanıcının yanlışlıkla düşük frekanslı fakat kritik bir configuration'ı silmesini engellemek önceliklidir.

---

# 28. Review Philosophy

Ana UX flow:

```text
Analyze
   ↓
Explain
   ↓
Review
```

Otomatik remediation yoktur.

contextcheck:

- dosya silmez
- rule değiştirmez
- content rewrite etmez
- configuration'ı otomatik optimize etmez

---

# 29. Snapshot

```bash
contextcheck snapshot
```

AI configuration snapshot oluşturur.

Snapshot yalnızca AI configuration dosyalarını içerir.

---

# 30. Diff

```bash
contextcheck diff
```

AI configuration değişikliklerini gösterir.

Örnek:

```text
contextcheck CONFIG DIFF

CLAUDE.md
  - 620 tokens
  + 410 tokens

.cursor/rules/api.mdc
  + new rule

AGENTS.md
  duplicate section removed

Estimated context:

Previous     ~14,820
Current      ~12,430

Difference   ~2,390 tokens
```

---

# 31. Git Integration

contextcheck Git'i yeniden yaratmaz.

Git zaten version control sağlar.

contextcheck'ın rolü:

> AI configuration-specific view over Git.

MVP:

- Git history read
- changed files read
- diff metadata
- commit metadata

Automatic commit oluşturma zorunlu değildir.

---

# 32. JSON Output

Komut:

```bash
contextcheck analyze --json
```

machine-readable output üretir.

**Raw configuration content JSON output'a varsayılan olarak dahil edilmez.**

Örnek:

```json
{
  "summary": {
    "configurationFiles": 23,
    "skills": 8,
    "estimatedTokens": 14820,
    "potentialContextOverhead": 4210
  },
  "artifacts": [
    {
      "id": "artifact_1",
      "type": "instruction",
      "path": "CLAUDE.md",
      "metadata": {
        "sizeBytes": 19240,
        "estimatedTokens": 4800,
        "lineCount": 312
      }
    }
  ],
  "findings": []
}
```

Artifact `content` alanı default JSON serialization'dan çıkarılmalıdır.

JSON output:

- source code içermez
- raw configuration body içermez
- prompt content içermez

Kullanıcı açıkça isterse gelecekte:

```bash
contextcheck analyze --json --include-content
```

gibi explicit opt-in bir flag sağlanabilir.

`--include-content` MVP için zorunlu değildir.

---

# 33. JSON Privacy Rule

JSON serializer hiçbir koşulda `ConfigurationArtifact.content` alanını default olarak serialize etmemelidir.

Bunun yerine explicit DTO kullanılmalıdır.

Örneğin:

```ts
interface ArtifactJson {
  id: string
  type: ConfigurationType
  path: string
  scope?: ConfigurationScope
  metadata: ArtifactMetadata
}
```

Raw artifact model ile public JSON model aynı object olmamalıdır.

Bu ayrım zorunludur.

Amaç gelecekte:

```bash
contextcheck analyze --ci
```

gibi bir command'ın yanlışlıkla configuration içeriğini CI logs'a göndermesini engellemektir.

---

# 34. Error Handling

Tek bir dosyanın parse edilememesi tüm analysis'i başarısız yapmamalıdır.

Örneğin:

```text
[WARNING]

Could not parse frontmatter:
.cursor/rules/example.mdc

Continuing analysis...
```

Analyzer mümkün olduğunca partial results üretmelidir.

---

# 35. Performance

Hedef:

Small repository:

```text
< 1 second
```

Medium repository:

```text
1–5 seconds
```

contextcheck source code'un tamamını parse etmemelidir.

Esas taranan içerik AI configuration dosyalarıdır.

Git history gerektiğinde yalnızca gerekli metadata ve changed-file bilgisi okunmalıdır.

---

# 36. Privacy

Default behavior:

**No configuration content leaves the machine.**

MVP:

- prompt content göndermez
- repository content göndermez
- source code göndermez
- Git remote URL göndermez
- LLM API kullanmaz
- telemetry göndermez

JSON output default olarak raw configuration content içermez.

---

# 37. Future Observed Impact

Bu özellik MVP sonrasıdır.

Opt-in anonymous outcome signals kullanılabilir.

Örnek:

```text
Observed outcomes

Build success
82 / 100

Commit after session
71 / 100

Rollback
4 / 100
```

Causal claim yapılmaz.

---

# 38. Synthetic Benchmarking

MVP'de yoktur.

Future research alanıdır:

- LLM-as-judge
- benchmark task suites
- model comparison
- automated code-generation evaluation

---

# 39. Health Score

MVP'de yoktur.

Tek bir configuration score kullanıcıya gereğinden fazla kesinlik verir.

İlk aşamada explainable raw findings kullanılacaktır.

---

# 40. Public Leaderboard

MVP'de yoktur.

Future public metrics için:

- minimum sample threshold
- anti-Sybil protection
- privacy controls
- insufficient-data state

gereklidir.

---

# 41. Product Layers

## Layer 1: CLEAN

- discovery
- token estimation
- context overhead
- duplicates
- large instructions
- structural findings

## Layer 2: CONTROL

- snapshots
- diff
- history
- Git integration
- sync

## Layer 3: UNDERSTAND

- observed outcomes
- aggregate intelligence
- team insights
- future benchmarking

MVP:

**CLEAN → CONTROL**

---

# 42. Validation Strategy

İlk pilot yaklaşık 20 developer ile yapılabilir.

Bu sayı istatistiksel anlamlılık iddiası için kullanılmaz.

Amaç:

**Product signal discovery.**

Primary:

> Kullanıcı analiz sonucunda configuration üzerinde gerçek bir değişiklik yapıyor mu?

Secondary:

> Kullanıcı 7 gün içinde tekrar analyze çalıştırıyor mu?

Qualitative:

> Kullanıcı neden değişiklik yapmadı?

---

# 43. Pilot Interpretation

20 kullanıcı için hard pass/fail threshold kullanılmaz.

Örnek yön gösterici aralıklar:

```text
0–3 actions
Weak signal

4–7 actions
Mixed signal

8–12 actions
Strong early signal

13+
Very strong early signal
```

Bunlar statistical thresholds değildir.

Nitel örüntüler sayısal sonuç kadar önemlidir.

---

# 44. Research Method

Kullanıcıya önceden analyzer'ın tam olarak ne bulacağını anlatmak behavioral bias yaratabilir.

İlk test mümkün olduğunca:

```text
Install contextcheck and analyze your repository.

Tell us what you find useful, confusing,
incorrect, or irrelevant.
```

şeklinde yürütülmelidir.

---

# 45. Activation

Basic activation:

```text
contextcheck analyze
```

Strong activation:

```text
analyze
+
review finding
+
modify configuration
```

---

# 46. Core Product Metrics

Takip edilecek:

- activation
- action rate
- 7-day return
- finding engagement
- false-positive rate
- analysis reliability

Action rate tek başına product-market fit göstergesi olarak kullanılmayacaktır.

---

# 47. Non-Goals

MVP:

- AI coding agent geliştirmez
- AI model host etmez
- prompt marketplace değildir
- skill marketplace değildir
- agent marketplace değildir
- automatic rule generation yapmaz
- automatic rule deletion yapmaz
- automatic prompt optimization yapmaz
- semantic embeddings kullanmaz
- LLM-based scoring kullanmaz
- benchmark engine içermez
- causal performance analytics içermez
- public leaderboard içermez
- team administration içermez
- payment system içermez
- mandatory cloud account gerektirmez

---

# 48. Competitive Positioning

contextcheck:

**AI skills marketplace değildir.**

**AI agent değildir.**

**npm for AI skills değildir.**

**LLM benchmark değildir.**

Ana farklılaşma:

```text
Distribution
    ↓
Crowded

Configuration Intelligence
    ↓
contextcheck
```

contextcheck:

```text
What do I have?

How large is it?

What is repeated?

What deserves review?

What changed?
```

sorularına cevap verir.

---

# 49. CLI Architecture

```text
src/

  cli/
    index.ts

  discovery/
    scanner.ts
    adapters/
      claude.ts
      cursor.ts
      agents.ts
      skill.ts

  parser/
    markdown.ts
    plain-text.ts
    frontmatter.ts
    scope.ts

  analyzer/
    engine.ts
    rules/
      duplicate.ts
      repetition.ts
      large-file.ts
      scoped-no-match.ts
      high-stakes.ts
      context-overhead.ts

  git/
    history.ts
    changed-files.ts
    sufficiency.ts

  tokens/
    estimator.ts

  snapshot/
    manager.ts
    diff.ts

  output/
    terminal.ts
    json.ts

  types/
    configuration.ts
    finding.ts
    report.ts
```

---

# 50. Adapter Architecture

```ts
interface ConfigurationAdapter {
  name: string

  discover(rootPath: string): ConfigurationArtifact[]

  parse(filePath: string): ConfigurationArtifact
}
```

Platform-specific behavior adapter içinde kalmalıdır.

---

# 51. Analyzer Architecture

Pipeline:

```text
Repository
    ↓
Discovery
    ↓
Parsing
    ↓
Normalization
    ↓
Individual Analyzer Rules
    ↓
Finding[]
    ↓
Report Aggregation
    ↓
Renderer
```

Analyzer rules birbirinden bağımsız çalışmalıdır.

---

# 52. Configuration File

Optional:

```text
.contextcheck.json
```

Örnek:

```json
{
  "analysis": {
    "largeFileTokens": 2000,
    "warningFileTokens": 4000,
    "gitWindowDays": 90
  }
}
```

Default değerler configuration dosyası olmadan çalışmalıdır.

---

# 53. CI Future

Future:

```bash
contextcheck analyze --ci
```

CI integration sonraki aşamadır.

CI output da raw configuration content içermemelidir.

JSON veya CI output serializer'ları privacy-safe DTO kullanmalıdır.

---

# 54. Future Monetization

Potential Free:

- local analysis
- basic findings
- snapshots
- diff

Potential Pro:

- cloud sync
- cross-machine history
- advanced analytics
- team configuration
- observed impact
- CI integrations

Potential pricing:

```text
Pro
$9–15/month

Team
$29–49/month
```

Pricing implementation öncesi market validation gerektirir.

---

# 55. Future B2B Direction

Uzun vadeli monetization alanı:

**AI coding governance**

Potential capabilities:

- central policy
- approved rules
- configuration drift
- rule versioning
- team sync
- audit history
- CI enforcement

Bunlar MVP değildir.

---

# 56. Product Vision

Uzun vadede contextcheck:

> The intelligence layer for AI-native software development.

olmayı hedefler.

Future artifacts:

- skills
- agents
- prompts
- MCP configuration
- coding policies
- AI workflows

Ancak MVP'nin kapsamı:

**AI coding configuration.**

---

# 57. Implementation Order

## Phase 1 — Project Foundation

- TypeScript
- CLI framework
- build
- test framework
- linting
- package configuration

## Phase 2 — Discovery

Implement:

- CLAUDE.md
- AGENTS.md
- SKILL.md
- `.cursorrules`
- `.cursor/rules/**`
- excluded directory logic

## Phase 3 — Normalization

Implement:

- ConfigurationArtifact
- ConfigurationScope
- Finding
- AnalysisReport
- AnalysisSummary

## Phase 4 — Analyzer

Order:

1. file discovery validation
2. file size
3. token estimation
4. exact duplicates with frontmatter stripping
5. repeated sections/blocks
6. high-stakes heuristic
7. Git history sufficiency
8. scoped Git matching
9. context overhead aggregation

## Phase 5 — CLI

Implement:

```bash
contextcheck analyze
contextcheck analyze --verbose
contextcheck analyze --json
```

JSON output must exclude raw artifact content.

## Phase 6 — Snapshot

Implement:

```bash
contextcheck snapshot
contextcheck diff
```

## Phase 7 — Testing

Create fixture repositories for:

- Cursor
- Claude
- mixed configurations
- duplicate files with different frontmatter
- repeated markdown sections
- plain-text rules
- large files
- high-stakes candidates
- new repositories
- shallow Git repositories
- insufficient history
- excluded directories
- JSON privacy

## Phase 8 — Packaging

Prepare:

```bash
npx contextcheck analyze
```

for external installation.

---

# 58. Testing Requirements

Her analyzer rule için unit tests zorunludur.

Required tests:

```text
duplicate.test.ts
repetition.test.ts
large-file.test.ts
high-stakes.test.ts
scoped-no-match.test.ts
git-sufficiency.test.ts
json-output.test.ts
```

Özellikle aşağıdaki regression testleri zorunludur:

### Duplicate with frontmatter

Two files with identical body but different YAML frontmatter must produce one duplicate finding.

### New repository

No false scoped-no-match findings.

### Shallow repository

No false scoped-no-match findings.

### No Git

Analyzer continues successfully.

### Third-party directory

`node_modules` configuration is ignored.

### Cross-file duplicate

Only one finding with multiple `filePaths`.

### Plain-text rule

Repetition fallback works without markdown headings.

### High-stakes rule

Path, glob and content are all checked.

### JSON privacy

Default JSON output contains artifact metadata but no raw `content`.

---

# 59. Definition of Done

```text
[ ] npm package installs successfully
[ ] contextcheck analyze works
[ ] Discovery detects supported formats
[ ] Excluded directories are ignored
[ ] Normalized model works
[ ] Token estimation works
[ ] Duplicate detection strips YAML frontmatter
[ ] Duplicate detection works across different frontmatter
[ ] Repetition fallback works for plain text
[ ] Large-file detection works
[ ] High-stakes detection checks path/glob/content
[ ] High-stakes finding uses CAUTION + notice
[ ] Scoped Git analysis checks history sufficiency
[ ] Shallow repositories are detected through .git/shallow
[ ] New repositories do not produce false scoped findings
[ ] Shallow repositories do not produce false scoped findings
[ ] Cross-file findings exist only at report level
[ ] Finding type/label/severity mapping is deterministic
[ ] Finding confidence is deterministic
[ ] JSON output excludes raw artifact content by default
[ ] JSON serializer uses privacy-safe DTOs
[ ] No raw configuration content is emitted by default CI output
[ ] Graceful degradation works
[ ] Terminal output is readable
[ ] JSON output works
[ ] Snapshot works
[ ] Diff works
[ ] Unit tests cover analyzer rules
[ ] Fixture repositories exist
[ ] No mandatory cloud dependency
[ ] No LLM API dependency
[ ] No embeddings dependency
[ ] No source/config content leaves machine by default
[ ] README contains quick-start
[ ] Package works through npx
```

---

# 60. Agent Implementation Rules

AI coding agent implementing this project MUST follow these rules.

### Rule 1

Do not expand the MVP without explicit product justification.

### Rule 2

Do not add an LLM API dependency to the analyzer.

### Rule 3

Do not introduce embeddings.

### Rule 4

Do not introduce a database.

### Rule 5

Do not introduce authentication.

### Rule 6

Do not build dashboard UI before CLI functionality is complete.

### Rule 7

Do not implement Health Score.

### Rule 8

Do not label a rule as “unused” based only on Git activity.

### Rule 9

Do not label a rule as “obsolete”.

### Rule 10

Do not automatically delete or modify user configuration.

### Rule 11

Do not claim causal impact.

### Rule 12

Every finding must be explainable.

### Rule 13

Prefer deterministic algorithms.

### Rule 14

Keep platform-specific logic inside adapters.

### Rule 15

Keep analyzer logic independent from presentation.

### Rule 16

Cross-file findings MUST live at `AnalysisReport.findings`, not inside individual artifacts.

### Rule 17

The Finding type → label → severity → confidence mapping defined in this document is normative.

### Rule 18

Scoped-rule activity analysis MUST be skipped when Git history is insufficient.

### Rule 19

Discovery MUST exclude the directories defined in Section 15 by default.

### Rule 20

High-stakes detection MUST inspect file path, scope/glob patterns and content.

### Rule 21

Plain-text configuration files MUST support block-based repetition fallback.

### Rule 22

Duplicate comparison MUST strip YAML frontmatter before normalization.

### Rule 23

Default JSON output MUST NOT contain raw configuration content.

### Rule 24

Raw configuration content may only be exposed through an explicit future opt-in mechanism.

### Rule 25

JSON and CI serializers MUST NOT directly serialize the internal `ConfigurationArtifact` object.

### Rule 26

Shallow Git repositories MUST be detected using `.git/shallow`.

### Rule 27

Do not silently invent new finding types, labels or severity levels.

### Rule 28

Do not treat observational data as causal evidence.

### Rule 29

Optimize for a solo developer maintaining the project.

---

# 61. Final Product Definition

contextcheck is not another AI prompt marketplace.

It is not another AI coding agent.

It is not an LLM benchmark.

It is not an AI performance scoring system.

It is not initially a cloud dashboard.

contextcheck starts as a small developer tool answering:

> **What is actually inside my AI coding configuration, and what deserves my attention?**

The first version must be useful before it is connected to anything.

Implementation order:

```text
LOCAL VALUE
    ↓
DISCOVERY
    ↓
ANALYSIS
    ↓
REVIEW
    ↓
VERSIONING
    ↓
REAL-WORLD SIGNALS
    ↓
CLOUD
    ↓
TEAM / GOVERNANCE
```

Do not reverse this order.

The first implementation target is the local CLI analyzer.

Do not begin with:

- dashboard
- authentication
- cloud
- billing
- telemetry
- benchmark
- AI scoring

until the local analyzer provides reliable first-day value.
