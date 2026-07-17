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
CREATE POLICY "Sadece giris yapanlar okuyabilsin" ON customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes veri ekleyebilsin" ON customers;
CREATE POLICY "Sadece giris yapanlar ekleyebilsin" ON customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes veri güncelleyebilsin" ON customers;
CREATE POLICY "Sadece giris yapanlar güncelleyebilsin" ON customers FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes veri silebilsin" ON customers;
CREATE POLICY "Sadece giris yapanlar silebilsin" ON customers FOR DELETE TO authenticated USING (true);


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
CREATE POLICY "Sadece giris yapanlar siparis okuyabilsin" ON orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes siparis ekleyebilsin" ON orders;
CREATE POLICY "Sadece giris yapanlar siparis ekleyebilsin" ON orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes siparis güncelleyebilsin" ON orders;
CREATE POLICY "Sadece giris yapanlar siparis güncelleyebilsin" ON orders FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes siparis silebilsin" ON orders;
CREATE POLICY "Sadece giris yapanlar siparis silebilsin" ON orders FOR DELETE TO authenticated USING (true);


-- 3. Görüşme Notları (Meeting Logs) Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS meeting_logs (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL,
    recall_date DATE,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Politikalarını Etkinleştir
ALTER TABLE meeting_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes not okuyabilsin" ON meeting_logs;
CREATE POLICY "Sadece giris yapanlar not okuyabilsin" ON meeting_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes not ekleyebilsin" ON meeting_logs;
CREATE POLICY "Sadece giris yapanlar not ekleyebilsin" ON meeting_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes not güncelleyebilsin" ON meeting_logs;
CREATE POLICY "Sadece giris yapanlar not güncelleyebilsin" ON meeting_logs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes not silebilsin" ON meeting_logs;
CREATE POLICY "Sadece giris yapanlar not silebilsin" ON meeting_logs FOR DELETE TO authenticated USING (true);


-- 4. Geri Dönüşüm Kutusu (Trash Items) Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS trash_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    original_id TEXT NOT NULL,
    item_data JSONB NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Politikalarını Etkinleştir
ALTER TABLE trash_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes cop okuyabilsin" ON trash_items;
CREATE POLICY "Sadece giris yapanlar cop okuyabilsin" ON trash_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes cop ekleyebilsin" ON trash_items;
CREATE POLICY "Sadece giris yapanlar cop ekleyebilsin" ON trash_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Herkes cop güncelleyebilsin" ON trash_items;
CREATE POLICY "Sadece giris yapanlar cop güncelleyebilsin" ON trash_items FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Herkes cop silebilsin" ON trash_items;
CREATE POLICY "Sadece giris yapanlar cop silebilsin" ON trash_items FOR DELETE TO authenticated USING (true);
