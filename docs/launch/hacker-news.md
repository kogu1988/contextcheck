# Hacker News Launch — ContextCheck

> **Show HN: ContextCheck, inspect and track the context your AI coding agents rely on**

AI coding agents are getting better.
The context we give them is getting messier.

`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules`, skills and other
instruction files can quietly grow, overlap, duplicate each other, or contain
configuration that deserves review.

I built **ContextCheck** to inspect that layer.

It runs locally and currently does four things:

- analyzes AI coding rules and instructions
- estimates context overhead
- detects duplicates, repetition and potentially high-stakes configuration
- snapshots the state so you can see what changed later

Example:

```bash
npx @kogu/context-check@beta analyze
```

Then:

```bash
npx @kogu/context-check@beta snapshot
```

Change your AI rules and run:

```bash
npx @kogu/context-check@beta diff
```

No LLM API.
No cloud.
No telemetry.
No database.

It's an early public beta, so I'm mainly looking for something more useful
than compliments: real repositories, false positives, false negatives, and
whether the snapshot → diff workflow is actually useful.

GitHub: https://github.com/kogu1988/contextcheck

---

## Kurulum / Başlangıç

```bash
# Tek komut, hesap yok, hiçbir içerik cihazdan çıkmaz
npx @kogu/context-check@beta analyze

# Bir anlık görüntü al
npx @kogu/context-check@beta snapshot

# Kurallarını değiştir, ne değiştiğini gör
npx @kogu/context-check@beta diff

# CI'da gözden-geçirilecek bulguları gate'le
npx @kogu/context-check@beta analyze --fail-on notice
```

## Feedback İstiyoruz (nitelikli failure report > yıldız)

Aradığımız şeyler:

- **Gerçek repository'ler** — kendi dosyalarında çalıştır
- **False positives / false negatives** — analiz nerede yanlış?
- **Workflow geri bildirimi** — snapshot → diff gerçekten faydalı mı, yoksa sadece bağlanmış regex'ler mi?

Cevaplarını GitHub Issues üzerinden paylaş — launch'ın asıl değeri bu.
