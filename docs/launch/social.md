# Social Launch — ContextCheck (X / LinkedIn / Mastodon)

> Kısa tut. Tek komut + tek vaat + link. Dikkat süresi kısa.

## X (Twitter) — tek gönderi

AI coding agents have a context layer too.

`CLAUDE.md` · `AGENTS.md` · `.cursorrules` · `.cursor/rules` · skills · instructions

It grows. It changes. It gets duplicated.
Most tooling doesn't tell you what happened to it over time.

I built ContextCheck to inspect and diff that layer.

```bash
npx @kogu/context-check@beta analyze
```

Then snapshot + diff:
```bash
npx @kogu/context-check@beta snapshot
# change your rules
npx @kogu/context-check@beta diff
```

Local-first. No LLM. No telemetry. No cloud.
Public beta is live.
https://github.com/kogu1988/contextcheck

## LinkedIn — biraz daha bağlamlı

AI coding agents are getting better; the context we give them is getting
messier. Instruction files (CLAUDE.md, AGENTS.md, .cursor/rules, skills)
quietly grow, overlap, duplicate, or contain config that deserves review.
ContextCheck inspects that layer, estimates context overhead, flags
duplicates/repetition/high-stakes config, and lets you snapshot + diff the
context over time — fully local, no LLM, no telemetry.
Early public beta: `npx @kogu/context-check@beta analyze`.
I'm looking for real repositories and honest feedback (false positives /
negatives, workflow usefulness), not just stars.

## Mastodon / Dev.to — kısa tekrar

AI coding agents have a context layer too. It grows, changes, gets duplicated,
and most tooling ignores it. ContextCheck inspects + diffs it, locally.
`npx @kogu/context-check@beta analyze` → snapshot → change rules → diff.
No LLM. No telemetry. Beta live.
https://github.com/kogu1988/contextcheck

---

## Ortak ayaklar (üç sosyal kanalda korunan mesaj)

1. **Problem:** context layer büyür, değişir, çoğalır
2. **Tek komut:** `npx @kogu/context-check@beta analyze`
3. **Workflow:** snapshot → change → diff
4. **Ayrım:** lokal, no LLM, no telemetry, no cloud
5. **Çağrı:** gerçek repo + dürüst feedback (feature listesi değil)
