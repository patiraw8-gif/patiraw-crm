/* ==========================================
   PATI RAW CRM - APPLICATION LOGIC (v2.0.0)
   ========================================== */

// 1. Initial Default Seed Data
const defaultCustomers = [
    { id: "1", businessName: "İzmir K9 Eğitim Merkezi", contactPerson: "Emre Yıldız", phone: "0532 123 45 67", city: "İzmir", lastContactDate: "2025-05-15", monthlyConsumption: 120, sampleGiven: true, recallDate: "2025-05-25", status: "Aktif" },
    { id: "2", businessName: "Ege Köpek Çiftliği", contactPerson: "Murat Aksoy", phone: "0541 987 65 43", city: "Manisa", lastContactDate: "2025-05-14", monthlyConsumption: 150, sampleGiven: true, recallDate: "2025-05-22", status: "Beklemede" },
    { id: "3", businessName: "Patili Pansiyon", contactPerson: "Ayşe Demir", phone: "0530 555 21 21", city: "İzmir", lastContactDate: "2025-05-10", monthlyConsumption: 80, sampleGiven: false, recallDate: "2025-05-20", status: "Aktif" },
    { id: "4", businessName: "Mutlu Patiler Veteriner Kliniği", contactPerson: "Dr. Can Arslan", phone: "0533 777 88 99", city: "Aydın", lastContactDate: "2025-05-12", monthlyConsumption: 60, sampleGiven: true, recallDate: "2025-05-26", status: "Beklemede" },
    { id: "5", businessName: "Can Dostlar Pet Shop", contactPerson: "Seda Kılıç", phone: "0542 112 22 33", city: "Muğla", lastContactDate: "2025-05-08", monthlyConsumption: 100, sampleGiven: false, recallDate: "2025-05-18", status: "Olumsuz" },
    { id: "6", businessName: "Elite K9 Çiftliği", contactPerson: "Cenk Kara", phone: "0531 444 55 66", city: "Denizli", lastContactDate: "2025-05-16", monthlyConsumption: 200, sampleGiven: true, recallDate: "2025-05-30", status: "Aktif" }
];

// 2. Application State
let customers = [];
let deleteTargetId = null;
let currentSort = { key: null, direction: 'asc' };
let currentRecallFilter = 'all'; // all, overdue, today

// Chart.js Instances
let cityChartInstance = null;
let statusChartInstance = null;

// Supabase State
let supabaseUrl = "";
let supabaseKey = "";
let supabaseClient = null;
let isSupabaseActive = false;

// 3. DOM Elements
const tableBody = document.getElementById("table-body");
const searchInput = document.getElementById("search-input");
const filterCity = document.getElementById("filter-city");
const filterStatus = document.getElementById("filter-status");
const noDataMsg = document.getElementById("no-data-msg");

// Page Title & Subtitle for Dynamic Header
const pageTitle = document.getElementById("page-title");
const pageSubtitle = document.getElementById("page-subtitle");

// Stat Elements
const statTotal = document.getElementById("stat-total-customers");
const statActive = document.getElementById("stat-active-customers");
const statPending = document.getElementById("stat-pending-customers");
const statConsumption = document.getElementById("stat-total-consumption");

// Modals
const customerModal = document.getElementById("customer-modal");
const confirmModal = document.getElementById("confirm-modal");
const customerForm = document.getElementById("customer-form");
const modalTitle = document.getElementById("modal-title");
const connectionStatusBanner = document.getElementById("connection-status-banner");
const connectionStatusText = document.getElementById("connection-status-text");
const toast = document.getElementById("toast-notification");
const benefitModal = document.getElementById("benefit-info-modal");

// Form & Buttons
const settingsForm = document.getElementById("settings-form");
const btnAddCustomer = document.getElementById("btn-add-customer");
const btnTestConnection = document.getElementById("btn-test-connection");
const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
const btnConfirmDelete = document.getElementById("btn-confirm-delete");
const btnExport = document.getElementById("btn-export");
const btnClearAll = document.getElementById("btn-clear-all");

// Tab title mapping
const tabHeaderDetails = {
    "tab-dashboard": { title: "Kontrol Paneli", subtitle: "Pati Raw CRM ile işletme süreçlerinizi anlık olarak yönetin." },
    "tab-customers": { title: "Müşteri Listesi", subtitle: "Tüm müşteri kayıtlarını listeleyin, arayın ve düzenleyin." },
    "tab-timeline": { title: "Görüşme Geçmişi", subtitle: "Müşterilerinizle yapılan son görüşme notları ve tarihleri." },
    "tab-samples": { title: "Numune Takibi", subtitle: "Verilen numuneler ve tüketim potansiyelleri analizi." },
    "tab-planner": { title: "Arama Planlayıcı", subtitle: "Geri arama tarihleri planlanmış ve gecikmiş müşteriler." },
    "tab-funnel": { title: "Satış Hunisi", subtitle: "Müşteri dönüşüm oranları analizi." },
    "tab-settings": { title: "Bağlantı Ayarları", subtitle: "Supabase bulut veritabanı entegrasyon ayarları." }
};

// 4. Initialize Application
window.addEventListener("DOMContentLoaded", async () => {
    loadSettings();
    await initSupabase();
    await fetchAllData();
    setupEventListeners();
    setupTabNavigation();
});

// Load settings from LocalStorage or config.js
function loadSettings() {
    // Check if config.js loaded global SUPABASE_CONFIG
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
                connectionStatusText.innerHTML = `<i class="fa-solid fa-cloud-check banner-icon"></i> Supabase Bulut Veritabanı Aktif!`;
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
    connectionStatusText.innerHTML = `<i class="fa-solid fa-database banner-icon"></i> Veriler LocalStorage üzerinde saklanıyor.`;
}

// Fetch all customers from active source
async function fetchAllData() {
    if (isSupabaseActive && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("customers")
                .select("*")
                .order("created_at", { ascending: false });
                
            if (error) throw error;
            
            // Map database snake_case to app camelCase
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
                status: dbCust.status
            }));
            
        } catch (error) {
            console.error("Supabase fetch failed, falling back to LocalStorage:", error);
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
}

function loadLocalData() {
    const saved = localStorage.getItem("pati_raw_crm_customers");
    if (saved) {
        try {
            customers = JSON.parse(saved);
        } catch (e) {
            customers = [...defaultCustomers];
            saveLocalData();
        }
    } else {
        customers = [...defaultCustomers];
        saveLocalData();
    }
}

function saveLocalData() {
    localStorage.setItem("pati_raw_crm_customers", JSON.stringify(customers));
}

// Set up Tab Switching
function setupTabNavigation() {
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Remove active from all tabs
            document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(tp => tp.classList.remove("active"));
            
            // Activate current tab
            item.classList.add("active");
            const targetTabId = item.getAttribute("data-tab");
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add("active");
            }
            
            // Update Page Header Titles
            if (tabHeaderDetails[targetTabId]) {
                pageTitle.textContent = tabHeaderDetails[targetTabId].title;
                pageSubtitle.textContent = tabHeaderDetails[targetTabId].subtitle;
            }
            
            // Trigger specific page panel builds
            if (targetTabId === 'tab-dashboard') {
                updateCharts();
            } else if (targetTabId === 'tab-timeline') {
                buildMeetingsTimeline();
            } else if (targetTabId === 'tab-samples') {
                buildSamplesDashboard();
            } else if (targetTabId === 'tab-planner') {
                filterRecallList(currentRecallFilter);
            } else if (targetTabId === 'tab-funnel') {
                buildConversionFunnel();
            }
        });
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Search and Filters (Müşteri Listesi)
    searchInput.addEventListener("input", filterAndRender);
    filterCity.addEventListener("change", filterAndRender);
    filterStatus.addEventListener("change", filterAndRender);

    // Modal Triggers
    btnAddCustomer.addEventListener("click", () => openCustomerModal());
    
    // Clear All Data Button
    if (btnClearAll) {
        btnClearAll.addEventListener("click", handleClearAllData);
    }
    
    // Form Submits
    customerForm.addEventListener("submit", handleFormSubmit);
    if (settingsForm) {
        settingsForm.addEventListener("submit", handleSettingsSubmit);
    }
    if (btnTestConnection) {
        btnTestConnection.addEventListener("click", testSupabaseConnection);
    }

    // Confirm Delete
    btnConfirmCancel.addEventListener("click", () => confirmModal.classList.remove("open"));
    btnConfirmDelete.addEventListener("click", deleteCustomer);

    // Click outside overlay to close
    window.addEventListener("click", (e) => {
        if (e.target === customerModal) closeCustomerModal();
        if (e.target === confirmModal) confirmModal.classList.remove("open");
        if (e.target === benefitModal) benefitModal.classList.remove("open");
    });

    // CSV Export
    btnExport.addEventListener("click", exportToCSV);

    // Table Header Sorting
    document.querySelectorAll(".customer-table th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort");
            handleSort(key);
        });
    });
}

// 5. Utility Functions
function formatDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function normalizeTurkish(str) {
    if (!str) return "";
    return str.toString()
        .replace(/İ/g, "i")
        .replace(/I/g, "ı")
        .replace(/Ş/g, "ş")
        .replace(/Ğ/g, "ğ")
        .replace(/Ç/g, "ç")
        .replace(/Ö/g, "ö")
        .replace(/Ü/g, "ü")
        .toLowerCase();
}

function showToast(message, type = "success") {
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMsg = toast.querySelector(".toast-message");
    
    toastMsg.textContent = message;
    
    if (type === "error") {
        toast.classList.add("error");
        toastIcon.className = "fa-solid fa-circle-xmark toast-icon";
    } else {
        toast.classList.remove("error");
        toastIcon.className = "fa-solid fa-circle-check toast-icon";
    }
    
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Dynamic City Filter Loader
function populateCityFilter() {
    const previousSelection = filterCity.value;
    const cities = [...new Set(customers.map(c => c.city.trim()))]
        .filter(city => city.length > 0)
        .sort((a, b) => a.localeCompare(b, 'tr'));
    
    filterCity.innerHTML = '<option value="">Tüm Şehirler</option>';
    cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        filterCity.appendChild(option);
    });
    
    if (cities.includes(previousSelection)) {
        filterCity.value = previousSelection;
    }
}

// 6. Table Rendering & Filters
function getFilteredCustomers() {
    const searchVal = normalizeTurkish(searchInput.value);
    const cityVal = filterCity.value;
    const statusVal = filterStatus.value;
    
    let result = customers.filter(c => {
        const matchesSearch = normalizeTurkish(c.businessName).includes(searchVal) || 
                              normalizeTurkish(c.contactPerson).includes(searchVal) ||
                              c.phone.includes(searchVal);
                              
        const matchesCity = cityVal === "" || c.city === cityVal;
        const matchesStatus = statusVal === "" || c.status === statusVal;
        
        return matchesSearch && matchesCity && matchesStatus;
    });

    if (currentSort.key) {
        result.sort((a, b) => {
            let valA = a[currentSort.key];
            let valB = b[currentSort.key];

            if (valA === undefined || valA === null) valA = "";
            if (valB === undefined || valB === null) valB = "";

            if (currentSort.key === "monthlyConsumption") {
                return currentSort.direction === 'asc' ? valA - valB : valB - valA;
            }

            valA = valA.toString();
            valB = valB.toString();
            
            const comparison = valA.localeCompare(valB, 'tr', { sensitivity: 'base' });
            return currentSort.direction === 'asc' ? comparison : -comparison;
        });
    }
    
    return result;
}

function renderTable() {
    const filtered = getFilteredCustomers();
    tableBody.innerHTML = "";
    
    const mobileContainer = document.getElementById("mobile-cards-container");
    if (mobileContainer) {
        mobileContainer.innerHTML = "";
    }
    
    if (filtered.length === 0) {
        noDataMsg.style.display = "block";
        return;
    } else {
        noDataMsg.style.display = "none";
    }
    
    filtered.forEach(c => {
        const row = document.createElement("tr");
        
        const sampleIcon = c.sampleGiven 
            ? `<span class="sample-icon yes"><i class="fa-solid fa-circle-check"></i> Evet</span>`
            : `<span class="sample-icon no"><i class="fa-solid fa-circle-xmark"></i> Hayır</span>`;
            
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
                    <button class="action-btn edit" onclick="editCustomerClick('${c.id}')" title="Düzenle">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteCustomerClick('${c.id}')" title="Sil">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Render Mobile Cards
        if (mobileContainer) {
            const card = document.createElement("div");
            card.className = "customer-mobile-card";
            card.innerHTML = `
                <div class="mobile-card-header">
                    <div class="mobile-card-title">${c.businessName}</div>
                    <span class="status-badge ${statusClass}">${c.status}</span>
                </div>
                <div class="mobile-card-body">
                    <div class="mobile-field">
                        <span class="mobile-field-label">Yetkili Kişi</span>
                        <span class="mobile-field-value">${c.contactPerson}</span>
                    </div>
                    <div class="mobile-field">
                        <span class="mobile-field-label">Telefon</span>
                        <span class="mobile-field-value">${c.phone}</span>
                    </div>
                    <div class="mobile-field">
                        <span class="mobile-field-label">Şehir</span>
                        <span class="mobile-field-value">${c.city}</span>
                    </div>
                    <div class="mobile-field">
                        <span class="mobile-field-label">Aylık Tüketim</span>
                        <span class="mobile-field-value">${c.monthlyConsumption || 0} kg</span>
                    </div>
                    <div class="mobile-field">
                        <span class="mobile-field-label">Son Görüşme</span>
                        <span class="mobile-field-value">${formatDate(c.lastContactDate)}</span>
                    </div>
                    <div class="mobile-field">
                        <span class="mobile-field-label">Tekrar Arama</span>
                        <span class="mobile-field-value">${formatDate(c.recallDate)}</span>
                    </div>
                    <div class="mobile-field" style="grid-column: span 2;">
                        <span class="mobile-field-label">Numune Durumu</span>
                        <span class="mobile-field-value">${sampleIcon}</span>
                    </div>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-secondary" onclick="editCustomerClick('${c.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Düzenle
                    </button>
                    <button class="btn btn-danger" onclick="deleteCustomerClick('${c.id}')" style="background-color: #fee2e2; color: var(--status-negative-bg);">
                        <i class="fa-solid fa-trash-can"></i> Sil
                    </button>
                </div>
            `;
            mobileContainer.appendChild(card);
        }
    });
}

function filterAndRender() {
    renderTable();
    updateStats();
}

function handleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }
    
    document.querySelectorAll(".customer-table th").forEach(th => {
        const icon = th.querySelector("i");
        if (icon) icon.className = "fa-solid fa-sort";
    });
    
    const activeHeader = document.querySelector(`.customer-table th[data-sort="${key}"]`);
    if (activeHeader) {
        const icon = activeHeader.querySelector("i");
        if (icon) {
            icon.className = currentSort.direction === 'asc' ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
        }
    }
    
    renderTable();
}

function updateStats() {
    const total = customers.length;
    const active = customers.filter(c => c.status === "Aktif").length;
    const pending = customers.filter(c => c.status === "Beklemede").length;
    const totalCons = customers.reduce((sum, c) => sum + (Number(c.monthlyConsumption) || 0), 0);
    
    statTotal.textContent = total;
    statActive.textContent = active;
    statPending.textContent = pending;
    statConsumption.textContent = `${totalCons.toLocaleString('tr-TR')} kg`;
}

function refreshAllDashboardPanels() {
    updateCharts();
    buildMeetingsTimeline();
    buildSamplesDashboard();
    filterRecallList(currentRecallFilter);
    buildConversionFunnel();
}

// 7. Modals: Add / Edit CRUD Action
function openCustomerModal(customer = null) {
    customerForm.reset();
    document.getElementById("customer-id").value = "";
    
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
    } else {
        modalTitle.textContent = "Yeni Müşteri Kaydı";
        document.getElementById("input-status").value = "Aktif";
    }
    
    customerModal.classList.add("open");
}

function closeCustomerModal() {
    customerModal.classList.remove("open");
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById("customer-id").value;
    const businessName = document.getElementById("input-business-name").value.trim();
    const contactPerson = document.getElementById("input-contact-person").value.trim();
    const phone = document.getElementById("input-phone").value.trim();
    const city = document.getElementById("input-city").value.trim();
    const lastContactDate = document.getElementById("input-last-contact").value || null;
    const monthlyConsumption = parseInt(document.getElementById("input-consumption").value) || 0;
    const recallDate = document.getElementById("input-recall-date").value || null;
    const status = document.getElementById("input-status").value;
    const sampleGiven = document.getElementById("input-sample-given").checked;

    const dataObj = {
        businessName, contactPerson, phone, city, 
        lastContactDate, monthlyConsumption, recallDate, status, sampleGiven
    };
    
    if (isSupabaseActive && supabaseClient) {
        try {
            const dbData = {
                business_name: businessName,
                contact_person: contactPerson,
                phone: phone,
                city: city,
                last_contact_date: lastContactDate,
                monthly_consumption: monthlyConsumption,
                recall_date: recallDate,
                status: status,
                sample_given: sampleGiven
            };

            if (id) {
                const { error } = await supabaseClient
                    .from("customers")
                    .update(dbData)
                    .eq("id", id);
                if (error) throw error;
                showToast("Kayıt başarıyla güncellendi.");
            } else {
                const newId = Date.now().toString();
                const { error } = await supabaseClient
                    .from("customers")
                    .insert({ id: newId, ...dbData });
                if (error) throw error;
                showToast("Yeni kayıt başarıyla eklendi.");
            }
            await fetchAllData();
        } catch (error) {
            console.error("Supabase Save Error:", error);
            showToast("Buluta kayıt edilemedi! İşlem iptal edildi.", "error");
        }
    } else {
        if (id) {
            const idx = customers.findIndex(c => c.id === id);
            if (idx !== -1) {
                customers[idx] = { id, ...dataObj };
                showToast("Kayıt güncellendi (Yerel).");
            }
        } else {
            const newCustomer = { id: Date.now().toString(), ...dataObj };
            customers.push(newCustomer);
            showToast("Yeni kayıt eklendi (Yerel).");
        }
        saveLocalData();
        populateCityFilter();
        renderTable();
        updateStats();
        refreshAllDashboardPanels();
    }
    
    closeCustomerModal();
}

window.editCustomerClick = function(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) openCustomerModal(customer);
};

window.deleteCustomerClick = function(id) {
    deleteTargetId = id;
    confirmModal.classList.add("open");
};

async function deleteCustomer() {
    if (deleteTargetId) {
        if (isSupabaseActive && supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from("customers")
                    .delete()
                    .eq("id", deleteTargetId);
                if (error) throw error;
                showToast("Kayıt başarıyla silindi.", "error");
                await fetchAllData();
            } catch (error) {
                console.error("Supabase Delete Error:", error);
                showToast("Buluttan silme başarısız oldu!", "error");
            }
        } else {
            customers = customers.filter(c => c.id !== deleteTargetId);
            saveLocalData();
            populateCityFilter();
            renderTable();
            updateStats();
            refreshAllDashboardPanels();
            showToast("Kayıt yerel hafızadan silindi.", "error");
        }
        deleteTargetId = null;
    }
    confirmModal.classList.remove("open");
}

// 8. Connection Settings & Test
async function testSupabaseConnection() {
    const url = document.getElementById("settings-url").value.trim();
    const key = document.getElementById("settings-key").value.trim();
    
    if (!url || !key) {
        showToast("Lütfen URL ve Anon Key bilgilerini girin.", "error");
        return;
    }
    
    btnTestConnection.disabled = true;
    btnTestConnection.textContent = "Test ediliyor...";
    
    try {
        const testClient = supabase.createClient(url, key);
        const { data, error } = await testClient.from("customers").select("id").limit(1);
        
        if (error) throw error;
        showToast("Bağlantı Başarılı! Tablo erişimi doğrulandı.");
    } catch (error) {
        console.error("Supabase test connection failed:", error);
        showToast(`Bağlantı Başarısız! Tablo ve anahtarları kontrol edin.`, "error");
    } finally {
        btnTestConnection.disabled = false;
        btnTestConnection.textContent = "Bağlantıyı Test Et";
    }
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    const url = document.getElementById("settings-url").value.trim();
    const key = document.getElementById("settings-key").value.trim();
    
    localStorage.setItem("pati_raw_supabase_url", url);
    localStorage.setItem("pati_raw_supabase_key", key);
    
    supabaseUrl = url;
    supabaseKey = key;
    
    showToast("Ayarlar kaydedildi, yeniden bağlanılıyor...");
    
    await initSupabase();
    await fetchAllData();
}

async function handleClearAllData() {
    const confirmMessage = "TÜM müşteri verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.";
    if (!confirm(confirmMessage)) return;
    
    if (isSupabaseActive && supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from("customers")
                .delete()
                .neq("id", "0");
                
            if (error) throw error;
            showToast("Supabase üzerindeki tüm veriler başarıyla silindi.", "error");
        } catch (error) {
            console.error("Supabase clear failed:", error);
            showToast("Buluttaki veriler silinemedi!", "error");
            return;
        }
    } else {
        customers = [];
        saveLocalData();
        showToast("Yerel hafızadaki tüm veriler silindi.", "error");
    }
    
    await fetchAllData();
}

// 9. Interactive Charts (Chart.js)
function updateCharts() {
    if (customers.length === 0) return;
    
    // Group monthly consumption by city
    const cityData = {};
    customers.forEach(c => {
        const city = c.city || "Bilinmiyor";
        cityData[city] = (cityData[city] || 0) + (Number(c.monthlyConsumption) || 0);
    });
    
    const cityLabels = Object.keys(cityData);
    const cityValues = Object.values(cityData);
    
    // Group counts by status
    const statusData = { "Aktif": 0, "Beklemede": 0, "Olumsuz": 0 };
    customers.forEach(c => {
        if (statusData[c.status] !== undefined) {
            statusData[c.status]++;
        }
    });
    
    const statusLabels = Object.keys(statusData);
    const statusValues = Object.values(statusData);
    
    // 1. Render City Chart
    const ctxCity = document.getElementById('cityChart');
    if (ctxCity) {
        if (cityChartInstance) {
            cityChartInstance.destroy();
        }
        cityChartInstance = new Chart(ctxCity, {
            type: 'bar',
            data: {
                labels: cityLabels,
                datasets: [{
                    label: 'Tüketim Miktarı (KG)',
                    data: cityValues,
                    backgroundColor: 'rgba(255, 106, 0, 0.75)',
                    borderColor: 'rgba(255, 106, 0, 1)',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    // 2. Render Status Chart
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
        if (statusChartInstance) {
            statusChartInstance.destroy();
        }
        statusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: statusLabels,
                datasets: [{
                    data: statusValues,
                    backgroundColor: [
                        '#10b981', // Aktif (Green)
                        '#f59e0b', // Beklemede (Amber)
                        '#ef4444'  // Olumsuz (Red)
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 12 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

// 10. Secondary Dashboard Pages Builder

// Tab 3: Timeline Page Builder
function buildMeetingsTimeline() {
    const timelineEl = document.getElementById("meetings-timeline");
    if (!timelineEl) return;
    
    timelineEl.innerHTML = "";
    
    const visited = customers.filter(c => c.lastContactDate)
        .sort((a,b) => b.lastContactDate.localeCompare(a.lastContactDate));
        
    if (visited.length === 0) {
        timelineEl.innerHTML = "<div class='no-data'><i class='fa-solid fa-calendar-xmark'></i><p>Kayıtlı görüşme tarihi bulunamadı.</p></div>";
        return;
    }
    
    visited.forEach(c => {
        const item = document.createElement("div");
        const statusClass = c.status.toLowerCase() + "-item";
        item.className = `timeline-item ${statusClass}`;
        
        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span><i class="fa-regular fa-clock"></i> ${formatDate(c.lastContactDate)}</span>
                    <span style="font-weight:700;">${c.city}</span>
                </div>
                <div class="timeline-title">${c.businessName}</div>
                <div class="timeline-desc">
                    <strong>Yetkili:</strong> ${c.contactPerson} (${c.phone}) <br/>
                    <strong>Durum:</strong> ${c.status} (${c.monthlyConsumption} kg/Ay Tüketim)
                </div>
            </div>
        `;
        timelineEl.appendChild(item);
    });
}

// Tab 4: Samples Page Builder
function buildSamplesDashboard() {
    const sampleGivenCount = customers.filter(c => c.sampleGiven).length;
    const totalCount = customers.length;
    
    const waitingConsumption = customers.filter(c => !c.sampleGiven && c.status !== "Olumsuz")
        .reduce((sum, c) => sum + (Number(c.monthlyConsumption) || 0), 0);
        
    const activeConsumption = customers.filter(c => c.sampleGiven && c.status === "Aktif")
        .reduce((sum, c) => sum + (Number(c.monthlyConsumption) || 0), 0);
        
    const elGiven = document.getElementById("sample-stat-given");
    const elWaiting = document.getElementById("sample-stat-waiting");
    const elActive = document.getElementById("sample-stat-active");
    
    if (elGiven) elGiven.textContent = `${sampleGivenCount} / ${totalCount}`;
    if (elWaiting) elWaiting.textContent = `${waitingConsumption.toLocaleString('tr-TR')} kg`;
    if (elActive) elActive.textContent = `${activeConsumption.toLocaleString('tr-TR')} kg`;
    
    const sampleTableBody = document.getElementById("sample-table-body");
    if (!sampleTableBody) return;
    sampleTableBody.innerHTML = "";
    
    if (customers.length === 0) {
        sampleTableBody.innerHTML = "<tr><td colspan='4' class='text-center' style='padding:20px;'>Kayıt bulunmamaktadır.</td></tr>";
        return;
    }
    
    customers.forEach(c => {
        const row = document.createElement("tr");
        const badgeClass = c.sampleGiven ? "yes" : "no";
        const badgeLabel = c.sampleGiven ? "Teslim Edildi" : "Verilmedi";
        const icon = c.sampleGiven ? "fa-circle-check" : "fa-circle-xmark";
        
        row.innerHTML = `
            <td style="font-weight:700;">${c.businessName}</td>
            <td>${c.city}</td>
            <td class="text-right" style="font-weight:600;">${c.monthlyConsumption} kg</td>
            <td class="text-center">
                <span class="sample-icon ${badgeClass}"><i class="fa-solid ${icon}"></i> ${badgeLabel}</span>
            </td>
        `;
        sampleTableBody.appendChild(row);
    });
}

// Tab 5: Recall Planner
window.filterRecallList = function(filterType) {
    currentRecallFilter = filterType;
    
    const btnAll = document.getElementById("btn-recall-all");
    const btnOverdue = document.getElementById("btn-recall-overdue");
    const btnToday = document.getElementById("btn-recall-today");
    
    if (btnAll) btnAll.className = filterType === 'all' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    if (btnOverdue) btnOverdue.className = filterType === 'overdue' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    if (btnToday) btnToday.className = filterType === 'today' ? "btn btn-secondary active-filter" : "btn btn-secondary";
    
    const recallTableBody = document.getElementById("recall-table-body");
    if (!recallTableBody) return;
    recallTableBody.innerHTML = "";
    
    const todayStr = new Date().toISOString().slice(0, 10);
    let recallList = customers.filter(c => c.recallDate && c.status !== "Olumsuz");
    
    if (filterType === 'overdue') {
        recallList = recallList.filter(c => c.recallDate < todayStr);
    } else if (filterType === 'today') {
        recallList = recallList.filter(c => c.recallDate === todayStr);
    }
    
    recallList.sort((a,b) => a.recallDate.localeCompare(b.recallDate));
    
    if (recallList.length === 0) {
        recallTableBody.innerHTML = "<tr><td colspan='4' class='text-center' style='padding:20px; color:var(--text-muted)'>Planlanmış arama bulunamadı.</td></tr>";
        return;
    }
    
    recallList.forEach(c => {
        const row = document.createElement("tr");
        let dateBadgeColor = "var(--text-muted)";
        let dateLabel = "Gelecek Arama";
        
        if (c.recallDate < todayStr) {
            dateBadgeColor = "var(--status-negative-bg)";
            dateLabel = "Gecikmiş Arama";
        } else if (c.recallDate === todayStr) {
            dateBadgeColor = "var(--status-pending-bg)";
            dateLabel = "Bugün Aranacak";
        }
        
        row.innerHTML = `
            <td style="font-weight:700;">${c.businessName}</td>
            <td>
                <strong>${c.contactPerson}</strong> <br/>
                <span style="font-size:12px; color:var(--text-muted)"><i class="fa-solid fa-phone"></i> ${c.phone}</span>
            </td>
            <td class="text-center" style="font-weight:700; color:${dateBadgeColor};">${formatDate(c.recallDate)}</td>
            <td class="text-center">
                <span class="status-badge" style="background-color:${dateBadgeColor}; color:white; font-size:11px; padding:3px 10px; min-width:auto;">${dateLabel}</span>
            </td>
        `;
        recallTableBody.appendChild(row);
    });
}

// Tab 6: Conversion Funnel Builder
function buildConversionFunnel() {
    const total = customers.length;
    
    const active = customers.filter(c => c.status === "Aktif").length;
    const pending = customers.filter(c => c.status === "Beklemede").length;
    const negative = customers.filter(c => c.status === "Olumsuz").length;
    
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
    const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0;
    
    const barActive = document.getElementById("layer-active-bar");
    const barPending = document.getElementById("layer-pending-bar");
    const barNegative = document.getElementById("layer-negative-bar");
    
    if (barActive) barActive.style.width = `${Math.max(activePct, 15)}%`;
    if (barPending) barPending.style.width = `${Math.max(pendingPct, 15)}%`;
    if (barNegative) barNegative.style.width = `${Math.max(negativePct, 15)}%`;
    
    const valActive = document.getElementById("layer-active-val");
    const valPending = document.getElementById("layer-pending-val");
    const valNegative = document.getElementById("layer-negative-val");
    
    if (valActive) valActive.textContent = `${active} Müşteri (${activePct}%)`;
    if (valPending) valPending.textContent = `${pending} Müşteri (${pendingPct}%)`;
    if (valNegative) valNegative.textContent = `${negative} Müşteri (${negativePct}%)`;
}

// Benefits Modal View Trigger
window.showBenefitInfo = function(title, description) {
    document.getElementById("benefit-info-title").textContent = title;
    document.getElementById("benefit-info-desc").textContent = description;
    document.getElementById("benefit-info-modal").classList.add("open");
}

// 11. CSV / Excel Export
function exportToCSV() {
    if (customers.length === 0) {
        showToast("Dışa aktarılacak veri bulunmamaktadır.", "error");
        return;
    }
    
    const headers = [
        "İŞLETME ADI", "YETKİLİ KİŞİ", "TELEFON", "ŞEHİR", 
        "SON GÖRÜŞME TARİHİ", "AYLIK TAHMİNİ TÜKETİM (KG)", 
        "NUMUNE VERİLDİ Mİ?", "TEKRAR ARANACAK TARİH", "DURUM"
    ];
    
    const csvRows = [];
    csvRows.push(headers.join(";"));
    
    customers.forEach(c => {
        const row = [
            c.businessName.replace(/"/g, '""'),
            c.contactPerson.replace(/"/g, '""'),
            c.phone,
            c.city,
            formatDate(c.lastContactDate),
            c.monthlyConsumption,
            c.sampleGiven ? "Evet" : "Hayır",
            formatDate(c.recallDate),
            c.status
        ];
        const escapedRow = row.map(val => `"${val}"`);
        csvRows.push(escapedRow.join(";"));
    });
    
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pati_raw_crm_listesi_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Müşteri listesi CSV olarak indirildi.");
}
