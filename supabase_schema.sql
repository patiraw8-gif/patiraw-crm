-- ========================================================
-- PATI RAW CRM - SUPABASE SQL SCHEMA (v3.0)
-- ========================================================
-- Bu kodu Supabase projenizin SQL Editor kısmına yapıştırıp 
-- RUN butonuna basarak veritabanınızı güncelleyebilirsiniz.
-- ========================================================

-- 1. Müşteriler Tablosunu Oluştur / Güncelle
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

-- Yeni sütunları ekle (Zaten ekliyse hata vermez)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contact_note TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT;

-- Performans İndeksleri
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- RLS Politikalarını Etkinleştir
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes veri okuyabilsin" ON customers;
CREATE POLICY "Herkes veri okuyabilsin" ON customers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Herkes veri ekleyebilsin" ON customers;
CREATE POLICY "Herkes veri ekleyebilsin" ON customers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes veri güncelleyebilsin" ON customers;
CREATE POLICY "Herkes veri güncelleyebilsin" ON customers FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "Herkes veri silebilsin" ON customers;
CREATE POLICY "Herkes veri silebilsin" ON customers FOR DELETE TO anon USING (true);


-- 2. Siparişler (Orders) Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Ödendi',
    order_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Siparişler RLS Politikalarını Etkinleştir
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes siparis okuyabilsin" ON orders;
CREATE POLICY "Herkes siparis okuyabilsin" ON orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Herkes siparis ekleyebilsin" ON orders;
CREATE POLICY "Herkes siparis ekleyebilsin" ON orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes siparis güncelleyebilsin" ON orders;
CREATE POLICY "Herkes siparis güncelleyebilsin" ON orders FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "Herkes siparis silebilsin" ON orders;
CREATE POLICY "Herkes siparis silebilsin" ON orders FOR DELETE TO anon USING (true);
