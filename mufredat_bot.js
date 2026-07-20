const { chromium } = require('playwright');

(async () => {
  console.log("🚀 TÜGVA Müfredat Botu Başlatılıyor...");

  const EMAIL = process.env.TUGVA_EMAIL;
  const PASSWORD = process.env.TUGVA_PASSWORD;

  if (!EMAIL || !PASSWORD) {
    console.error("❌ HATA: E-posta veya şifre bulunamadı! Lütfen GitHub Secrets ayarlarını kontrol edin.");
    process.exit(1);
  }

  console.log("🌐 Tarayıcı açılıyor ve TÜGVA'ya giriş yapılıyor...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://yazokulu.tugvaistanbul.tr/login', { waitUntil: 'networkidle' });
    
    // ⚠️ ÇOK ÖNEMLİ: Öğretmen sekmesine tıkla (Varsayılan olarak Başkan seçili geliyor)
    console.log("👆 Öğretmen sekmesi seçiliyor...");
    await page.click('button:has-text("Öğretmen")');
    await page.waitForTimeout(1000); // React'in butonu algılaması için kısa bir bekleme
    
    // Giriş bilgilerini doldur
    console.log("🔑 Giriş bilgileri dolduruluyor...");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    
    console.log("🚀 Giriş butonuna basılıyor ve sayfa yönlendirmesi bekleniyor...");
    await Promise.all([
      page.waitForNavigation({ timeout: 20000 }).catch(() => {}), // Form submit yönlendirmesini bekle
      page.click('button[type="submit"]')
    ]);
    
    await page.waitForTimeout(2000); // Yönlendirme sonrası ekstra güvenlik beklemesi
    
    // Eğer hala login sayfasındaysa şifre/email yanlıştır
    if (page.url().includes('login')) {
      throw new Error("❌ Giriş yapılamadı! Lütfen GitHub Secrets bölümündeki TUGVA_EMAIL ve TUGVA_PASSWORD bilgilerinizi doğru yazdığınızdan emin olun.");
    }
    console.log("🔓 Sisteme başarıyla giriş yapıldı.");

    // Müfredat sayfasına git
    console.log("📂 Müfredat sayfasına gidiliyor...");
    await page.goto('https://yazokulu.tugvaistanbul.tr/ogretmen/mufredat', { waitUntil: 'networkidle' });

    // "Bugün" yazan açılır menüyü bul ve tıkla (Eğer zaten açıksa kapatmaması için kontrol ekliyoruz)
    console.log("🔍 Bugünkü ders menüsü aranıyor...");
    const bugunSatiri = page.getByText('Bugün', { exact: false }).first();
    
    // Eğer sayfada "1 " yazısı hiç görünmüyorsa sekme kapalı demektir, o zaman tıkla. 
    // Eğer görünüyorsa zaten açıktır, tıklamaya gerek yok.
    const dersBirGorunurMu = await page.getByText('1 ', { exact: false }).first().isVisible().catch(() => false);
    if (!dersBirGorunurMu) {
        console.log("👆 Menü kapalı, açılıyor...");
        await bugunSatiri.click({ force: true });
        await page.waitForTimeout(2000); // Açılma animasyonu için bekle
    } else {
        console.log("👍 Menü zaten açık, devam ediliyor.");
    }

    // 4 adet dersi kontrol et ve işaretle
    console.log("📝 Dersler kontrol ediliyor...");
    for (let i = 1; i <= 4; i++) {
      try {
        // "1 ", "2 " şeklinde başlayan yazıları arıyoruz ama bulamazsa 30 saniye değil 3 saniye beklesin (Hızlı geçsin)
        const dersYazisi = page.getByText(new RegExp(`^${i}\\s`), { exact: false }).first();
        
        // Bu yazının içinde bulunduğu ana kutuyu (card) bulalım
        const dersKutusu = dersYazisi.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "border") or contains(@class, "bg-")][1]');
        
        const icerik = await dersKutusu.innerText({ timeout: 3000 });
        
        if (!icerik.includes('İşlendi')) {
          console.log(`  📌 ${i}. Ders işaretleniyor...`);
          await dersYazisi.click({ force: true });
          await page.waitForTimeout(1000); 
        } else {
          console.log(`  ✅ ${i}. Ders zaten işlenmiş, atlanıyor.`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${i}. Ders ekranda bulunamadı (Tasarım değişikliği olabilir).`);
      }
    }

    // Kaydet butonuna bas
    console.log("💾 Müfredat kaydediliyor...");
    const kaydetBtn = page.locator('button', { hasText: /Kaydet/i }).first();
    
    // Butonun ekranda var olup olmadığını hızlıca (3 saniyede) kontrol et
    const kaydetVarMi = await kaydetBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (kaydetVarMi) {
        await kaydetBtn.scrollIntoViewIfNeeded();
        await kaydetBtn.click({ force: true });
        console.log("⏳ Sisteme işlenmesi bekleniyor...");
        await page.waitForTimeout(5000);
        console.log("🎉 Müfredat başarıyla TÜGVA sistemine kaydedildi!");
    } else {
        console.log("⚠️ Kaydet butonu bulunamadı, değişiklik yapılmadı.");
    }

  } catch (err) {
    console.error("❌ HATA OLUŞTU:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
