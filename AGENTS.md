# AGENTS.md — contextcheck

## Çalışma Kuralları (Normative)

1. **Phase sırası**: Her phase'i sırayla başlatıp bitireceğim. Bir sonraki phase'e
   geçebilmek için mevcut phase'in tamamı tamamlanmış olmalıdır.

2. **Sprint bölme**: Herhangi bir phase'e başlamadan önce onu analiz edip sprint'lere
   bölerim. Sprint'ler bağımlılık sırasına göre tek tek tamamlanır.

3. **Sprint doğrulama**: Her sprint sonunda doğrulama (build/test/lint) çalıştırırım
   ve tamamlandığını onaylarım.

## Proje Kaynakları

- Kaynak spesifikasyon: `Product & Technical Master Specification v1.2.md`
- Tüm MVP kapsamı, finding taxonomy, mimari ve kısıtlar spesifikasyonda tanımlıdır.
- Spesifikasyon §60 "Agent Implementation Rules" (29 kural) bu projede bağlayıcıdır.
- **Yürütme kaydı**: Tüm phase planları ve sprint özetleri `memory.md` dosyasında.
  Herhangi bir işe başlamadan önce son durumu oradan kontrol ederim.
