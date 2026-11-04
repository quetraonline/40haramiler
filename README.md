# 40HARAMİLER – Ares Server

Knight Online atmosferinde, mobil uyumlu klan topluluk sitesi. React + Vite + Supabase altyapısı kullanır.

## İçerik
- Ana sayfa, yönetim ekibi, Ares Server bilgileri
- Üye kayıt/giriş (Supabase Auth)
- Üye profilleri ve üye listesi
- Duyuru ve etkinlik listeleme
- Yönetici panelinden duyuru/etkinlik ekleme ve silme
- Supabase Row Level Security (RLS) ile sunucu tarafı yetkilendirme

## 1. Yerel önizleme
Node.js 20 veya üzerini kurun. Proje klasöründe:

```bash
npm install
npm run dev
```

Tarayıcıda Vite'ın gösterdiği yerel adresi açın. Supabase ayarlanmadan da tasarım ve örnek duyurular görünür; kayıt/giriş gerçek kullanıcı oluşturmaz.

## 2. Gerçek üyelik sistemini açma
1. https://supabase.com üzerinden yeni bir proje oluşturun.
2. Supabase > SQL Editor bölümünde `supabase/schema.sql` dosyasının tamamını çalıştırın.
3. Supabase > Project Settings > API bölümünden Project URL ve anon/public key değerlerini alın.
4. Proje kökünde `.env.example` dosyasını `.env` adıyla kopyalayın ve değerleri girin:

```env
VITE_SUPABASE_URL=https://PROJE-ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUPABASE_ANON_PUBLIC_KEY
```

5. Supabase Authentication > URL Configuration bölümünde yerel adresinizi ve yayın adresinizi Redirect URLs listesine ekleyin.
6. Siteyi yeniden başlatın (`npm run dev`). Oyuncular kayıt olabilir. E-posta doğrulaması Supabase Auth ayarlarına bağlıdır.

## 3. Gaddar ve Quetra'ya yönetici yetkisi verme
1. Siteden `Gaddar` ve `Quetra` kullanıcı adlarıyla iki ayrı hesap oluşturun.
2. Supabase > SQL Editor'de aşağıdaki komutu çalıştırın:

```sql
update public.profiles
set role = 'admin'
where lower(username) in ('gaddar', 'quetra');
```

3. İki hesap çıkış yapıp tekrar giriş yaptığında Yönetim menüsü görünür.

**Güvenlik:** Yönetici yetkisi tarayıcıdan seçilemez; `role` alanı kullanıcıya açık güncelleme izninde değildir. Duyuru/etkinlik yazma ve silme işlemleri RLS politikalarıyla veritabanında da doğrulanır. `service_role` anahtarını kesinlikle `.env` dosyasına veya tarayıcı koduna koymayın.

## 4. Vercel'de yayınlama
1. Projeyi GitHub'a yükleyin.
2. Vercel'de **Add New > Project** ile depoyu içe aktarın.
3. Framework: Vite, Build Command: `npm run build`, Output Directory: `dist`.
4. Vercel Project Settings > Environment Variables alanına `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` ekleyin.
5. Deploy edin. Yayınlanan alan adını Supabase Authentication > URL Configuration > Redirect URLs listesine ekleyin.

## Önemli notlar
- Sunucu durumu şu an tasarım amaçlıdır; gerçek Ares sunucu API/verisi bağlanmadı.
- Knight Online oyun içi sıralama/karakter verileri için doğrulanmış bir API veya veri kaynağı gerekir.
- Yönetici hesapları, kullanıcı adları kayıt edildikten sonra SQL ile yetkilendirilir. Şifreler bu projede tutulmaz; Supabase Auth yönetir.
