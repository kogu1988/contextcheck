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

# Makine tarafından okunabilir JSON çıktısı
contextcheck analyze --json
```

## Komutlar

- `contextcheck analyze` — keşfet ve analiz et
- `contextcheck analyze --verbose` — detaylı bulgular
- `contextcheck analyze --json` — privacy-safe JSON (raw content yok)
- `contextcheck snapshot` — AI configuration snapshot oluştur
- `contextcheck diff` — en son snapshot ile mevcut durumu karşılaştır
- `contextcheck config` — yapılandırma (`.contextcheck.json`)

## Geliştirme

```bash
npm install
npm run build     # tsc
npm test          # vitest
npm run lint      # eslint
```

## Lisans

Gelecekte eklenir.
