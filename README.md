# contextcheck

> AI coding configuration intelligence layer

contextcheck, AI coding agent'lar tarafından kullanılan instructions, rules ve
skills dosyalarını keşfeden, deterministic olarak analiz eden ve context
maliyeti hakkında açıklanabilir bilgiler sunan local-first bir developer
tooludur.

- Local-first: içerik makineden çıkmaz
- Deterministic: analyzers LLM çağrısı yapmaz
- Açıklanabilir: her finding ne/neden/hangi dosya açıklamalı

## Kurulum

```bash
# Global
npm install -g contextcheck

# veya npx ile
npx contextcheck analyze
```

## Kullanım

```bash
# Tüm AI configuration dosyalarını keşfet + analiz et
contextcheck analyze

# Detaylı bulgular
contextcheck analyze --verbose

# Makine tarafından okunabilir, privacy-safe JSON çıktısı
contextcheck analyze --json

# CI'da findings eşik üstüyse başarısız ol
contextcheck analyze --json --fail-on notice
```

## Komutlar

- `contextcheck analyze` — keşfet ve analiz et
- `contextcheck analyze --verbose` — detaylı bulgular
- `contextcheck analyze --json` — privacy-safe JSON (raw content yok)
- `contextcheck analyze --fail-on <info|notice|warning>` — eşik üstü finding'de exit 1
- `contextcheck snapshot` — AI configuration snapshot oluştur
- `contextcheck diff` — en son snapshot ile mevcut durumu karşılaştır
- `contextcheck config` — yapılandırma (`.contextcheck.json`)

## Exit code politkası

Varsayılan (informational): findings CI'ı kırmaz — `no findings`, `info` ve
`notice` hepsi `exit 0`. `--fail-on` belirtilirse eşik (veya üstü) seviyesinde
finding varsa `exit 1`:

```bash
# notice (REVIEW/CAUTION) findings → exit 1; sadece info → exit 0
contextcheck analyze --fail-on notice
```

`--fail-on` değeri finding **severity** kullanır (info < notice < warning).
Label→severity: INFO/CONTEXT → info, REVIEW/CAUTION → notice.

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
          fetch-depth: 0   # scoped-no-match Git history için tam geçmiş
      - run: npx contextcheck analyze --json
```

`fetch-depth: 0` önemli: shallow checkout'u ContextCheck tespit eder ve
`scoped-no-match`'i güvenli şekilde atlar (Rule 26). Varsayılan olarak CI
informational; findings'leri gate'lemek istersen `--fail-on notice` ekle. Bu
repo'da workflow `.github/workflows/contextcheck.yml` mevcut ve paket yayınlanana
kadar repo içinden dogfooding modunda çalışır (yayın sonrası `npx`'e döner).

## Geliştirme

```bash
npm install
npm run build     # tsc
npm test          # vitest
npm run lint      # eslint
```

## Lisans

MIT — bkz. [LICENSE](LICENSE).
