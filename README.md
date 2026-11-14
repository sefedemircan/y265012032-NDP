# NDP

Hastane ve klinik randevu sistemi. Tek bir klinik ya da çok şubeli bir hastane tanımlanabilir. Hasta yalnızca personelin uygun olduğu ve kurumun açık olduğu saatlere randevu talep eder. Çakışan talepler reddedilir. Randevu, atanan personel veya kurum yöneticisi onaylayana kadar beklemede kalır.

## Çalıştırma

```bash
npm install
```

`.env.example` dosyasını `.env.local` olarak kopyalayıp Supabase proje değerlerini yazın:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (yalnızca sunucu; tarayıcıya çıkmaz)

Supabase SQL Editor'da `supabase/migrations` altındaki göç dosyasını çalıştırın ya da projeyi bağlayıp `supabase db push` kullanın. Auth ayarında e-posta doğrulamasını kapatın; hasta kaydı oturum açabilsin.

```bash
npm run seed
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Demo hesapları

Parola hepsi için `Klinik123!`.

| E-posta | Rol |
| --- | --- |
| hasta@ndp.test | Hasta |
| doktor@ndp.test | Doktor, Merkez Şube |
| laborant@ndp.test | Laboratuvar personeli |
| radyoloji@ndp.test | Radyoloji personeli |
| doktor.serdivan@ndp.test | Doktor, bağımsız klinik |
| yonetici@ndp.test | Sakarya Şehir Hastanesi yöneticisi |

Seed, çok şubeli bir hastane (Merkez ve Korucuk), bağımsız Serdivan kliniği ve onay bekleyen bir randevu oluşturur.

## Sınıflar ve ödev maddeleri

İş kuralları `src/domain` içindedir. Supabase satırları repository'de bu sınıflara çevrilir; çakışma ve onay SQL'de tekrarlanmaz.

- `User`, `Patient`, `Staff`, `Doctor`, `HealthPersonnel`, `ClinicManager`: üç rol. Doktor yalnızca muayene, sağlık personeli yalnızca tanı ve laboratuvar hizmeti verir.
- `HealthcareFacility`, `Hospital`, `Clinic`: hastane şube tutar. Bağımsız klinik ebeveyni olmayan bir kliniktir. Yönetici yalnızca kendi kurumunu tanımlar.
- `Department`, `WorkingHours`, `MedicalService`: bölüm, çalışma saati, süre ve ücret.
- `TimeRange`, `AvailabilitySlot`, `SchedulePolicy`, `Appointment`: hasta yalnızca uygunluk ile çalışma saatinin kesişimine randevu alır. Süre ve ücret talep anında kopyalanır. `approve`, `reject` ve `cancel` durumu dışarıdan yazmaz.

```bash
npm test
```
