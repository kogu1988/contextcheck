# Türkçe Launch — ContextCheck

> Türkiye odaklı topluluklar için. Ana mesaj İngilizce versiyonla aynı:
> **AI coding context büyüyor, değişiyor ve kimse ne hale geldiğini takip etmiyor.**
> Ton: samimi, problem-first, fazla "satış" dilinden uzak. İngilizce metni
> olduğu gibi çevirmek yerine Türk topluluğunun doğal konuşma tonuna uyarlandı.

## Kanal bazlı kullanım

| Kanal | Kullanım |
|---|---|
| **Reddit (r/Turkey, r/CodingTurkey, r/Programlama, r/yazilim)** | Problem-first, uzun versiyon — topluluk tartışmasına açık |
| **Ekşi Sözlük** | Çok kısa ve düz; "ben yaptım, deneyin, kırın" tonu. Başlık + kısa gövde |
| **dev.to Türkçe / Medium TR** | Uzun versiyon, başlıklar ve kod bloklarıyla |
| **Discord / Telegram grupları (yazılım, AI)** | Kısa tek mesaj: tek komut + tek vaat + link |

---

## Uzun versiyon (Reddit / dev.to / Medium TR)

AI coding agent'ları daha iyi hale geliyor.
Ama onlara verdiğimiz **context** — yani talimat dosyaları — gittikçe dağılıyor.

`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules`, skill'ler ve diğer
talimat dosyaları sessizce büyüyor, çakışıyor, birbirini tekrarlıyor; bazen de
gözden geçirilmesi gereken kritik kurallar içeriyor.

Bunun için **ContextCheck**'i yazdım — o context katmanını görünür kılan,
local-first bir CLI.

Şu anda dört şey yapıyor:

- AI kodlama kurallarını ve talimatlarını analiz ediyor
- context overhead'ini tahmin ediyor
- tekrar eden, çoğaltılmış ve potansiyel olarak kritik (high-stakes) yapılandırmaları
  tespit ediyor
- durumun anlık görüntüsünü (snapshot) alıp sonradan neyin değiştiğini gösteriyor

Kullanım:

```bash
npx @kogu/context-check@beta analyze
```

Sonra:

```bash
npx @kogu/context-check@beta snapshot
```

Kurallarını değiştir ve çalıştır:

```bash
npx @kogu/context-check@beta diff
```

Yok:
- LLM API'si
- bulut
- telemetry
- veritabanı
- otomatik düzenleme/silme

Erken bir public beta — bana iltifat değil, **gerçek repo** lazım: false
positive, false negative, ve snapshot → diff iş akışı gerçekten işe yarıyor mu?

GitHub: https://github.com/kogu1988/contextcheck

## Kısa versiyon (Ekşi Sözlük)

AI kodlama agent'larının verdiğimiz context'i gittikçe kirleniyor. `CLAUDE.md`,
`AGENTS.md`, `.cursor/rules` dosyaları sessizce büyüyor, tekrar ediyor, çakışıyor.
ContextCheck bunu analiz edip zaman içinde neyin değiştiğini gösteren local-first
bir CLI. LLM yok, bulut yok, telemetry yok.

```bash
npx @kogu/context-check@beta analyze
```

Deneyin, kendi repo'nuzda kırın, geri bildirim verin.
github.com/kogu1988/contextcheck

## Tek mesaj (Discord / Telegram / X)

AI agent'ların da bir context katmanı var: `CLAUDE.md`, `AGENTS.md`,
`.cursor/rules`, skill'ler. Büyüyor, değişiyor, tekrarlanıyor — ve çoğu araç ne
olduğunu söylemiyor. ContextCheck bu katmanı **analiz edip diff'liyor**.

```bash
npx @kogu/context-check@beta analyze
```

sonra snapshot, kuralını değiştir, diff.
Lokal. LLM yok. Telemetry yok. Beta yayında.

github.com/kogu1988/contextcheck

---

## Ortak ayaklar (her Türkçe versiyonda korunan mesaj)

1. **Problem:** context katmanı büyür, değişir, çoğalır — kimse takip etmiyor
2. **Tek komut:** `npx @kogu/context-check@beta analyze`
3. **Workflow:** snapshot → değiştir → diff
4. **Ayrım:** lokal, LLM yok, bulut yok, telemetry yok, otomatik silme yok
5. **Çağrı:** gerçek repo + dürüst feedback — feature listesi değil

## Türkçe feedback çağrısı (3 soru)

ContextCheck'i kullandıktan sonra cevapla:

1. **Sana doğru geldi mi?** (analiz çıktısı beklediğin gibi mi — false pos/neg)
2. **Bu bulguyu gördükten sonra context dosyanda bir şey değiştirdin mi?**
3. **Snapshot → diff'i tekrar kullanır mısın?**

Üçüncü soruya gerçekten "evet" deyip ikinci kez kullanman, herhangi bir
istatistikten çok daha değerli.
