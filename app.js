/* ==========================================
   PATI RAW CRM - APPLICATION LOGIC (v2.1.0)
   Login, Auth, Quick Actions & Full Supabase Sync
   ========================================== */

// 1. Initial Default Seed Data
const defaultCustomers = [
    { id: "1", businessName: "İzmir K9 Eğitim Merkezi", contactPerson: "Emre Yıldız", phone: "0532 123 45 67", city: "İzmir", lastContactDate: "2025-05-15", monthlyConsumption: 120, sampleGiven: true, recallDate: "2025-05-25", status: "Aktif", lastContactNote: "Numune teslim edildi, 1 hafta deneme süreci başladı." },
    { id: "2", businessName: "Ege Köpek Çiftliği", contactPerson: "Murat Aksoy", phone: "0541 987 65 43", city: "Manisa", lastContactDate: "2025-05-14", monthlyConsumption: 150, sampleGiven: true, recallDate: "2025-05-22", status: "Beklemede", lastContactNote: "Fiyat teklifi gönderildi, cevap bekleniyor." },
    { id: "3", businessName: "Patili Pansiyon", contactPerson: "Ayşe Demir", phone: "0530 555 21 21", city: "İzmir", lastContactDate: "2025-05-10", monthlyConsumption: 80, sampleGiven: false, recallDate: "2025-05-20", status: "Aktif", lastContactNote: "" },
    { id: "4", businessName: "Mutlu Patiler Veteriner Kliniği", contactPerson: "Dr. Can Arslan", phone: "0533 777 88 99", city: "Aydın", lastContactDate: "2025-05-12", monthlyConsumption: 60, sampleGiven: true, recallDate: "2025-05-26", status: "Beklemede", lastContactNote: "Klinikte kullanılan mevcut markadan memnun, kararsız." },
    { id: "5", businessName: "Can Dostlar Pet Shop", contactPerson: "Seda Kılıç", phone: "0542 112 22 33", city: "Muğla", lastContactDate: "2025-05-08", monthlyConsumption: 100, sampleGiven: false, recallDate: "2025-05-18", status: "Olumsuz", lastContactNote: "Kendi tedarikçileriyle devam edeceklerini belirtti." },
    { id: "6", businessName: "Elite K9 Çiftliği", contactPerson: "Cenk Kara", phone: "0531 444 55 66", city: "Denizli", lastContactDate: "2025-05-16", monthlyConsumption: 200, sampleGiven: true, recallDate: "2025-05-30", status: "Aktif", lastContactNote: "Aylık sipariş planlaması yapıldı, düzenli teslimat başlayacak." }
];

// 2. Application State
let customers = [];
let deleteTargetId = null;
let currentSort = { key: null, direction: 'asc' };
let currentRecallFilter = 'all';

// Chart.js Instances
let cityChartInstance = null;
let statusChartInstance = null;

// Supabase State
let supabaseUrl = "";
let supabaseKey = "";
let supabaseClient = null;
let isSupabaseActive = false;

// Default local credentials
const LOCAL_ADMIN_USER = "admin";
const LOCAL_ADMIN_PASS = "patiraw2026";

// 3. DOM Elements
const tableBody = document.getElementById("table-body");
const searchInput = document.getElementById("search-input");
const filterCity = document.getElementById("filter-city");
const filterStatus = document.getElementById("filter-status");
const noDataMsg = document.getElementById("no-data-msg");
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");
const statTotal = document.getElementById("stat-total-customers");
const statActive = document.getElementById("stat-active-customers");
const statPending = document.getElementById("stat-pending-customers");
const statConsumption = document.getElementById("stat-total-consumption");
const customerModal = document.getElementById("customer-modal");
const confirmModal = document.getElementById("confirm-modal");
const customerForm = document.getElementById("customer-form");
const modalTitle = document.getElementById("modal-title");
const connectionStatusBanner = document.getElementById("connection-status-banner");
const connectionStatusText = document.getElementById("connection-status-text");
const toast = document.getElementById("toast-notification");
const benefitModal = document.getElementById("benefit-info-modal");
const settingsForm = document.getElementById("settings-form");
const btnAddCustomer = document.getElementById("btn-add-customer");
const btnTestConnection = document.getElementById("btn-test-connection");
const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
const btnConfirmDelete = document.getElementById("btn-confirm-delete");
const btnExport = document.getElementById("btn-export");
const btnClearAll = document.getElementById("btn-clear-all");

// Login Elements
const loginOverlay = document.getElementById("login-overlay");
const loginForm = document.getElementById("login-form");
const loginFooterText = document.getElementById("login-footer-text");

// Quick Meeting Modal Elements
const quickMeetingModal = document.getElementById("quick-meeting-modal");
const quickMeetingForm = document.getElementById("quick-meeting-form");

// Tab title mapping
const tabHeaderDetails = {
    "tab-dashboard": { title: "Kontrol Paneli", subtitle: "Pati Raw CRM ile işletme süreçlerinizi anlık olarak yönetin." },
    "tab-customers": { title: "Müşteri Listesi", subtitle: "Tüm müşteri kayıtlarını listeleyin, arayın ve düzenleyin." },
    "tab-timeline": { title: "Görüşme Geçmişi", subtitle: "Müşterilerinizle yapılan son görüşme notları ve tarihleri." },
    "tab-samples": { title: "Numune Takibi", subtitle: "Verilen numuneler ve tüketim potansiyelleri analizi." },
    "tab-planner": { title: "Arama Planlayıcı", subtitle: "Geri arama tarihleri planlanmış ve gecikmiş müşteriler." },
    "tab-funnel": { title: "Satış Hunisi", subtitle: "Müşteri dönüşüm oranları analizi." },
    "tab-admin": { title: "Yönetici Paneli", subtitle: "Kullanıcı hesap bilgilerini, veri yedekleme süreçlerini ve sistem loglarını yönetin." },
    "tab-settings": { title: "Bağlantı Ayarları", subtitle: "Supabase bulut veritabanı entegrasyon ayarları." }
};

// ==========================================
// 4. AUTHENTICATION / LOGIN SYSTEM
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    checkLoginState();
});

function checkLoginState() {
    const isLoggedIn = sessionStorage.getItem("pati_raw_logged_in");
    if (isLoggedIn === "true") {
        hideLogin();
        initApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginOverlay.classList.remove("hide");
    // Update footer text based on config
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
        loginFooterText.textContent = "Supabase bağlantısı aktif. Yetkili kullanıcı giriş bilgilerinizi kullanarak oturum açabilirsiniz.";
    }
}

function hideLogin() {
    loginOverlay.classList.add("hide");
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();

        // Try Supabase Auth first if available
        if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
            try {
                const tempClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
                const { data, error } = await tempClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (!error && data.user) {
                    sessionStorage.setItem("pati_raw_logged_in", "true");
                    sessionStorage.setItem("pati_raw_user", email);
                    hideLogin();
                    initApp();
                    showToast("Hoş geldiniz! Supabase ile giriş başarılı.");
                    return;
                }
            } catch (err) {
                console.log("Supabase auth failed, trying local credentials:", err);
            }
        }

        // Fallback to local credentials
        const localUser = localStorage.getItem("pati_raw_local_user") || LOCAL_ADMIN_USER;
        const localPass = localStorage.getItem("pati_raw_local_pass") || LOCAL_ADMIN_PASS;
        if ((email === localUser || email === "admin@patiraw.com" || email === "admin") && password === localPass) {
            sessionStorage.setItem("pati_raw_logged_in", "true");
            sessionStorage.setItem("pati_raw_user", email);
            hideLogin();
            initApp();
            showToast("Hoş geldiniz! Yerel yönetici girişi başarılı.");
        } else {
            showToast("Kullanıcı adı veya şifre yanlış!", "error");
        }
    });
}

// Logout
const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
        e.preventDefault();
        sessionStorage.removeItem("pati_raw_logged_in");
        sessionStorage.removeItem("pati_raw_user");
        showLogin();
        showToast("Güvenli çıkış yapıldı.");
    });
}

// ==========================================
// 5. MAIN APP INITIALIZATION (after login)
// ==========================================
async function initApp() {
    loadSettings();
    await initSupabase();
    await fetchAllData();
    setupEventListeners();
    setupTabNavigation();
    if (typeof addLog === 'function') {
        const username = sessionStorage.getItem("pati_raw_user") || "admin";
        addLog(`Sistem oturumu açıldı. Aktif Kullanıcı: ${username}`);
    }
}

// Load settings from config.js or LocalStorage
function loadSettings() {
    if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
        supabaseUrl = SUPABASE_CONFIG.url;
        supabaseKey = SUPABASE_CONFIG.key;
    } else {
        supabaseUrl = localStorage.getItem("pati_raw_supabase_url") || "";
        supabaseKey = localStorage.getItem("pati_raw_supabase_key") || "";
    }
    document.getElementById("settings-url").value = supabaseUrl;
    document.getElementById("settings-key").value = supabaseKey;
}

// Initialize Supabase Client
async function initSupabase() {
    if (supabaseUrl && supabaseKey) {
        try {
            if (typeof supabase !== 'undefined') {
                supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                isSupabaseActive = true;
                connectionStatusBanner.className = "status-banner connected";
                connectionStatusText.innerHTML = '<i class="fa-solid fa-cloud-check banner-icon"></i> Supabase Bulut Veritabanı Aktif!';
            } else {
                throw new Error("Supabase kütüphanesi yüklenemedi.");
            }
        } catch (error) {
            console.error("Supabase connection error: ", error);
            isSupabaseActive = false;
            setBannerLocalState();
        }
    } else {
        isSupabaseActive = false;
        setBannerLocalState();
    }
}

function setBannerLocalState() {
    connectionStatusBanner.className = "status-banner local";
    connectionStatusText.innerHTML = '<i class="fa-solid fa-database banner-icon"></i> Veriler LocalStorage üzerinde saklanıyor.';
}

// Fetch all customers
async function fetchAllData() {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from("customers").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            customers = data.map(dbCust => ({
                id: dbCust.id,
                businessName: dbCust.business_name,
                contactPerson: dbCust.contact_person,
                phone: dbCust.phone,
                city: dbCust.city,
                lastContactDate: dbCust.last_contact_date,
                monthlyConsumption: Number(dbCust.monthly_consumption) || 0,
                sampleGiven: dbCust.sample_given,
                recallDate: dbCust.recall_date,
                status: dbCust.status,
                lastContactNote: dbCust.last_contact_note || ""
            }));
        } catch (error) {
            console.error("Supabase fetch failed:", error);
            showToast("Supabase bağlantı hatası! Yerel hafızaya dönüldü.", "error");
            loadLocalData();
        }
    } else {
        loadLocalData();
    }
    populateCityFilter();
    renderTable();
    updateStats();
    refreshAllDashboardPanels();
    if (typeof addLog === 'function') {
        addLog(`Veritabanı yüklendi. Toplam ${customers.length} müşteri kaydı listeleniyor.`);
    }
}

function loadLocalData() {
    const saved = localStorage.getItem("pati_raw_crm_customers");
    if (saved) {
        try { customers = JSON.parse(saved); } catch (e) { customers = [...defaultCustomers]; saveLocalData(); }
    } else {
        customers = [...defaultCustomers];
        saveLocalData();
    }
}

function saveLocalData() {
    localStorage.setItem("pati_raw_crm_customers", JSON.stringify(customers));
}

// ==========================================
// 6. TAB NAVIGATION
// ==========================================
function setupTabNavigation() {
    document.querySelectorAll(".menu-item:not(.logout-btn)").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(tp => tp.classList.remove("active"));
            item.classList.add("active");
            const targetTabId = item.getAttribute("data-tab");
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) targetPane.classList.add("active");
            if (tabHeaderDetails[targetTabId]) {
                pageTitle.textContent = tabHeaderDetails[targetTabId].title;
                pageSubtitle.textContent = tabHeaderDetails[targetTabId].subtitle;
            }
            if (targetTabId === 'tab-dashboard') updateCharts();
            else if (targetTabId === 'tab-timeline') buildMeetingsTimeline();
            else if (targetTabId === 'tab-samples') buildSamplesDashboard();
            else if (targetTabId === 'tab-planner') filterRecallList(currentRecallFilter);
            else if (targetTabId === 'tab-funnel') buildConversionFunnel();
            else if (targetTabId === 'tab-admin') renderAdminPanel();
        });
    });
}

// ==========================================
// 7. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    searchInput.addEventListener("input", filterAndRender);
    filterCity.addEventListener("change", filterAndRender);
    filterStatus.addEventListener("change", filterAndRender);
    btnAddCustomer.addEventListener("click", () => openCustomerModal());
    if (btnClearAll) btnClearAll.addEventListener("click", handleClearAllData);
    customerForm.addEventListener("submit", handleFormSubmit);
    if (settingsForm) settingsForm.addEventListener("submit", handleSettingsSubmit);
    if (btnTestConnection) btnTestConnection.addEventListener("click", testSupabaseConnection);
    btnConfirmCancel.addEventListener("click", () => confirmModal.classList.remove("open"));
    btnConfirmDelete.addEventListener("click", deleteCustomer);
    window.addEventListener("click", (e) => {
        if (e.target === customerModal) closeCustomerModal();
        if (e.target === confirmModal) confirmModal.classList.remove("open");
        if (e.target === benefitModal) benefitModal.classList.remove("open");
        if (e.target === quickMeetingModal) closeQuickMeetingModal();
    });
    btnExport.addEventListener("click", exportToCSV);
    document.querySelectorAll(".customer-table th[data-sort]").forEach(th => {
        th.addEventListener("click", () => handleSort(th.getAttribute("data-sort")));
    });

    // Quick Meeting Modal
    const btnAddMeeting = document.getElementById("btn-add-meeting");
    if (btnAddMeeting) btnAddMeeting.addEventListener("click", openQuickMeetingModal);
    if (quickMeetingForm) quickMeetingForm.addEventListener("submit", handleQuickMeetingSubmit);

    // Numune Dağıtımı Butonu (Müşteri formunu açar)
    const btnAddSample = document.getElementById("btn-add-sample-delivery");
    if (btnAddSample) btnAddSample.addEventListener("click", () => openCustomerModal());

    // Arama Planlayıcı Butonu (Müşteri formunu açar)
    const btnAddPlanner = document.getElementById("btn-add-planner-call");
    if (btnAddPlanner) btnAddPlanner.addEventListener("click", openQuickMeetingModal);

    // Admin Panel Event Listeners
    const adminCredsForm = document.getElementById("admin-credentials-form");
    if (adminCredsForm) adminCredsForm.addEventListener("submit", handleAdminCredentialsSubmit);

    const btnBackupJson = document.getElementById("btn-backup-json");
    if (btnBackupJson) btnBackupJson.addEventListener("click", backupDataToJson);

    const btnRestoreJson = document.getElementById("btn-restore-json");
    const inputRestoreJson = document.getElementById("input-restore-json");
    if (btnRestoreJson && inputRestoreJson) {
        btnRestoreJson.addEventListener("click", () => inputRestoreJson.click());
        inputRestoreJson.addEventListener("change", restoreDataFromJson);
    }

    const btnResetDefaults = document.getElementById("btn-reset-defaults");
    if (btnResetDefaults) btnResetDefaults.addEventListener("click", handleResetDefaults);
}

// ==========================================
// 8. UTILITY FUNCTIONS
// ==========================================
function formatDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function normalizeTurkish(str) {
    if (!str) return "";
    return str.toString().replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş").replace(/Ğ/g, "ğ").replace(/Ç/g, "ç").replace(/Ö/g, "ö").replace(/Ü/g, "ü").toLowerCase();
}

function showToast(message, type = "success") {
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMsg = toast.querySelector(".toast-message");
    toastMsg.textContent = message;
    if (type === "error") { toast.classList.add("error"); toastIcon.className = "fa-solid fa-circle-xmark toast-icon"; }
    else { toast.classList.remove("error"); toastIcon.className = "fa-solid fa-circle-check toast-icon"; }
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function populateCityFilter() {
    const prev = filterCity.value;
    const cities = [...new Set(customers.map(c => c.city.trim()))].filter(c => c.length > 0).sort((a, b) => a.localeCompare(b, 'tr'));
    filterCity.innerHTML = '<option value="">Tüm Şehirler</option>';
    cities.forEach(city => { const o = document.createElement("option"); o.value = city; o.textContent = city; filterCity.appendChild(o); });
    if (cities.includes(prev)) filterCity.value = prev;
}

// ==========================================
// 9. TABLE RENDERING, FILTERING & SORTING
// ==========================================
function getFilteredCustomers() {
    const searchVal = normalizeTurkish(searchInput.value);
    const cityVal = filterCity.value;
    const statusVal = filterStatus.value;
    let result = customers.filter(c => {
        const matchesSearch = normalizeTurkish(c.businessName).includes(searchVal) || normalizeTurkish(c.contactPerson).includes(searchVal) || c.phone.includes(searchVal);
        return matchesSearch && (cityVal === "" || c.city === cityVal) && (statusVal === "" || c.status === statusVal);
    });
    if (currentSort.key) {
        result.sort((a, b) => {
            let valA = a[currentSort.key] ?? ""; let valB = b[currentSort.key] ?? "";
            if (currentSort.key === "monthlyConsumption") return currentSort.direction === 'asc' ? valA - valB : valB - valA;
            const cmp = valA.toString().localeCompare(valB.toString(), 'tr', { sensitivity: 'base' });
            return currentSort.direction === 'asc' ? cmp : -cmp;
        });
    }
    return result;
}

function renderTable() {
    const filtered = getFilteredCustomers();
    tableBody.innerHTML = "";
    const mobileContainer = document.getElementById("mobile-cards-container");
    if (mobileContainer) mobileContainer.innerHTML = "";
    if (filtered.length === 0) { noDataMsg.style.display = "block"; return; } else { noDataMsg.style.display = "none"; }
    filtered.forEach(c => {
        const row = document.createElement("tr");
        const sampleIcon = c.sampleGiven ? '<span class="sample-icon yes"><i class="fa-solid fa-circle-check"></i> Evet</span>' : '<span class="sample-icon no"><i class="fa-solid fa-circle-xmark"></i> Hayır</span>';
        const statusClass = c.status.toLowerCase();
        row.innerHTML = `
            <td style="font-weight: 700;">${c.businessName}</td>
            <td>${c.contactPerson}</td>
            <td>${c.phone}</td>
            <td>${c.city}</td>
            <td>${formatDate(c.lastContactDate)}</td>
            <td class="text-right" style="font-weight: 600;">${c.monthlyConsumption || 0}</td>
            <td class="text-center">${sampleIcon}</td>
            <td>${formatDate(c.recallDate)}</td>
            <td class="text-center"><span class="status-badge ${statusClass}">${c.status}</span></td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editCustomerClick('${c.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete" onclick="deleteCustomerClick('${c.id}')" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>`;
        tableBody.appendChild(row);
        if (mobileContainer) {
            const card = document.createElement("div");
            card.className = "customer-mobile-card";
            card.innerHTML = `
                <div class="mobile-card-header"><div class="mobile-card-title">${c.businessName}</div><span class="status-badge ${statusClass}">${c.status}</span></div>
                <div class="mobile-card-body">
                    <div class="mobile-field"><span class="mobile-field-label">Yetkili</span><span class="mobile-field-value">${c.contactPerson}</span></div>
                    <div class="mobile-field"><span class="mobile-field-label">Telefon</span><span class="mobile-field-value">${c.phone}</span></div>
                    <div class="mobile-field"><span class="mobile-field-label">Şehir</span><span class="mobile-field-value">${c.city}</span></div>
                    <div class="mobile-field"><span class="mobile-field-label">Tüketim</span><span class="mobile-field-value">${c.monthlyConsumption || 0} kg</span></div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-secondary" onclick="editCustomerClick('${c.id}')"><i class="fa-solid fa-pen-to-square"></i> Düzenle</button>
                    <button class="btn btn-danger" onclick="deleteCustomerClick('${c.id}')" style="background-color:#fee2e2;color:var(--status-negative-bg);"><i class="fa-solid fa-trash-can"></i> Sil</button>
                </div>`;
            mobileContainer.appendChild(card);
        }
    });
}

function filterAndRender() { renderTable(); updateStats(); }

function handleSort(key) {
    if (currentSort.key === key) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else { currentSort.key = key; currentSort.direction = 'asc'; }
    document.querySelectorAll(".customer-table th").forEach(th => { const i = th.querySelector("i"); if (i) i.className = "fa-solid fa-sort"; });
    const activeHeader = document.querySelector(`.customer-table th[data-sort="${key}"]`);
    if (activeHeader) { const i = activeHeader.querySelector("i"); if (i) i.className = currentSort.direction === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down"; }
    renderTable();
}

function updateStats() {
    const total = customers.length;
    statTotal.textContent = total;
    statActive.textContent = customers.filter(c => c.status === "Aktif").length;
    statPending.textContent = customers.filter(c => c.status === "Beklemede").length;
    const totalCons = customers.reduce((sum, c) => sum + (Number(c.monthlyConsumption) || 0), 0);
    statConsumption.textContent = `${totalCons.toLocaleString('tr-TR')} kg`;
}

function refreshAllDashboardPanels() { updateCharts(); buildMeetingsTimeline(); buildSamplesDashboard(); filterRecallList(currentRecallFilter); buildConversionFunnel(); }

// ==========================================
// 10. CUSTOMER CRUD MODALS
// ==========================================
function openCustomerModal(customer = null) {
    customerForm.reset();
    document.getElementById("customer-id").value = "";
    document.getElementById("input-last-note").value = "";
    if (customer) {
        modalTitle.textContent = "Müşteri Kaydını Düzenle";
        document.getElementById("customer-id").value = customer.id;
        document.getElementById("input-business-name").value = customer.businessName;
        document.getElementById("input-contact-person").value = customer.contactPerson;
        document.getElementById("input-phone").value = customer.phone;
        document.getElementById("input-city").value = customer.city;
        document.getElementById("input-last-contact").value = customer.lastContactDate || "";
        document.getElementById("input-consumption").value = customer.monthlyConsumption || "";
        document.getElementById("input-recall-date").value = customer.recallDate || "";
        document.getElementById("input-status").value = customer.status;
        document.getElementById("input-sample-given").checked = customer.sampleGiven;
        document.getElementById("input-last-note").value = customer.lastContactNote || "";
    } else {
        modalTitle.textContent = "Yeni Müşteri Kaydı";
        document.getElementById("input-status").value = "Aktif";
    }
    customerModal.classList.add("open");
}

function closeCustomerModal() { customerModal.classList.remove("open"); }

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("customer-id").value;
    const dataObj = {
        businessName: document.getElementById("input-business-name").value.trim(),
        contactPerson: document.getElementById("input-contact-person").value.trim(),
        phone: document.getElementById("input-phone").value.trim(),
        city: document.getElementById("input-city").value.trim(),
        lastContactDate: document.getElementById("input-last-contact").value || null,
        monthlyConsumption: parseInt(document.getElementById("input-consumption").value) || 0,
        recallDate: document.getElementById("input-recall-date").value || null,
        status: document.getElementById("input-status").value,
        sampleGiven: document.getElementById("input-sample-given").checked,
        lastContactNote: document.getElementById("input-last-note").value.trim()
    };

    if (isSupabaseActive && supabaseClient) {
        try {
            const dbData = { business_name: dataObj.businessName, contact_person: dataObj.contactPerson, phone: dataObj.phone, city: dataObj.city, last_contact_date: dataObj.lastContactDate, monthly_consumption: dataObj.monthlyConsumption, recall_date: dataObj.recallDate, status: dataObj.status, sample_given: dataObj.sampleGiven, last_contact_note: dataObj.lastContactNote };
            if (id) {
                const { error } = await supabaseClient.from("customers").update(dbData).eq("id", id);
                if (error) throw error;
                showToast("Kayıt başarıyla güncellendi.");
            } else {
                const { error } = await supabaseClient.from("customers").insert({ id: Date.now().toString(), ...dbData });
                if (error) throw error;
                showToast("Yeni kayıt başarıyla eklendi.");
            }
            await fetchAllData();
        } catch (error) { console.error("Save Error:", error); showToast("Kayıt edilemedi!", "error"); }
    } else {
        if (id) { const idx = customers.findIndex(c => c.id === id); if (idx !== -1) { customers[idx] = { id, ...dataObj }; showToast("Kayıt güncellendi."); } }
        else { customers.push({ id: Date.now().toString(), ...dataObj }); showToast("Yeni kayıt eklendi."); }
        saveLocalData(); populateCityFilter(); renderTable(); updateStats(); refreshAllDashboardPanels();
    }
    closeCustomerModal();
}

window.editCustomerClick = function(id) { const c = customers.find(c => c.id === id); if (c) openCustomerModal(c); };
window.deleteCustomerClick = function(id) { deleteTargetId = id; confirmModal.classList.add("open"); };

async function deleteCustomer() {
    if (deleteTargetId) {
        if (isSupabaseActive && supabaseClient) {
            try { const { error } = await supabaseClient.from("customers").delete().eq("id", deleteTargetId); if (error) throw error; showToast("Kayıt silindi.", "error"); await fetchAllData(); }
            catch (error) { showToast("Silme başarısız!", "error"); }
        } else { customers = customers.filter(c => c.id !== deleteTargetId); saveLocalData(); populateCityFilter(); renderTable(); updateStats(); refreshAllDashboardPanels(); showToast("Kayıt silindi.", "error"); }
        deleteTargetId = null;
    }
    confirmModal.classList.remove("open");
}

// ==========================================
// 11. QUICK MEETING MODAL (Görüşme Notu)
// ==========================================
function openQuickMeetingModal() {
    const select = document.getElementById("meeting-customer-id");
    select.innerHTML = '<option value="">Müşteri seçiniz...</option>';
    customers.forEach(c => { const o = document.createElement("option"); o.value = c.id; o.textContent = `${c.businessName} (${c.contactPerson})`; select.appendChild(o); });
    document.getElementById("meeting-date").value = new Date().toISOString().slice(0, 10);
    document.getElementById("meeting-recall-date").value = "";
    document.getElementById("meeting-note").value = "";
    quickMeetingModal.classList.add("open");
}

window.closeQuickMeetingModal = function() { quickMeetingModal.classList.remove("open"); };

async function handleQuickMeetingSubmit(e) {
    e.preventDefault();
    const custId = document.getElementById("meeting-customer-id").value;
    const meetingDate = document.getElementById("meeting-date").value;
    const recallDate = document.getElementById("meeting-recall-date").value || null;
    const note = document.getElementById("meeting-note").value.trim();
    if (!custId) { showToast("Lütfen bir müşteri seçin.", "error"); return; }

    if (isSupabaseActive && supabaseClient) {
        try {
            const updateData = { last_contact_date: meetingDate, last_contact_note: note };
            if (recallDate) updateData.recall_date = recallDate;
            const { error } = await supabaseClient.from("customers").update(updateData).eq("id", custId);
            if (error) throw error;
            showToast("Görüşme notu kaydedildi.");
            await fetchAllData();
        } catch (error) { console.error("Meeting save error:", error); showToast("Not kaydedilemedi!", "error"); }
    } else {
        const idx = customers.findIndex(c => c.id === custId);
        if (idx !== -1) {
            customers[idx].lastContactDate = meetingDate;
            customers[idx].lastContactNote = note;
            if (recallDate) customers[idx].recallDate = recallDate;
            saveLocalData(); renderTable(); updateStats(); refreshAllDashboardPanels();
            showToast("Görüşme notu kaydedildi.");
        }
    }
    closeQuickMeetingModal();
}

// ==========================================
// 12. QUICK SAMPLE TOGGLE (Numune Durumu Değiştirme)
// ==========================================
window.quickToggleSample = async function(id, newState) {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { error } = await supabaseClient.from("customers").update({ sample_given: newState }).eq("id", id);
            if (error) throw error;
            showToast(newState ? "Numune teslim edildi olarak güncellendi." : "Numune durumu geri alındı.");
            await fetchAllData();
        } catch (error) { showToast("Güncelleme başarısız!", "error"); }
    } else {
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) { customers[idx].sampleGiven = newState; saveLocalData(); renderTable(); updateStats(); refreshAllDashboardPanels(); showToast(newState ? "Numune teslim edildi." : "Numune geri alındı."); }
    }
};

// ==========================================
// 13. QUICK CALL DONE (Arama Tamamlandı)
// ==========================================
window.quickCallDone = async function(id) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (isSupabaseActive && supabaseClient) {
        try {
            const { error } = await supabaseClient.from("customers").update({ last_contact_date: todayStr, recall_date: null, last_contact_note: "Planlı geri arama yapıldı." }).eq("id", id);
            if (error) throw error;
            showToast("Arama tamamlandı olarak kaydedildi.");
            await fetchAllData();
        } catch (error) { showToast("İşlem başarısız!", "error"); }
    } else {
        const idx = customers.findIndex(c => c.id === id);
        if (idx !== -1) { customers[idx].lastContactDate = todayStr; customers[idx].recallDate = null; customers[idx].lastContactNote = "Planlı geri arama yapıldı."; saveLocalData(); renderTable(); updateStats(); refreshAllDashboardPanels(); showToast("Arama tamamlandı."); }
    }
};

// ==========================================
// 14. SETTINGS & SUPABASE CONNECTION
// ==========================================
async function testSupabaseConnection() {
    const url = document.getElementById("settings-url").value.trim();
    const key = document.getElementById("settings-key").value.trim();
    if (!url || !key) { showToast("URL ve Key bilgilerini girin.", "error"); return; }
    btnTestConnection.disabled = true; btnTestConnection.textContent = "Test ediliyor...";
    try { const tc = supabase.createClient(url, key); const { error } = await tc.from("customers").select("id").limit(1); if (error) throw error; showToast("Bağlantı başarılı!"); }
    catch (error) { showToast("Bağlantı başarısız!", "error"); }
    finally { btnTestConnection.disabled = false; btnTestConnection.textContent = "Bağlantıyı Test Et"; }
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const url = document.getElementById("settings-url").value.trim();
    const key = document.getElementById("settings-key").value.trim();
    localStorage.setItem("pati_raw_supabase_url", url);
    localStorage.setItem("pati_raw_supabase_key", key);
    supabaseUrl = url; supabaseKey = key;
    showToast("Ayarlar kaydedildi, bağlanılıyor...");
    await initSupabase(); await fetchAllData();
}

async function handleClearAllData() {
    if (!confirm("TÜM verileri silmek istediğinize emin misiniz?")) return;
    if (isSupabaseActive && supabaseClient) {
        try { const { error } = await supabaseClient.from("customers").delete().neq("id", "0"); if (error) throw error; showToast("Tüm veriler silindi.", "error"); }
        catch (error) { showToast("Silme başarısız!", "error"); return; }
    } else { customers = []; saveLocalData(); showToast("Tüm veriler silindi.", "error"); }
    await fetchAllData();
}

// ==========================================
// 15. CHART.JS LIVE GRAPHICS
// ==========================================
function updateCharts() {
    if (customers.length === 0) return;
    const cityData = {}; customers.forEach(c => { const city = c.city || "Bilinmiyor"; cityData[city] = (cityData[city] || 0) + (Number(c.monthlyConsumption) || 0); });
    const statusData = { "Aktif": 0, "Beklemede": 0, "Olumsuz": 0 }; customers.forEach(c => { if (statusData[c.status] !== undefined) statusData[c.status]++; });

    const ctxCity = document.getElementById('cityChart');
    if (ctxCity) {
        if (cityChartInstance) cityChartInstance.destroy();
        cityChartInstance = new Chart(ctxCity, { type: 'bar', data: { labels: Object.keys(cityData), datasets: [{ label: 'Tüketim (KG)', data: Object.values(cityData), backgroundColor: 'rgba(255, 106, 0, 0.75)', borderColor: 'rgba(255, 106, 0, 1)', borderWidth: 1.5, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } } });
    }
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(ctxStatus, { type: 'doughnut', data: { labels: Object.keys(statusData), datasets: [{ data: Object.values(statusData), backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } } }, cutout: '65%' } });
    }
}

// ==========================================
// 16. TIMELINE (Görüşme Geçmişi)
// ==========================================
function buildMeetingsTimeline() {
    const el = document.getElementById("meetings-timeline");
    if (!el) return;
    el.innerHTML = "";
    const visited = customers.filter(c => c.lastContactDate).sort((a, b) => b.lastContactDate.localeCompare(a.lastContactDate));
    if (visited.length === 0) { el.innerHTML = "<div class='no-data'><i class='fa-solid fa-calendar-xmark'></i><p>Görüşme kaydı bulunmuyor. Yukarıdaki butonu kullanarak yeni bir görüşme notu ekleyin.</p></div>"; return; }
    visited.forEach(c => {
        const item = document.createElement("div");
        item.className = `timeline-item ${c.status.toLowerCase()}-item`;
        const noteHtml = c.lastContactNote ? `<div style="margin-top:6px; padding:8px 12px; background-color:#fff; border:1px dashed var(--border-color); border-radius:var(--radius-sm); font-size:12.5px; color:var(--dark-slate); line-height:1.4;"><i class="fa-solid fa-quote-left" style="color:var(--primary);margin-right:6px;font-size:10px;"></i>${c.lastContactNote}</div>` : '';
        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-header"><span><i class="fa-regular fa-clock"></i> ${formatDate(c.lastContactDate)}</span><span style="font-weight:700;">${c.city}</span></div>
                <div class="timeline-title">${c.businessName}</div>
                <div class="timeline-desc"><strong>Yetkili:</strong> ${c.contactPerson} (${c.phone}) <br/><strong>Durum:</strong> ${c.status} (${c.monthlyConsumption} kg/Ay)</div>
                ${noteHtml}
            </div>`;
        el.appendChild(item);
    });
}

// ==========================================
// 17. SAMPLES (Numune Takibi)
// ==========================================
function buildSamplesDashboard() {
    const sampleGiven = customers.filter(c => c.sampleGiven).length;
    const total = customers.length;
    const waitCons = customers.filter(c => !c.sampleGiven && c.status !== "Olumsuz").reduce((s, c) => s + (Number(c.monthlyConsumption) || 0), 0);
    const actCons = customers.filter(c => c.sampleGiven && c.status === "Aktif").reduce((s, c) => s + (Number(c.monthlyConsumption) || 0), 0);
    const elG = document.getElementById("sample-stat-given"); if (elG) elG.textContent = `${sampleGiven} / ${total}`;
    const elW = document.getElementById("sample-stat-waiting"); if (elW) elW.textContent = `${waitCons.toLocaleString('tr-TR')} kg`;
    const elA = document.getElementById("sample-stat-active"); if (elA) elA.textContent = `${actCons.toLocaleString('tr-TR')} kg`;
    const tbody = document.getElementById("sample-table-body"); if (!tbody) return;
    tbody.innerHTML = "";
    if (customers.length === 0) { tbody.innerHTML = "<tr><td colspan='5' class='text-center' style='padding:20px;'>Kayıt yok.</td></tr>"; return; }
    customers.forEach(c => {
        const row = document.createElement("tr");
        const badgeClass = c.sampleGiven ? "yes" : "no";
        const badgeLabel = c.sampleGiven ? "Teslim Edildi" : "Verilmedi";
        const icon = c.sampleGiven ? "fa-circle-check" : "fa-circle-xmark";
        const actionBtn = c.sampleGiven
            ? `<button class="btn btn-secondary" onclick="quickToggleSample('${c.id}', false)" style="font-size:11px;padding:5px 12px;"><i class="fa-solid fa-rotate-left"></i> Geri Al</button>`
            : `<button class="btn btn-primary" onclick="quickToggleSample('${c.id}', true)" style="font-size:11px;padding:5px 12px;"><i class="fa-solid fa-truck-ramp-box"></i> Teslim Et</button>`;
        row.innerHTML = `
            <td style="font-weight:700;">${c.businessName}</td>
            <td>${c.city}</td>
            <td class="text-right" style="font-weight:600;">${c.monthlyConsumption} kg</td>
            <td class="text-center"><span class="sample-icon ${badgeClass}"><i class="fa-solid ${icon}"></i> ${badgeLabel}</span></td>
            <td class="text-center">${actionBtn}</td>`;
        tbody.appendChild(row);
    });
}

// ==========================================
// 18. RECALL PLANNER (Arama Planlayıcı)
// ==========================================
window.filterRecallList = function(filterType) {
    currentRecallFilter = filterType;
    const btnAll = document.getElementById("btn-recall-all"); const btnOv = document.getElementById("btn-recall-overdue"); const btnTd = document.getElementById("btn-recall-today");
    if (btnAll) btnAll.className = filterType === 'all' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    if (btnOv) btnOv.className = filterType === 'overdue' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    if (btnTd) btnTd.className = filterType === 'today' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    const tbody = document.getElementById("recall-table-body"); if (!tbody) return;
    tbody.innerHTML = "";
    const todayStr = new Date().toISOString().slice(0, 10);
    let list = customers.filter(c => c.recallDate && c.status !== "Olumsuz");
    if (filterType === 'overdue') list = list.filter(c => c.recallDate < todayStr);
    else if (filterType === 'today') list = list.filter(c => c.recallDate === todayStr);
    list.sort((a, b) => a.recallDate.localeCompare(b.recallDate));
    if (list.length === 0) { tbody.innerHTML = "<tr><td colspan='5' class='text-center' style='padding:20px; color:var(--text-muted)'>Planlanmış arama bulunamadı.</td></tr>"; return; }
    list.forEach(c => {
        const row = document.createElement("tr");
        let color = "var(--text-muted)", label = "Gelecek Arama";
        if (c.recallDate < todayStr) { color = "var(--status-negative-bg)"; label = "Gecikmiş"; }
        else if (c.recallDate === todayStr) { color = "var(--status-pending-bg)"; label = "Bugün"; }
        row.innerHTML = `
            <td style="font-weight:700;">${c.businessName}</td>
            <td><strong>${c.contactPerson}</strong><br/><span style="font-size:12px;color:var(--text-muted)"><i class="fa-solid fa-phone"></i> ${c.phone}</span></td>
            <td class="text-center" style="font-weight:700;color:${color};">${formatDate(c.recallDate)}</td>
            <td class="text-center"><span class="status-badge" style="background-color:${color};color:white;font-size:11px;padding:3px 10px;min-width:auto;">${label}</span></td>
            <td class="text-center"><button class="btn btn-primary" onclick="quickCallDone('${c.id}')" style="font-size:11px;padding:5px 12px;"><i class="fa-solid fa-phone-volume"></i> Arandı</button></td>`;
        tbody.appendChild(row);
    });
};

// ==========================================
// 19. CONVERSION FUNNEL (Satış Hunisi)
// ==========================================
function buildConversionFunnel() {
    const total = customers.length;
    const samples = customers.filter(c => c.sampleGiven).length;
    const pending = customers.filter(c => c.status === "Beklemede").length;
    const active = customers.filter(c => c.status === "Aktif").length;

    const sampleRate = total > 0 ? (samples / total) * 100 : 0;
    const pendingRate = total > 0 ? (pending / total) * 100 : 0;
    const activeRate = total > 0 ? (active / total) * 100 : 0;

    // Left Column Visuals
    const tVal = document.getElementById("funnel-val-total"); if (tVal) tVal.textContent = `${total} Müşteri`;
    const sVal = document.getElementById("funnel-val-samples"); if (sVal) sVal.textContent = `${samples} Müşteri (${sampleRate.toFixed(0)}%)`;
    const pVal = document.getElementById("funnel-val-pending"); if (pVal) pVal.textContent = `${pending} Müşteri (${pendingRate.toFixed(0)}%)`;
    const aVal = document.getElementById("funnel-val-active"); if (aVal) aVal.textContent = `${active} Müşteri (${activeRate.toFixed(0)}%)`;

    // Conversion metrics calculation
    const wonRate = samples > 0 ? (customers.filter(c => c.sampleGiven && c.status === "Aktif").length / samples) * 100 : 0;
    const overallRate = total > 0 ? (active / total) * 100 : 0;

    // Circle 1: Sample Rate
    const txtSamples = document.getElementById("percent-txt-samples"); if (txtSamples) txtSamples.textContent = `${sampleRate.toFixed(0)}%`;
    const barSamples = document.getElementById("circle-bar-samples"); if (barSamples) barSamples.style.strokeDashoffset = 125.6 - (125.6 * sampleRate / 100);

    // Circle 2: Offer Won Rate (Sample to Active conversion)
    const txtWon = document.getElementById("percent-txt-won"); if (txtWon) txtWon.textContent = `${wonRate.toFixed(0)}%`;
    const barWon = document.getElementById("circle-bar-won"); if (barWon) barWon.style.strokeDashoffset = 125.6 - (125.6 * wonRate / 100);

    // Circle 3: Overall success rate
    const txtOverall = document.getElementById("percent-txt-overall"); if (txtOverall) txtOverall.textContent = `${overallRate.toFixed(0)}%`;
    const barOverall = document.getElementById("circle-bar-overall"); if (barOverall) barOverall.style.strokeDashoffset = 125.6 - (125.6 * overallRate / 100);

    // Dynamic AI Insight Recommendation
    const insightEl = document.getElementById("ai-funnel-insight");
    if (insightEl) {
        let advice = "";
        if (total === 0) {
            advice = "Sistemde kayıtlı müşteri bulunmamaktadır. Başlamak için Müşteri Listesi sekmesinden yeni bir kayıt oluşturun.";
        } else if (sampleRate < 40) {
            advice = `<strong>Düşük Numune Dağıtımı (%${sampleRate.toFixed(0)}):</strong> Kayıtlı müşterilerinizin yarısından azına numune ulaşmış durumda. Pati Raw'ın doğallığını ve kalitesini deneyimlemeleri için numune dağıtım faaliyetlerini artırın. Bu, satış hacminizi doğrudan yukarı taşıyacaktır.`;
        } else if (wonRate < 50) {
            advice = `<strong>Teklif Dönüşüm Uyarısı (%${wonRate.toFixed(0)}):</strong> Numune teslim edilen müşterilerin aktif satın almaya dönüşme oranı hedeflerin altında. Numune teslim sonrası geri aramaları hızlandırın, müşterilerden geri bildirim alın ve fiyat veya gramaj tekliflerini optimize etmeyi değerlendirin.`;
        } else if (pending > active) {
            advice = `<strong>Yüksek Bekleyen Fırsat Oranı:</strong> Havuzunuzda aktif müşteriden daha fazla bekleyen fırsat (%${pendingRate.toFixed(0)}) var. Bu müşteriler kararsız veya ek teklif bekliyor olabilir. Arama Planlayıcı'yı kullanarak bugün hepsiyle tekrar iletişime geçin ve süreci kapatın.`;
        } else {
            advice = `<strong>Sağlıklı Dönüşüm Akışı:</strong> Tebrikler! Genel satış başarı oranınız %${overallRate.toFixed(0)} ile gayet güçlü bir seviyede. Numune alan müşterilerin kazanılma oranı (%${wonRate.toFixed(0)}) çok iyi. Mevcut satış akışını koruyup yeni kitlelere numune ulaştırmaya odaklanın.`;
        }
        insightEl.innerHTML = advice;
    }
}

// ==========================================
// 20. MISC: Benefits & CSV Export
// ==========================================
window.showBenefitInfo = function(title, desc) {
    document.getElementById("benefit-info-title").textContent = title;
    document.getElementById("benefit-info-desc").textContent = desc;
    document.getElementById("benefit-info-modal").classList.add("open");
};

function exportToCSV() {
    if (customers.length === 0) { showToast("Dışa aktarılacak veri yok.", "error"); return; }
    const headers = ["İŞLETME ADI","YETKİLİ","TELEFON","ŞEHİR","SON GÖRÜŞME","TÜKETİM (KG)","NUMUNE","GERİ ARAMA","DURUM","NOT"];
    const rows = [headers.join(";")];
    customers.forEach(c => { rows.push([`"${c.businessName}"`,`"${c.contactPerson}"`,`"${c.phone}"`,`"${c.city}"`,`"${formatDate(c.lastContactDate)}"`,`"${c.monthlyConsumption}"`,`"${c.sampleGiven ? 'Evet' : 'Hayır'}"`,`"${formatDate(c.recallDate)}"`,`"${c.status}"`,`"${(c.lastContactNote || '').replace(/"/g,'""')}"`].join(";")); });
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `pati_raw_crm_${new Date().toISOString().slice(0,10)}.csv`; link.style.visibility = "hidden";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast("CSV dosyası indirildi.");
}

// ==========================================
// 21. YÖNETİCİ PANELİ (ADMIN PANEL) MANTII
// ==========================================
let sessionLogs = [];

function addLog(message) {
    const timestamp = new Date().toTimeString().slice(0, 8);
    const logStr = `[${timestamp}] ${message}`;
    sessionLogs.push(logStr);
    
    // En fazla 100 log tut
    if (sessionLogs.length > 100) sessionLogs.shift();
    
    const container = document.getElementById("admin-logs-container");
    if (container) {
        container.innerHTML = sessionLogs.map(l => `<div>${l}</div>`).join("");
        container.scrollTop = container.scrollHeight;
    }
}

function renderAdminPanel() {
    const currentUserInput = document.getElementById("admin-current-user");
    if (currentUserInput) {
        currentUserInput.value = sessionStorage.getItem("pati_raw_user") || "admin";
    }

    const connTypeEl = document.getElementById("admin-connection-type");
    if (connTypeEl) {
        connTypeEl.textContent = isSupabaseActive ? "Bulut (Supabase)" : "Yerel Depolama (LocalStorage)";
        connTypeEl.style.color = isSupabaseActive ? "var(--status-active-bg)" : "var(--status-pending-bg)";
    }

    const countEl = document.getElementById("admin-customer-count");
    if (countEl) {
        countEl.textContent = `${customers.length} Kayıt`;
    }
}

// Giriş Bilgileri Güncelleme Submit Formu
async function handleAdminCredentialsSubmit(e) {
    e.preventDefault();
    const currentPass = document.getElementById("admin-current-password").value;
    const newUsername = document.getElementById("admin-new-username").value.trim();
    const newPass = document.getElementById("admin-new-password").value;
    const confirmPass = document.getElementById("admin-confirm-password").value;

    // Şifre eşleşme kontrolü
    if (newPass && newPass !== confirmPass) {
        showToast("Yeni şifreler eşleşmiyor!", "error");
        return;
    }

    if (isSupabaseActive && supabaseClient) {
        // Supabase ile Şifre/Kullanıcı güncelleme
        try {
            const currentEmail = sessionStorage.getItem("pati_raw_user") || "";
            const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
                email: currentEmail,
                password: currentPass
            });

            if (verifyError) {
                showToast("Mevcut şifreniz yanlış!", "error");
                return;
            }

            const updateData = {};
            if (newUsername) updateData.email = newUsername;
            if (newPass) updateData.password = newPass;

            if (Object.keys(updateData).length === 0) {
                showToast("Güncellenecek yeni bir bilgi girmediniz.", "error");
                return;
            }

            const { error } = await supabaseClient.auth.updateUser(updateData);
            if (error) throw error;

            showToast("Supabase kullanıcı bilgileri güncellendi.");
            addLog(`Kullanıcı bilgileri güncellendi. Yeni E-posta: ${newUsername || currentEmail}`);
            if (newUsername) {
                sessionStorage.setItem("pati_raw_user", newUsername);
                document.getElementById("admin-current-user").value = newUsername;
            }
            
            // Temizle
            document.getElementById("admin-current-password").value = "";
            document.getElementById("admin-new-username").value = "";
            document.getElementById("admin-new-password").value = "";
            document.getElementById("admin-confirm-password").value = "";

        } catch (error) {
            console.error("Supabase auth update error:", error);
            showToast("Güncelleme başarısız: " + error.message, "error");
        }
    } else {
        // Yerel LocalStorage Giriş Bilgilerini Değiştirme
        const currentLocalUser = localStorage.getItem("pati_raw_local_user") || "admin";
        const currentLocalPass = localStorage.getItem("pati_raw_local_pass") || "patiraw2026";

        if (currentPass !== currentLocalPass) {
            showToast("Mevcut şifreniz yanlış!", "error");
            return;
        }

        const nextUser = newUsername || currentLocalUser;
        const nextPass = newPass || currentLocalPass;

        localStorage.setItem("pati_raw_local_user", nextUser);
        localStorage.setItem("pati_raw_local_pass", nextPass);

        sessionStorage.setItem("pati_raw_user", nextUser);
        document.getElementById("admin-current-user").value = nextUser;

        showToast("Yerel giriş bilgileri başarıyla güncellendi.");
        addLog(`Yerel yönetici bilgileri güncellendi. Kullanıcı: ${nextUser}`);

        // Temizle
        document.getElementById("admin-current-password").value = "";
        document.getElementById("admin-new-username").value = "";
        document.getElementById("admin-new-password").value = "";
        document.getElementById("admin-confirm-password").value = "";
    }
}

// JSON Yedek İndirme
function backupDataToJson() {
    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customers, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `pati_raw_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Yedek JSON dosyası başarıyla indirildi.");
        addLog("Tüm veritabanı JSON yedeği olarak indirildi.");
    } catch (e) {
        showToast("Yedek alınırken hata oluştu!", "error");
    }
}

// JSON Yedekten Geri Yükleme
function restoreDataFromJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const importedData = JSON.parse(evt.target.result);
            if (!Array.isArray(importedData)) {
                throw new Error("Geçersiz veri yapısı. JSON bir dizi (array) olmalıdır.");
            }

            const isValid = importedData.every(c => c.businessName && c.contactPerson && c.phone);
            if (!isValid) {
                throw new Error("Dizi içerisindeki kayıtlar zorunlu alanları (businessName, contactPerson, phone) içermelidir.");
            }

            if (!confirm(`Yedekteki ${importedData.length} müşteriyi geri yüklemek istiyor musunuz? Mevcut tüm veriler silinecektir!`)) {
                return;
            }

            if (isSupabaseActive && supabaseClient) {
                addLog("Yedekten Supabase'e geri yükleme başlatılıyor...");
                const { error: delErr } = await supabaseClient.from("customers").delete().neq("id", "0");
                if (delErr) throw delErr;

                const dbRows = importedData.map(c => ({
                    id: c.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    business_name: c.businessName,
                    contact_person: c.contactPerson,
                    phone: c.phone,
                    city: c.city || "",
                    last_contact_date: c.lastContactDate || null,
                    monthly_consumption: Number(c.monthlyConsumption) || 0,
                    sample_given: !!c.sampleGiven,
                    recall_date: c.recallDate || null,
                    status: c.status || "Aktif",
                    last_contact_note: c.lastContactNote || ""
                }));

                const { error: insErr } = await supabaseClient.from("customers").insert(dbRows);
                if (insErr) throw insErr;

                addLog(`Supabase yedekten geri yükleme başarılı. ${importedData.length} kayıt eklendi.`);
            } else {
                customers = importedData;
                saveLocalData();
                addLog(`LocalStorage yedekten geri yükleme başarılı. ${importedData.length} kayıt yüklendi.`);
            }

            showToast("Veriler başarıyla geri yüklendi!");
            await fetchAllData();
            renderAdminPanel();

        } catch (err) {
            alert("Yedek yükleme hatası: " + err.message);
            showToast("Yedek yüklenemedi!", "error");
        } finally {
            e.target.value = "";
        }
    };
    reader.readAsText(file);
}

// Varsayılan Fabrika Ayarlarına Dönüş
async function handleResetDefaults() {
    if (!confirm("Tüm verileri silip varsayılan örnek verileri yüklemek istediğinize emin misiniz?")) return;

    if (isSupabaseActive && supabaseClient) {
        try {
            addLog("Supabase veritabanı sıfırlanıyor...");
            const { error: delErr } = await supabaseClient.from("customers").delete().neq("id", "0");
            if (delErr) throw delErr;

            const dbRows = defaultCustomers.map(c => ({
                id: c.id,
                business_name: c.businessName,
                contact_person: c.contactPerson,
                phone: c.phone,
                city: c.city,
                last_contact_date: c.lastContactDate,
                monthly_consumption: c.monthlyConsumption,
                sample_given: c.sampleGiven,
                recall_date: c.recallDate,
                status: c.status,
                last_contact_note: c.lastContactNote
            }));

            const { error: insErr } = await supabaseClient.from("customers").insert(dbRows);
            if (insErr) throw insErr;

            addLog("Supabase veritabanı sıfırlandı ve örnek veriler yüklendi.");
        } catch (error) {
            console.error("Reset defaults failed:", error);
            showToast("Sıfırlama başarısız oldu!", "error");
            return;
        }
    } else {
        customers = [...defaultCustomers];
        saveLocalData();
        addLog("LocalStorage veritabanı sıfırlandı ve örnek veriler yüklendi.");
    }

    showToast("Fabrika ayarlarına dönüldü!");
    await fetchAllData();
    renderAdminPanel();
}
