# Reddit Launch — ContextCheck

> Problem-first. Topluluk tonu; sales değil. Kısa, tek gönderi, subreddit
> kurallarına uyumlu. Her subreddit'e birebir kopyalama, bağlama göre kırp.

## Çekirdek metin

AI coding agents are getting better.
The context we give them is getting messier.

`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules`, skills and other
instruction files can quietly grow, overlap, duplicate each other, or contain
configuration that deserves review.

I built **ContextCheck** to inspect that layer. It runs locally and:

- analyzes AI coding rules and instructions
- estimates context overhead
- detects duplicates, repetition and potentially high-stakes configuration
- snapshots the state so you can see what changed later

```bash
npx @kogu/context-check@beta analyze
```

Then snapshot, change your rules, and diff:

```bash
npx @kogu/context-check@beta snapshot
# modify your AI rules
npx @kogu/context-check@beta diff
```

No LLM API. No cloud. No telemetry. No database.

It's an early public beta, so I'm mainly looking for real repositories,
false positives, false negatives, and whether the snapshot → diff workflow is
actually useful — more than compliments.

GitHub: https://github.com/kogu1988/contextcheck

---

## Subreddit notları (gönderirken)

| Subreddit | Odak |
|---|---|
| r/LocalLLaMA | Local-first, no LLM, deterministic vurgusu |
| r/ClaudeAI / r/CursorAI | `CLAUDE.md` + `.cursor/rules` bağlamı, agent instruction files |
| r/ExperiencedDevs | "Context layer bakımsız kalıyor" problemi, governance |
| r/devops | CI (`--fail-on notice`) + reproducibility |

## Feedback İstiyoruz

- Kendi repo'nda dene, kır
- `analyze` çıktısı sana doğru geldi mi? (false pos/neg)
- Bulguyu görünce context dosyanı değiştirdin mi?
- Snapshot → diff'i tekrar kullanır mısın?

En değerli şey 3 kaliteli failure report; 500 yıldız değil.
