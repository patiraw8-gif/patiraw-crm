-- ========================================================
-- PATI RAW CRM - SUPABASE SQL SCHEMA
-- ========================================================
-- Bu kodu Supabase projenizin SQL Editor kısmına yapıştırıp 
-- RUN butonuna basarak veritabanı tablonuzu oluşturabilirsiniz.
-- ========================================================

-- 1. Müşteriler Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    last_contact_date DATE,
    monthly_consumption NUMERIC DEFAULT 0,
    sample_given BOOLEAN DEFAULT FALSE,
    recall_date DATE,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Arama ve Filtreleme Performansını Artırmak İçin İndeksler Ekle
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- 3. Satır Seviyesi Güvenliği (RLS) Etkinleştir
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 4. Herkesin veri okuma, ekleme, güncelleme ve silme yapabilmesi için politikaları tanımla
-- (Kullanıcı isteği doğrultusunda: "isteyen herkes girip işlem yapabilsin")

DROP POLICY IF EXISTS "Herkes veri okuyabilsin" ON customers;
CREATE POLICY "Herkes veri okuyabilsin" 
ON customers FOR SELECT 
TO anon 
USING (true);

DROP POLICY IF EXISTS "Herkes veri ekleyebilsin" ON customers;
CREATE POLICY "Herkes veri ekleyebilsin" 
ON customers FOR INSERT 
TO anon 
WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes veri güncelleyebilsin" ON customers;
CREATE POLICY "Herkes veri güncelleyebilsin" 
ON customers FOR UPDATE 
TO anon 
USING (true);

DROP POLICY IF EXISTS "Herkes veri silebilsin" ON customers;
CREATE POLICY "Herkes veri silebilsin" 
ON customers FOR DELETE 
TO anon 
USING (true);
