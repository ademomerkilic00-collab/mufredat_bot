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
    await page.goto('https://yazokulu.tugvaistanbul.tr/login');
    
    // Giriş bilgilerini doldur
    await page.fill('input[name="_1_email"]', EMAIL);
    await page.fill('input[name="_1_password"]', PASSWORD);
    await page.click('button[type="submit"]');
    
    // Girişin tamamlanmasını bekle
    await page.waitForURL('https://yazokulu.tugvaistanbul.tr/ogretmen**', { timeout: 15000 });
    console.log("🔓 Sisteme başarıyla giriş yapıldı.");

    // Müfredat sayfasına git
    console.log("📂 Müfredat sayfasına gidiliyor...");
    await page.goto('https://yazokulu.tugvaistanbul.tr/ogretmen/mufredat');
    await page.waitForLoadState('networkidle');

    // "Bugün" yazan açılır menüyü bul ve tıkla
    console.log("🔍 Bugünkü ders menüsü aranıyor...");
    const bugunSatiri = page.getByText('Bugün', { exact: false }).first();
    await bugunSatiri.click({ force: true });
    
    // Menünün açılması için kısa bir süre bekle
    await page.waitForTimeout(2000);

    // 4 adet dersi kontrol et ve işaretle
    console.log("📝 Dersler kontrol ediliyor...");
    for (let i = 1; i <= 4; i++) {
      try {
        // "1 BENİM SAHABEM" gibi başlayan yazıyı bul
        const dersYazisi = page.getByText(new RegExp(`^${i}\\s`), { exact: false }).first();
        
        // Bu yazının içinde bulunduğu ana kutuyu (card) bulalım ki içinde "İşlendi" yazıyor mu diye bakalım
        const dersKutusu = dersYazisi.locator('xpath=ancestor::div[contains(@class, "rounded") or contains(@class, "border") or contains(@class, "bg-")][1]');
        
        const icerik = await dersKutusu.innerText();
        
        if (!icerik.includes('İşlendi')) {
          console.log(`  📌 ${i}. Ders işaretleniyor...`);
          // Kutunun kendisine veya içindeki yazıya tıkla
          await dersYazisi.click({ force: true });
          await page.waitForTimeout(1000); // Tıklama sonrası küçük bekleme
        } else {
          console.log(`  ✅ ${i}. Ders zaten işlenmiş, atlanıyor.`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${i}. Ders ekranda bulunamadı.`);
      }
    }

    // Kaydet butonuna bas
    console.log("💾 Müfredat kaydediliyor...");
    const kaydetBtn = page.locator('button', { hasText: /Kaydet/i }).first();
    await kaydetBtn.scrollIntoViewIfNeeded();
    await kaydetBtn.click({ force: true });
    
    console.log("⏳ Sisteme işlenmesi bekleniyor...");
    await page.waitForTimeout(5000);
    
    console.log("🎉 Müfredat başarıyla TÜGVA sistemine kaydedildi!");

  } catch (err) {
    console.error("❌ HATA OLUŞTU:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
