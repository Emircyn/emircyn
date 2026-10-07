# Türkçe ve İngilizce içerik çalışması

7 Ekim 2026

Metinler, site genelinde daha kısa içerik tercihi doğrultusunda yeniden kısaltıldı. Açılış ve iletişim tek cümleye, hakkımda bölümü iki kısa paragrafa indirildi. Proje açıklamaları ve mimari adımları sadeleştirildi; yinelenen bilgiler çıkarıldı.

## Kapsam

Ana sayfanın açılış metni, hakkımda bölümü, hizmet açıklamaları, proje tanıtımları, iletişim metni ve gezinme etiketleri düzenlendi. Beş projenin ürün özeti, ihtiyaçları, katkı açıklaması, mimari akışı, geliştirme kararları ve görsel açıklamaları iki dilde yeniden yazıldı. Arama motoru açıklamaları ve sosyal paylaşım metinleri de güncellendi.

Yayındaki metinlerin kaynakları:

- [İngilizce arayüz metinleri](../src/i18n/translations/en.json)
- [Türkçe arayüz metinleri](../src/i18n/translations/tr.json)
- [İki dilde proje içerikleri](../src/content/projects/)

## Okuyucu ve anlatım

Metinler, Emircan’ın nasıl çalıştığını öğrenmek isteyen işe alım ekipleri, teknik ekipler ve bir web projesi için geliştirici arayan kişiler düşünülerek hazırlandı. Bu hedef kitle seçimi, portfolyonun mevcut içeriği ve iletişim bölümüne dayanan editoryal bir yorumdur.

Birinci tekil şahıs kullanılıyor. Ana sayfa, geliştirilen ürünleri ve çalışma yaklaşımını anlatıyor; proje sayfaları teknik ayrıntıyı açıyor. Proje tanıtımları önce ürünün işlevini, ardından geliştiricinin katkısını veriyor. Teknoloji isimleri ve API tanımları korunuyor.

Türkçe ve İngilizce metinler aynı bilgiyi taşıyor, ancak cümleler her dilin doğal kullanımına göre kuruluyor. Türkçede genel kullanıcıya yönelik metinlerde “bağlantı”, “sunucu tarafı”, “önbellek” ve “yayımlama” tercih ediliyor. Teknik rol adları ve ürün isimleri tanınabilir biçimde korunuyor. İngilizcede kısa, doğrudan cümleler ve yerleşik yazılım terimleri kullanılıyor.

Humanizer incelemesinde birebir çeviri hissi veren ifadeler, gereksiz karşıtlıklar, yinelenen sloganlar ve desteklenmeyen kesinlikler ayıklandı. Örneğin Parley için “sonuç her zaman doğru” ifadesi yerine hesaplama aracının desteklenen ifadeleri nasıl değerlendirdiği anlatılıyor. Proje galerisi, okuyucuya bilgi vermeyen “İpteki baskılar” gibi başlıklar yerine doğrudan proje adları ve işlevleriyle tanıtılıyor.

## Araştırma ve kaynaklar

- [Nielsen Norman Group: web için kısa, taranabilir ve nesnel metin](https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/). Başlıklarda ve kısa açıklamalarda somut bilgiye öncelik verilmesi için kullanıldı. Araştırmanın yüzdeleri portfolyoya taşınmadı.
- [Google Search Central: kullanıcıya yararlı içerik](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Ürün işlevi, gerçek katkı ve geliştirme kararlarını açıklama yaklaşımına dayanak oldu. Sıralama veya trafik artışı vaadi eklenmedi.
- [Türk Dil Kurumu: yabancı özel adlara getirilen ekler](https://tdk.gov.tr/icerik/sikca-sorulan-sorular/yabanci-ozel-adlara-ekler-nasil-getirilir-2/) ve [noktalama kuralları](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/). Türkçe ekler ve kurum adları gözden geçirilirken kullanıldı; bazı cümleler ek getirmek yerine yeniden kuruldu.
- [Porch kaynak deposu](https://github.com/Emircyn/porch). Ürün özellikleri, abonelik kuralları, test modu ve kayıtlı performans verileri mevcut proje içeriğiyle karşılaştırıldı.
- [Parley kaynak deposu](https://github.com/Emircyn/parley). Araç kartları, oturum akışı, kullanım sınırları ve model entegrasyonu mevcut proje içeriğiyle karşılaştırıldı.
- [Formadaş](https://formadas.com/). Ürünün iki kulüp veya ülke ve kulüp üzerinden futbolcu arama işlevi incelendi. Teknik ayrıntılar için portfolyonun mevcut proje kaydı ve yerel futbol uygulamasının kaynakları esas alındı.
- [InspireIT Türkçe sitesi](https://inspireit.com.tr/) ve [İngilizce sitesi](https://inspireit.com.tr/en/). Şirketin hizmet alanları ve 2003 başlangıç tarihi karşılaştırıldı. Sitenin tüm geliştirme katkıları şirket sayfasından doğrulanmış sayılmadı; katkı açıklaması mevcut portfolyo kaydına dayanıyor.

## İddiaların sınırı

İş ve eğitim tarihleri, unvanlar, proje yılları ve kişisel katkılar mevcut proje kayıtlarından korundu; bu çalışma kapsamında bağımsız olarak doğrulanmadı. Yeni müşteri, başarı, sertifika veya iş deneyimi eklenmedi.

Lighthouse puanları ve render süreleri mevcut içerikteki geçmiş ölçümlerdir. Bu içerik çalışmasında performans testleri yeniden yapılmadı. Ölçüm tarihi ve yöntem bilgisi korundu; performans puanları açıkça adlandırıldı. Porch için 5 ila 14 ms CPU verisi korunurken tüm isteklerin 10 ms içine sığdığı izlenimini veren başlık değiştirildi. Kontrast kontrolü, tüm ürünün erişilebilirlik uygunluğu iddiasına dönüştürülmedi.

Parley’de günlük yaklaşık 400 yanıt, mevcut ölçüm ortalamasına dayanan bir tahmindir. Metin, kapasitenin modele ve mesaj uzunluğuna bağlı olduğunu belirtiyor. Porch’un ödeme akışı test modu olarak açıklanıyor. Formadaş için verilerin mevcut kayıtlara bağlı olduğu belirtiliyor; Wikidata’nın eksiksiz bir futbolcu kaynağı olduğu iddia edilmiyor.

Gelecek içerik güncellemelerinde özellikler ve sayısal sonuçlar kendi kaynaklarıyla yeniden karşılaştırılmalı. Özellikle AI kotası, model seçimi, test sayısı ve performans ölçümleri değişebilir.
