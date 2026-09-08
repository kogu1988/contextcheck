# MEMORY — contextcheck Proje Yürütme Kaydı

Bu dosya, contextcheck MVP'sinin (v1.2 spesifikasyonu) phase-by-phase yürütme
planını ve her yürütülen sprint'in ne yaptığını kaydeder. Amaç: hangi işi nasıl,
hangi sırayla yaptığımızı geriye dönük takip edebilmek.

- **Kaynak spesifikasyon:** `Product & Technical Master Specification v1.2.md`
- **Kapsam:** 8 phase, her biri sprint'lere bölündü
- **Mevcut durum:** Phase 1-8 TAMAMLANDI
- **Test sonucu:** 148 test, build + lint + prettier + audit(0) yeşil
- **Kısıt kaynağı:** Spesifikasyon §60 "Agent Implementation Rules" (29 kural)

---

## Çalışma Kuralı (AGENTS.md'de de sabit)

Her phase sırayla başlatılıp bitirilir. Bir phase'e başlamadan önce onu analiz
edip sprint'lere bölünür; sprint'ler bağımlılık sırasına göre tek tek
tamamlanır; her sprint sonunda build/test/lint ile doğrulanır. Bir sonraki
phase ancak mevcut phase tamamen bitince başlar.

---

## Phase 1 — Project Foundation ✅

**Amaç:** `npx contextcheck analyze` çalışacak, test/lint destekli temiz bir
TypeScript CLI iskeleti. Analiz mantığı yok.

### Sprint 1 — Proje iskeleti & TS yapılandırması
- `package.json` (name: contextcheck, type: module, bin, engines), `tsconfig.json`
  (strict, NodeNext, outDir dist), `src/index.ts` scaffold, `.gitignore`
- Doğrulama: `tsc` hatasız derlendi (`dist/index.js/.d.ts/.map` üretildi)

### Sprint 2 — CLI framework & komut iskeleti
- `commander` v12 eklendi; `src/cli/index.ts` — analyze/snapshot/diff/config
  stub komutları, shebang + bin wiring
- Doğrulama: `--help`, `--version`, komutlar, `analyze --verbose --json`
  bayrakları çalışıyor

### Sprint 3 — Test & lint altyapısı
- Vitest kurulumu + NodeNext `.js→.ts` çözümleme plugin'i (`vitest.config.ts`)
- ESLint (typescript-eslint) + Prettier
- Doğrulama: `npm test` (1 smoke), `npm run lint`, prettier-check yeşil

### Sprint 4 — Paketleme & DoD doğrulama
- `README.md` quick-start; `npm pack` + tarball'ı temp klasöre kurup
  `npx contextcheck` çalıştırma
- Doğrulama: paket kurulumu + bin uçtan uca çalışıyor

**Phase 1 çıktı:** Teknoloji yığını (TS/commander/vitest/eslint), 4 komut
iskeleti, `npm pack` çalışır durumda.

---

## Phase 2 — Discovery ✅

**Amaç:** Spec §14/§15 ile tanımlı AI configuration dosyalarını excluded
dizinlerle birlikte keşfeden scanner + adapter'lar.

### Sprint 1 — Modeller & tarayıcı
- `src/types/configuration.ts`, `finding.ts`, `report.ts`
- `src/discovery/exclusions.ts` (§15 excluded dizinler), `scanner.ts`
  (recursive walk), testler (8 test)
- Doğrulama: excluded dizinler atlanıyor, relative path normalize

### Sprint 2 — Adapter'lar (claude/agents/skill/cursor)
- `src/discovery/adapters/types.ts` (`ConfigurationAdapter` portu), `artifact.ts`
  (id/metadata/token), `claude.ts`, `agents.ts`, `skill.ts`, `cursor.ts`
- `matches` + `parse` unit testleri
- Doğrulama: her adapter fixture'ı doğru çözüyor

### Sprint 3 — Discovery engine birleştirme
- `src/discovery/discover.ts` — scanner + adapter'lar birleşik, parse hata
  toleransı (§34)
- Karma fixture (Claude+Cursor+Skill) entegrasyon testi
- Doğrulama: doğru tipler, `node_modules` hariç, unowned (README)

### Sprint 4 — Fixture repo'lar & excluded gerçek testi
- `test/fixtures/claude-and-cursor/` fixture repo + excluded regression
- Doğrulama: `.git`/`dist`/`.next`/`node_modules` yapılandırması raporlanmıyor

**Phase 2 çıktı:** Discovery 5 formatı buluyor, excluded dizinler atlanıyor,
normalize artifact üretiliyor.

---

## Phase 3 — Normalization (Parsing) ✅

**Amaç:** Spec §16/§17 parsing + scope. Frontmatter, markdown, plain-text,
glob pattern, scope çıkarımı.

### Sprint 1 — Frontmatter & Scope parser
- `src/parser/frontmatter.ts` (satır-bazlı YAML `---` blokları, `yaml` paketi),
  `scope.ts` (`globs`/`alwaysApply` → `ConfigurationScope`)
- Doğrulama: geçerli/bozuk/frontmatter'sız, tekli string glob senaryoları

### Sprint 2 — Markdown & plain-text bölüm çıkarımı
- `src/parser/markdown.ts` (heading → section), `plain-text.ts` (§18 fallback:
  boş satırla block chunking, kısa blokları atla)
- Doğrulama: section extraction + block chunking testleri

### Sprint 3 — Parsing orchestration & normalization eklentisi
- `src/parser/parse.ts` (frontmatter + sections + blocks birleşik),
  `buildArtifact` scope autodetect
- Doğrulama: `.mdc`, `.cursorrules`, `CLAUDE.md`, skill senaryoları
- Karar: `parseConfiguration` type parametresiz (bölümleme içeriğe göre)

### Sprint 4 — Entegrasyon & Phase 2 bağlantısı
- Adapter artifact'ları artık `scope` içeriyor; fixture scope doğrulama
- Doğrulama: `database.mdc` → `{patterns:[...], alwaysApply:false}`

**Phase 3 çıktı:** Parser frontmatter/markdown/plain-text/glob işliyor, içerik
mutasyonu yok, bozuk sözdizimi `partial result`.

---

## Phase 4 — Analyzer ✅ (En kritik phase)

**Amaç:** Tüm finding kurallarını üreten deterministic, açıklanabilir motor.
Spec §57 sırası.

### Sprint 1 — Engine framework + finding factory + large-file
- `src/analyzer/rules/mapping.ts` (normatif type→label→severity→confidence,
  Rule 17), `large-file.ts` (§20), `src/analyzer/engine.ts` (rule isolation)
- Doğrulama: normatif mapping, large-file eşiği, engine izolasyonu

### Sprint 2 — Token estimation modülü
- `src/tokens/estimator.ts` (§21 `chars/4`), artifact.ts delegasyonu
- Doğrulama: estimatör deterministik

### Sprint 3 — Duplicate detection
- `src/parser/normalize.ts` (strip frontmatter + normalize),
  `duplicate.ts` (Rule 22), engine'e kayıt
- Doğrulama: kritik frontmatter-strip regression + cross-file tek finding
  (Rule 16)

### Sprint 4 — Repetition detection
- `repetition.ts` — markdown section + plain-text block fallback (Rule 21)
- Doğrulama: semantic-fark text turolu represet edilmiyor

### Sprint 5 — High-stakes heuristic
- `high-stakes.ts` (Rule 20: path + scope/glob + content), §27 sözlüğü
- Doğrulama: CAUTION/notice/medium, "critical" sözcüğü yok (§27 testi bug
  yakaladı ve düzeltildi)

### Sprint 6 — Git history sufficiency + scoped-no-match
- `src/git/sufficiency.ts` (Rule 26 shallow `.git/shallow`, §24),
  `src/git/history.ts` (changed-files + globMatch), `scoped-no-match.ts`
  (§23/25, Rule 18)
- Doğrulama: insufficient→no false scoped findings; "unused/obsolete" yok
  (Rule 8/9); glob `**` regex bug'ı düzeltildi

### Sprint 7 — Context overhead aggregation
- `context-overhead.ts` (estimateOverhead + buildContextOverheadFinding),
  engine `aggregate` → summary.potentialContextOverhead
- Doğrulama: §22 "wasted tokens" ifadesi yok, agregasyon deterministik

### Sprint 8 — Entegrasyon & fixture'lar
- `src/analyzer/run.ts` (`runAnalyze`: discover + git sufficiency + analyze),
  end-to-end testler
- Doğrulama: duplicate+large-file+overhead report, git yoksa da devam (§34)

**Phase 4 çıktı:** 6 finding tipi çalışıyor, git uçtan uca, privacy-safe, DoD
yeşil.

---

## Phase 5 — CLI ✅

**Amaç:** `contextcheck analyze` / `--verbose` / `--json` (Rule 23/25).

### Sprint 1 — Config dosyası yükleme
- `src/config/load.ts` (`.contextcheck.json`, §52, default'lar)
- Doğrulama: bozuk/eksik config → default'lar

### Sprint 2 — JSON çıktı (privacy-safe DTO)
- `src/output/json.ts` — `ArtifactJson` DTO, raw content yok (Rule 23/25)
- Doğrulama: JSON'da `content` field yapısal olarak imkânsız

### Sprint 3 — Terminal renderer
- `src/output/terminal.ts` — summary + `[INFO]`/`[CONTEXT]`/`[REVIEW]`/
  `[CAUTION]`, `--verbose` detayı
- Doğrulama: "wasted tokens"/causal iddiası yok (§22, §4.5)

### Sprint 4 — CLI bağlama
- `analyze` komutu `runAnalyze` + renderer/JSON'а bağlandı
- Doğrulama: fixture repo üzerinden uçtan uca, `--json` grep ile 0 `content`

**Phase 5 çıktı:** `analyze`/`--verbose`/`--json` çalışıyor, çıktı privacy-safe.

---

## Phase 6 — Snapshot & Diff ✅

**Amaç:** `contextcheck snapshot` + `diff` (§29, §30, §31).

### Sprint 1 — Snapshot manager
- `src/snapshot/manager.ts` — `.contextcheck/snapshots/*.json`, content yok,
  `.contextcheck` discovery'ye excluded eklendi
- Doğrulama: snapshot privacy-safe, listeleme/sıralama

### Sprint 2 — Diff hesaplama
- `src/snapshot/diff.ts` — per-file token delta, added/removed/changed,
  `renderDiff` (§30 formatı)
- Doğrulama: token değişimi + toplam context

### Sprint 3 — CLI bağlama
- `snapshot` + `diff [from]` komutları bağlandı
- Doğrulama: fixture'ta snapshot→modify→diff (+13 tokens) çalışıyor

### Sprint 4 — Entegrasyon & doğrulama + README
- `.contextcheck` discovery hariç; README komutları güncelledi
- Doğrulama: tam build/test/lint yeşil

**Phase 6 çıktı:** snapshot/diff çalışıyor, disk dosyası privacy-safe.

---

## Phase 7 — Testing ✅

**Amaç:** Spec §58 test gereksinimlerini tamamlamak, gerçek git regression'ları.

### Sprint 1 — Git regression fixture'ları (gerçek git)
- `test/helpers/git.ts` (init/commit/dated/shallow hermetic), `git-regression.test.ts`
- Doğrulama: `.git/shallow` (Rule 26), yetersiz/yeterli history
- Not: `--since` committer date'e bakıyor → `GIT_COMMITTER_DATE` env eklendi

### Sprint 2 — scoped-no-match uçtan uca gerçek git
- `test/scoped-git-e2e.test.ts` — matched/unmatched/insufficient
- Doğrulama: gerçek repo ile scoped findings doğru
- Not: test yolu `.cursor/rules/db.mdc` kullanılmalı (cursor adapter eşleşmesi)

### Sprint 3 — Tam kapsam & DoD
- `test/coverage-map.ts` + `coverage.test.ts` (audit: gerekli test dosyaları var)
- Doğrulama: §58 9 madde kapsandı, every rule module has sibling test

**Phase 7 çıktı:** 148 test, gerçek git regression'ları, §58 kapsam haritası.

---

## Phase 8 — Packaging ✅

**Amaç:** `npx contextcheck` yayına hazır paket.

### Sprint 1 — package.json üretim metadatası
- `exports`, `main`/`types`, `license`(MIT), `repository`, `keywords`,
  `publishConfig`, `engines >=20`, `LICENSE` dosyası
- Doğrulama: exports/main/types yolları geçerli

### Sprint 2 — Yayın öncesi `npm pack` + `npx` uçtan uca
- Tarball sadece `dist`+`README` (117 dist dosya, kaynak/nodemodules yok)
- `npx contextcheck analyze`/`--json`/`snapshot`/`diff` kurulu pakette çalıştı
- Doğrulama: `--json` 0 `content`, snapshot 0 `content`

**Phase 8 çıktı:** `npx contextcheck` çalışıyor, 0 zafiyet, yayına hazır.

---

## Nihai Proje Durumu

- **Komutlar:** `analyze` (+`--verbose`,`--json`), `snapshot`, `diff [from]`,
  `config` (stub); `.contextcheck.json` config
- **Alt sistemler:** discovery, parser, analyzer (6 rule), git, tokens,
  snapshot, output (terminal/json), config
- **Formate desteği:** CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules,
  .cursor/rules/**
- **Kısıtlar korundu:** local-first, deterministic (no LLM/embedding/DB),
  privacy-safe JSON (Rule 23/25), review-never-remove, normatif mapping
  (Rule 17, 27), Git sufficiency (Rule 18, 26), scoped review candidate
  (Rule 8, 9), context overhead "wasted tokens" yok (§22)

### Doğrulama özeti
```
build:  tsc  OK
test:   vitest 148 passed
lint:   eslint OK
prettier: check OK
audit:  0 vulnerabilities
npx:    analyze/json/snapshot/diff all work end-to-end
```

### Bilinen takip maddeleri
- Node `>=20` öneriliyor (ESLint v9 ve transitive `eslint-visitor-keys` için)
- `npm publish` öncesi gerçek GitHub remote + CI kurulumu
- Cloud / monetization / B2B governance spesifikasyona göre MVP dışı (bilinçli)

---

## Gerçek Dünya Pilotu (8 repo) — 2026

Milestone 1'in gerçek repo'lardaki faydasını ölçmek için 8 farklı gerçek
repository klonlandı (tam history) ve `contextcheck analyze` koşuldu.
Repolar: gosec, terraform-provider-proxmox, react-data-table-component,
gravity, nodejieba, owncloud-notes, unpoller, graphframes.

### Bulgu sayıları (finding type dağılımı)
```
gosec:          high-stakes × 3
proxmox:        high-stakes × 2, large-file × 1
react-dt:       high-stakes × 1
gravity:        (yok)
nodejieba:      (yok)   <- temiz repo, 0 bulgu (iyi)
owncloud-notes: high-stakes × 1
unpoller:       high-stakes × 3, large-file × 1, repetition × 2, context-overhead × 1
graphframes:    high-stakes × 1, large-file × 1
```

### Kritik gözlemler
1. **scoped-no-match HİÇ tetiklenmedi.** Tüm 8 gerçek repoda `scope`
   (globs/alwaysApply frontmatter) taşıyan ZERO artifact bulundu. Gerçek
   dünyada CLAUDE.md/.cursorrules/AGENTS.md çoğunlukla düz metin/markdown;
   `.cursor/rules/*.mdc`'in `globs`'u yaygın değil. Kural şu an fiilen
   dead-code; değeri sorgulanmalı veya daha geniş scope algılama gerekli.
2. **high-stakes false-positive riski YÜKSEK.** Eşleşen keyword'lerin çoğu
   rutin bağlam: "deploy" (Netlify redeploy, docs deployment), "security"
   (Security Gateways dosyası), "database". Örn.:
   - react-dt "deploy" → "master push triggers Netlify redeploy" (rutin)
   - graphframes "deploy" → "documentation deployed to graphframes.io" (rutin)
   - unpoller "security" → `usg.go - Security Gateways` (dosya adı)
   - unpoller "deploy" → build/deployment scripts (rutin)
   Keyword seti çok geniş (deploy/production/security/database); gerçek
   kritik kurallar (gerçek secret/credential/auth/payment bağlamı) daha
   nadir ve daha hedefli olmalı.
3. **repetition (unpoller) GENUINE bulgu.** `.cursorrules` + `CLAUDE.md`
   arasında `# Architecture` ve `# Dependencies` bölümleri normalize edilince
   birebir aynı → gerçek çift kayıt. Markdown yapısını cezalandırmıyor,
   doğru yakalıyor.
4. **large-file anlamlı** (proxmox 6.5k, unpoller 5.3k, graphframes 2k).
5. **duplicate hiç oluşmadı** — tamamen aynı body'ye sahip config dosyaları
   gerçek repolarda nadir. (repetition daha duyarlı ve faydalı.)
6. **Temiz repo'lar (gravity, nodejieba) 0 bulgu** → false-positive yok,
   sessiz kalma davranışı doğru.

### Ürün kararı: high-stakes REVISE NOW (pilot sonrası)

Pilot, high-stakes'in güvenilirliği azalttığını kanıtladı. Kural iki katmanlı
modele revize edildi (`src/analyzer/rules/high-stakes.ts`):

- **STRONG_TERMS** (tek başına CAUTION): secret, credential, password,
  authentication, authorization, permission, payment, api key, private key,
  access token. Word-boundary + plural-aware eşleşme.
- **CONTEXTUAL_TERMS** (tek başına ASLA tetiklemez): deploy, deployment,
  production, security, database, billing, infrastructure, migration.
  Sadece strong sinyali güçlendirir, yerine geçmez.
- **Path/scope adı tek başına tetiklemez**: `.env.example`, `config/auth.ts`,
  `auth/middleware.ts`, `secrets.md`, `deployment.md` CAUTION üretmez.
- Artık `detectHighStakes` YALNIZCA content üzerinden strong term arar.

### Diğer rule kararları (ürün sınıflandırması)
| Rule             | Durum                       |
| ---------------- | --------------------------- |
| duplicate        | KEEP                        |
| repetition       | KEEP / değerli               |
| large-file       | KEEP                        |
| context-overhead | KEEP                        |
| high-stakes      | REVISE (yapıldı)             |
| scoped-no-match  | KEEP, VALIDATION NEEDED     |

- scoped-no-match'e dokunulmadı: pilot gösterdi ki kural YANLIŞ çalışmıyor,
  8 repoda scope taşıyan artifact yoktu. Karmaşıklık eklenmedi, düşük profil
  capability olarak bırakıldı.
- `duplicate` vs `repetition`: tam dosya duplicate gerçekte nadir; aynı
  bölümün farklı dosyalarda tekrarı (repetition) gerçek problem -> repetition
  muhtemelen ileride daha önemli.

### Düzeltme sonrası doğrulama (4 gerçek repo tekrar koşuldu)
```
react-dt:    0 bulgu  (eski 1 false CAUTION 'deploy' -> GİTTİ)
graphframes: 1 ~large-file (eski false 'deploy' CAUTION -> GİTTİ)
unpoller:    5 bulgu, high-stakes=1 (eski 3 -> 2 fevvae false gitti)
proxmox:     2 bulgu, high-stakes=1 (eski 2 -> auth-only tek başına tetiklemiyor)
```

- Test suite: 159 test (pilot false-positive regression'ları eklendi: react-dt
  'deploy', graphframes 'deploy', 'security gateways', 'deployment scripts',
  path-name-only no-trigger).
- Sonraki adım: CLI UX / CI (high-stakes revizyonu tamam).  
