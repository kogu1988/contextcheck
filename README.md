# contextcheck

> **See what your AI coding context contains, what changed, and what deserves review.**

> **Beta:** `contextcheck` şu anda beta kanalında yayınlanıyor. Kullanım:
> `npm install -g @kogu/context-check@beta` veya `npx @kogu/context-check@beta analyze`.

contextcheck, AI coding agent'ların kullandığı instructions, rules ve skills
dosyalarını (CLAUDE.md, AGENTS.md, .cursor/rules, SKILL.md) keşfeden,
deterministic olarak analiz eden ve context layer'ın zaman içindeki değişimini
takip etmeni sağlayan **local-first** bir developer tooludur.

- Local-first: içerik makineden çıkmaz
- Deterministic: LLM/embedding/API/DB yok
- Açıklanabilir: her finding ne/neden/hangi dosya açıklamalı
- Review, never remove: otomatik silme/düzeltme yok

## Hızlı Başlangıç (ilk 30 saniye)

```bash
# 1) Mevcut AI context'ini gör
npx @kogu/context-check@beta analyze

# 2) Bir anlık görüntü al
npx @kogu/context-check@beta snapshot

# 3) Kurallarında değişiklik yap, ne değiştiğini gör
npx @kogu/context-check@beta diff
```

Bunların hepsi hesap gerektirmez, hiçbir içerik cihazından çıkmaz.

Global kurulum tercih edersen:

```bash
npm install -g @kogu/context-check@beta
@kogu/context-check analyze
```

## Kullanım

```bash
# Tüm AI configuration dosyalarını keşfet + analiz et
@kogu/context-check analyze

# Detaylı bulgular
@kogu/context-check analyze --verbose

# Hızlı insan çıktısı (summary + findings)
@kogu/context-check analyze --compact

# Makine tarafından okunabilir, privacy-safe JSON çıktısı
@kogu/context-check analyze --json

# CI'da findings eşik üstüyse başarısız ol
@kogu/context-check analyze --json --fail-on notice
```

Üç çıktı kontratı:

```text
@kogu/context-check analyze          -> detaylı, varsayılan (spec §9)
@kogu/context-check analyze --compact -> hızlı insan çıktısı
@kogu/context-check analyze --json    -> CI / automation (privacy-safe)
```

## Komutlar

- `@kogu/context-check analyze` — keşfet ve analiz et
- `@kogu/context-check analyze --verbose` — detaylı bulgular
- `@kogu/context-check analyze --json` — privacy-safe JSON (raw content yok)
- `@kogu/context-check analyze --compact` — hızlı/kompakt insan çıktısı
- `@kogu/context-check analyze --fail-on <info|notice|warning>` — eşik üstü finding'de exit 1
- `@kogu/context-check snapshot` — AI configuration snapshot oluştur
- `@kogu/context-check snapshot list` — kayıtlı snapshot'ları listele
- `@kogu/context-check diff` — en son snapshot ile mevcut durumu karşılaştır (artifact + token + finding değişimleri)
- `@kogu/context-check diff <snapshot-id>` — belirtilen snapshot ile mevcut durumu karşılaştır
- `@kogu/context-check diff --json` — privacy-safe JSON diff
- `@kogu/context-check config` — yapılandırma (`.contextcheck.json`)

## Proje Yönetimi (local registry)

ContextCheck'i bir kez kur; istediğin kadar yerel projeyi ekle. Her repoya
kurulum/entegrasyon yok, repoya kendi dosyanı ekletmez.

```bash
# Kayıtlı projeleri listele
@kogu/context-check projects

# Proje ekle (bir veya birden fazla yol)
@kogu/context-check projects add C:\Projects\PetPal D:\Dev\RoutineMe

# Mevcut dizini kaydet
@kogu/context-check projects add .

# Bir klasördeki muhtemel alt projeleri tara (recursion yok; onay ister)
@kogu/context-check projects scan D:\Projects

# Kayıttan çıkar (gerçek dizine DOKUNMAZ)
@kogu/context-check projects remove <id|path>

# Kayıtlı TÜM projeleri analiz et (snapshot oluşturmaz)
@kogu/context-check projects analyze
```

Registry, OS uygulama/config dizininde yerel bir JSON dosyadır:

```text
Windows:  %APPDATA%\contextcheck\projects.json
POSIX:    ~/.config/contextcheck/projects.json
```

**Önemli:** `projects remove` yalnızca registry'den çıkarır; proje dizinini
asla silmez/değiştirmez. `context-check analyze` her zaman **mevcut dizini**
analiz eder (registry'deki her projeyi değil) — mevcut davranış korunur.

## Exit code politkası

Varsayılan (informational): findings CI'ı kırmaz — `no findings`, `info` ve
`notice` hepsi `exit 0`. `--fail-on` belirtilirse eşik (veya üstü) seviyesinde
finding varsa `exit 1`:

```bash
# notice (REVIEW/CAUTION) findings → exit 1; sadece info → exit 0
@kogu/context-check analyze --fail-on notice
```

`--fail-on` değeri finding **severity** kullanır (info < notice < warning).
Label→severity: INFO/CONTEXT → info, REVIEW/CAUTION → notice.

## Diff (snapshot → current)

`@kogu/context-check diff`, context layer'ın zaman içindeki değişimini gösterir:
artifact (eklenen/silinmiş/değişen dosyalar), toplam context token değişimi ve
**analiz bulgularının değişimi** (yeni/çözülen/değişen finding):

```text
ContextCheck Diff

Snapshot: previous → current

Artifacts
  ~ CLAUDE.md
     59 → 70 tokens

Context
  Previous  ~235 tokens
  Current   ~246 tokens
  Change    +11 tokens

Findings
  + 1 new
  = 1 unchanged

Summary
  0 added · 1 modified · 0 removed
```

Bu, "context layer değişti ve bunun sonucunda hangi bulgular ortaya
çıktı/kayboldu?" sorusunu cevaplar — model performansıyla ilgili kausal iddia
**değildir** (Spec §28).

## Snapshot list ve seçimi (v2)

`@kogu/context-check snapshot list` kayıtlı snapshot'ları gösterir:

```text
ContextCheck Snapshots

ID        Created                 Files  Tokens  Findings
7ebv3k    2026-09-09 00:14:22    12      4,820    3
43d791    2026-09-08 12:03:44    10      3,980    1
```

Belirli bir snapshot'a karşı diff:

```bash
@kogu/context-check diff 7ebv3k
```

`diff --json` CI/automation için privacy-safe JSON üretir (artifact token
delta'ları, finding değişimleri, snapshot metadata — **asla raw content yok**).

## GitHub Actions (CI)

```yaml
name: ContextCheck

on:
  pull_request:
  push:

jobs:
  contextcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # scoped-no-match Git history için tam geçmiş
      - run: npx @kogu/context-check analyze --fail-on notice # CI gate
      - run: npx @kogu/context-check analyze --compact # PR log
```

`fetch-depth: 0` önemli: shallow checkout'u ContextCheck tespit eder ve
`scoped-no-match`'i güvenli şekilde atlar (Rule 26).

İki kullanım modu:

```text
Developer workflow   analyze → snapshot → diff
CI workflow          analyze --fail-on notice
```

`--fail-on notice` REVIEW/CAUTION findings'de CI'ı kırar; yalnızca INFO
(duplicate/large-file) findings build'i kırmaz. Bu repo'da workflow
`.github/workflows/contextcheck.yml` mevcut ve paket yayınlanana kadar repo
içinden dogfooding modunda çalışır (yayın sonrası `npx`'e döner).

## Geliştirme

```bash
npm install
npm run build     # tsc
npm test          # vitest
npm run lint      # eslint
```

## Lisans

MIT — bkz. [LICENSE](LICENSE).

## Yayınlama (maintainer)

Beta kanalına yayın (kontrollü, mevcut `latest`'i korur):

```bash
npm login
npm publish --tag beta
```

Beta'yı test et:

```bash
npm install -g @kogu/context-check@beta
npx @kogu/context-check@beta analyze
```

Stabil sürüm hazır olduğunda `--tag latest` ile (veya `npm dist-tag add @kogu/context-check@<version> latest`)
mevcut sürümü `latest` kanalına taşı.
