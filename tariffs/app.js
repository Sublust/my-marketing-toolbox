import { CHANNELS, KNOWLEDGE_BASE } from './data.js';

// Application State
const state = {
  channel: 'meta',
  tier: 'pro',
  accountStatus: 'existing', // 'existing' | 'new'
  clientName: '',
  addons: {}, // { [addonId]: number | boolean }
  kbFilter: 'all',
  kbSearch: ''
};

// DOM Elements
const elChannelTabs = document.getElementById('channelTabs');
const elTiersGrid = document.getElementById('tiersGrid');
const elClientName = document.getElementById('clientName');
const elStatusNew = document.getElementById('statusNew');
const elStatusExisting = document.getElementById('statusExisting');
const elOnetimeAddons = document.getElementById('onetimeAddons');
const elMonthlyAddons = document.getElementById('monthlyAddons');

// Summary Figures
const elSetupPrice = document.getElementById('setupPrice');
const elMonthlyPrice = document.getElementById('monthlyPrice');
const elFirstMonthTotal = document.getElementById('firstMonthTotal');
const elBtnCopyProposal = document.getElementById('btnCopyProposal');
const elBtnSaveClient = document.getElementById('btnSaveClient');
const elSavedClientsSelect = document.getElementById('savedClientsSelect');

// KB Elements
const elKbSearch = document.getElementById('kbSearch');
const elKbTags = document.getElementById('kbTags');
const elKbList = document.getElementById('kbList');

// Modal Elements
const elModal = document.getElementById('infoModal');
const elModalTitle = document.getElementById('modalTitle');
const elModalBody = document.getElementById('modalBody');
const elModalClose = document.getElementById('modalClose');
const elToast = document.getElementById('toastMsg');

// Helpers
function formatUah(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн';
}

function showToast(text) {
  elToast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${text}</span>`;
  elToast.classList.add('show');
  setTimeout(() => elToast.classList.remove('show'), 2500);
}

// 1. Render Tiers
function renderTiers() {
  const currentChannel = CHANNELS[state.channel];
  const tiers = currentChannel.tiers;

  elTiersGrid.innerHTML = Object.values(tiers).map(t => {
    const isSelected = t.id === state.tier;
    return `
      <div class="tier-card ${isSelected ? 'selected' : ''}" data-tier="${t.id}">
        ${t.recommended ? '<div class="tier-badge">Основний вибір</div>' : ''}
        <div class="tier-name">
          <span>${t.name}</span>
          ${isSelected ? '<i class="fa-solid fa-circle-check" style="color:var(--accent)"></i>' : ''}
        </div>
        <div class="tier-target">${t.audience}</div>
        <div class="tier-pricing">
          <div class="price-main">${formatUah(t.monthlyPrice)} <span class="price-unit">/ міс.</span></div>
          <div class="price-setup">Старт «з нуля»: ${formatUah(t.setupPrice)}</div>
        </div>
        <ul class="tier-specs-preview">
          <li><i class="fa-solid fa-layer-group"></i> ${t.limits.streams}</li>
          <li><i class="fa-solid fa-palette"></i> ${t.limits.staticPlots} сюжетів статики (${t.limits.staticFormats})</li>
          ${state.channel === 'meta' ? `<li><i class="fa-solid fa-video"></i> ${t.limits.readyVideos} готових відео клієнта (без монтажу)</li>` : `<li><i class="fa-brands fa-youtube"></i> Відео завантажує клієнт на YouTube</li>`}
          <li><i class="fa-solid fa-paper-plane"></i> ${t.limits.leads}</li>
        </ul>
      </div>
    `;
  }).join('');

  // Attach click listeners to cards
  elTiersGrid.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('click', () => {
      state.tier = card.dataset.tier;
      renderTiers();
      calculateTotal();
    });
  });
}

// 2. Render Add-ons
function renderAddons() {
  const currentChannel = CHANNELS[state.channel];
  const onetime = currentChannel.addons.onetime;
  const monthly = currentChannel.addons.monthly;

  // Render One-time Addons
  elOnetimeAddons.innerHTML = onetime.map(item => {
    const isChecked = !!state.addons[item.id];
    return `
      <div class="addon-row">
        <div class="addon-info-left">
          <input type="checkbox" class="addon-checkbox" id="${item.id}" data-id="${item.id}" ${isChecked ? 'checked' : ''} />
          <label for="${item.id}" class="addon-name">${item.name}</label>
          <button class="btn-info-pop" data-info="${item.info}" data-title="${item.name}" title="Детальніше">
            <i class="fa-solid fa-circle-info"></i>
          </button>
        </div>
        <div class="addon-controls-right">
          <div class="addon-price-tag">+${formatUah(item.price)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Render Monthly Addons
  elMonthlyAddons.innerHTML = monthly.map(item => {
    if (item.type === 'counter') {
      const count = state.addons[item.id] || 0;
      return `
        <div class="addon-row">
          <div class="addon-info-left">
            <span class="addon-name">${item.name}</span>
            <button class="btn-info-pop" data-info="${item.info}" data-title="${item.name}" title="Детальніше">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </div>
          <div class="addon-controls-right">
            <div class="addon-price-tag">+${formatUah(item.price)} / ${item.unit}</div>
            <div class="counter-box">
              <button class="counter-btn" data-action="dec" data-id="${item.id}">-</button>
              <span class="counter-val">${count}</span>
              <button class="counter-btn" data-action="inc" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `;
    } else {
      const isChecked = !!state.addons[item.id];
      return `
        <div class="addon-row">
          <div class="addon-info-left">
            <input type="checkbox" class="addon-checkbox" id="${item.id}" data-id="${item.id}" ${isChecked ? 'checked' : ''} />
            <label for="${item.id}" class="addon-name">${item.name}</label>
            <button class="btn-info-pop" data-info="${item.info}" data-title="${item.name}" title="Детальніше">
              <i class="fa-solid fa-circle-info"></i>
            </button>
          </div>
          <div class="addon-controls-right">
            <div class="addon-price-tag">+${formatUah(item.price)} / міс.</div>
          </div>
        </div>
      `;
    }
  }).join('');

  // Attach Addon Listeners
  const allInputs = document.querySelectorAll('.addons-section input[type="checkbox"]');
  allInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      state.addons[e.target.dataset.id] = e.target.checked;
      calculateTotal();
    });
  });

  const counterBtns = document.querySelectorAll('.counter-btn');
  counterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const current = state.addons[id] || 0;
      if (action === 'inc') {
        state.addons[id] = current + 1;
      } else if (action === 'dec' && current > 0) {
        state.addons[id] = current - 1;
      }
      renderAddons();
      calculateTotal();
    });
  });

  // Attach info buttons
  document.querySelectorAll('.btn-info-pop').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.title, btn.dataset.info);
    });
  });
}

// 3. Calculation Logic
function calculateTotal() {
  const currentChannel = CHANNELS[state.channel];
  const currentTier = currentChannel.tiers[state.tier];

  // Base setup fee
  let setupFee = state.accountStatus === 'new' ? currentTier.setupPrice : 0;

  // Add-ons: One-time
  currentChannel.addons.onetime.forEach(item => {
    if (state.addons[item.id]) {
      setupFee += item.price;
    }
  });

  // Monthly Retainer
  let monthlyFee = currentTier.monthlyPrice;

  // Add-ons: Monthly
  currentChannel.addons.monthly.forEach(item => {
    if (item.type === 'counter') {
      const count = state.addons[item.id] || 0;
      monthlyFee += count * item.price;
    } else if (state.addons[item.id]) {
      monthlyFee += item.price;
    }
  });

  const firstMonthTotal = setupFee + monthlyFee;

  // Update UI figures
  elSetupPrice.textContent = formatUah(setupFee);
  elMonthlyPrice.textContent = formatUah(monthlyFee);
  elFirstMonthTotal.textContent = formatUah(firstMonthTotal);

  return { setupFee, monthlyFee, firstMonthTotal, currentTier };
}

// 4. Knowledge Base Rendering & Search
function renderKnowledgeBase() {
  const categories = [
    { id: 'all', name: 'Усі теми' },
    { id: 'pricing', name: 'Ціноутворення' },
    { id: 'creatives', name: 'Креативи 4:5/9:16' },
    { id: 'video', name: 'Відео (без монтажу)' },
    { id: 'leads', name: 'Telegram & CRM' },
    { id: 'structure', name: 'Кампанії та ліміти' },
    { id: 'reporting', name: 'Звітність' }
  ];

  elKbTags.innerHTML = categories.map(c => `
    <button class="kb-tag ${state.kbFilter === c.id ? 'active' : ''}" data-cat="${c.id}">
      ${c.name}
    </button>
  `).join('');

  elKbTags.querySelectorAll('.kb-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      state.kbFilter = tag.dataset.cat;
      renderKnowledgeBase();
    });
  });

  // Filter KB items
  const query = state.kbSearch.toLowerCase().trim();
  const filtered = KNOWLEDGE_BASE.filter(item => {
    const matchesCat = state.kbFilter === 'all' || item.category === state.kbFilter;
    const matchesSearch = !query ||
      item.title.toLowerCase().includes(query) ||
      item.short.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    elKbList.innerHTML = `<div style="text-align:center; padding:32px 16px; color:var(--muted); font-size:13px;">Нічого не знайдено за запитом "${query}"</div>`;
    return;
  }

  elKbList.innerHTML = filtered.map(item => `
    <div class="kb-item-card" id="${item.id}">
      <div class="kb-item-header">
        <div class="kb-item-title-wrap">
          <span class="kb-item-category">${item.categoryName}</span>
          <div class="kb-item-title">${item.title}</div>
          <div class="kb-item-short">${item.short}</div>
        </div>
        <i class="fa-solid fa-chevron-down kb-chevron"></i>
      </div>
      <div class="kb-item-body">
        ${item.content}
      </div>
    </div>
  `).join('');

  elKbList.querySelectorAll('.kb-item-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });
}

// 5. Modal Handlers
function openModal(title, bodyHtml) {
  elModalTitle.textContent = title;
  elModalBody.innerHTML = bodyHtml;
  elModal.classList.add('open');
}

elModalClose.addEventListener('click', () => elModal.classList.remove('open'));
elModal.addEventListener('click', (e) => {
  if (e.target === elModal) elModal.classList.remove('open');
});

// 6. Proposal Text Generator (Telegram / Email / Worksection)
function generateProposalText() {
  const { setupFee, monthlyFee, firstMonthTotal, currentTier } = calculateTotal();
  const currentChannel = CHANNELS[state.channel];
  const client = state.clientName.trim() || 'Клієнт';

  let text = `💼 КОМЕРЦІЙНА ПРОПОЗИЦІЯ IMREV AGENCY\n`;
  text += `👤 Проєкт: ${client}\n`;
  text += `🚀 Напрямок: ${currentChannel.name} (${currentChannel.subtitle})\n`;
  text += `📦 Тарифний пакет: ${currentTier.name}\n\n`;

  text += `📋 ЩО ВХОДИТЬ У ЩОМІСЯЧНИЙ СУПРОВІД:\n`;
  text += `• Просувані напрямки: ${currentTier.limits.streams}\n`;
  text += `• Статичні креативи: до ${currentTier.limits.staticPlots} сюжетів на місяць (адаптація у 3 формати: 1:1, 4:5, 9:16 — разом до ${currentTier.limits.staticPlots * 3} файлів)\n`;
  if (state.channel === 'meta') {
    text += `• Відеоклієнта: адаптація до ${currentTier.limits.readyVideos} готових змонтованих роликів (кадрування Safe Zones під 9:16/4:5/1:1, брендовані плашки з офером, тримінг. Без монтажу)\n`;
    text += `• Лідогенерація: миттєве сповіщення менеджера в Telegram-бота через Make (до 2–4 форм включено)\n`;
  } else {
    text += `• Відеокампанії: завантаження клієнтом на YouTube (супровід у Demand Gen / PMax)\n`;
    text += `• Аналітика та цілі: відстеження конверсій у GA4 + GTM\n`;
  }
  text += `• Звітність: щомісячний детальний структурований звіт у тасці Worksection\n`;
  text += `• Комунікація: щомісячна презентація звіту / зустріч + робочий чат\n\n`;

  // Selected Add-ons
  const selectedOnetime = currentChannel.addons.onetime.filter(a => state.addons[a.id]);
  const selectedMonthly = currentChannel.addons.monthly.filter(a => (a.type === 'counter' ? state.addons[a.id] > 0 : state.addons[a.id]));

  if (selectedOnetime.length > 0 || selectedMonthly.length > 0) {
    text += `➕ ОБРАНІ ДОДАТКОВІ ОПЦІЇ (ADD-ONS):\n`;
    selectedOnetime.forEach(a => {
      text += `• [Разово] ${a.name}: +${formatUah(a.price)}\n`;
    });
    selectedMonthly.forEach(a => {
      if (a.type === 'counter') {
        const cnt = state.addons[a.id];
        text += `• [Щомісяця] ${a.name} (x${cnt}): +${formatUah(a.price * cnt)}/міс.\n`;
      } else {
        text += `• [Щомісяця] ${a.name}: +${formatUah(a.price)}/міс.\n`;
      }
    });
    text += `\n`;
  }

  text += `💰 ФІНАНСОВІ УМОВИ:\n`;
  if (state.accountStatus === 'new') {
    text += `• Стартовий запуск «з нуля»: ${formatUah(setupFee)}\n`;
  } else {
    text += `• Стартовий запуск: 0 грн (діючий налаштований акаунт)\n`;
    if (setupFee > 0) {
      text += `• Разові додаткові послуги: ${formatUah(setupFee)}\n`;
    }
  }
  text += `• Щомісячний регулярний супровід: ${formatUah(monthlyFee)} / місяць\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔥 РАЗОМ ЗА ПЕРШИЙ МІСЯЦЬ: ${formatUah(firstMonthTotal)}\n`;
  text += `(Рекламний бюджет оплачується клієнтом напряму в рекламний кабінет)\n`;

  return text;
}

// 7. Client Database (LocalStorage)
function getSavedClients() {
  try {
    return JSON.parse(localStorage.getItem('imrev_saved_tariffs') || '[]');
  } catch (e) {
    return [];
  }
}

function updateSavedClientsDropdown() {
  const clients = getSavedClients();
  if (clients.length === 0) {
    elSavedClientsSelect.innerHTML = '<option value="">(Немає збережених клієнтів)</option>';
    return;
  }
  elSavedClientsSelect.innerHTML = '<option value="">📁 Обрати зі збережених клієнтів...</option>' +
    clients.map((c, i) => `<option value="${i}">${c.clientName || 'Без назви'} — ${c.channel.toUpperCase()} (${c.tier}) [${formatUah(c.monthlyFee)}/міс.]</option>`).join('');
}

function saveCurrentClient() {
  const { setupFee, monthlyFee, firstMonthTotal } = calculateTotal();
  const name = state.clientName.trim() || 'Клієнт ' + new Date().toLocaleDateString('uk-UA');
  
  const clientData = {
    id: 'c_' + Date.now(),
    clientName: name,
    channel: state.channel,
    tier: state.tier,
    accountStatus: state.accountStatus,
    addons: { ...state.addons },
    setupFee,
    monthlyFee,
    firstMonthTotal,
    updatedAt: new Date().toISOString()
  };

  const clients = getSavedClients();
  const existingIndex = clients.findIndex(c => c.clientName.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    clients[existingIndex] = clientData;
  } else {
    clients.unshift(clientData);
  }

  localStorage.setItem('imrev_saved_tariffs', JSON.stringify(clients));
  updateSavedClientsDropdown();
  showToast(`Проєкт "${name}" збережено в базу!`);
}

elSavedClientsSelect.addEventListener('change', (e) => {
  const index = e.target.value;
  if (index === '') return;
  const clients = getSavedClients();
  const client = clients[index];
  if (!client) return;

  state.channel = client.channel;
  state.tier = client.tier;
  state.accountStatus = client.accountStatus;
  state.clientName = client.clientName;
  state.addons = client.addons || {};

  // Update tabs UI
  elChannelTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.channel === state.channel);
  });

  // Update status UI
  elStatusNew.classList.toggle('active', state.accountStatus === 'new');
  elStatusExisting.classList.toggle('active', state.accountStatus === 'existing');

  elClientName.value = state.clientName;

  renderTiers();
  renderAddons();
  calculateTotal();
  showToast(`Завантажено проєкт "${client.clientName}"`);
});

// 8. Event Listeners Init
elChannelTabs.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.channel = btn.dataset.channel;
    elChannelTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.addons = {}; // reset addons on channel change
    renderTiers();
    renderAddons();
    calculateTotal();
  });
});

elStatusNew.addEventListener('click', () => {
  state.accountStatus = 'new';
  elStatusNew.classList.add('active');
  elStatusExisting.classList.remove('active');
  calculateTotal();
});

elStatusExisting.addEventListener('click', () => {
  state.accountStatus = 'existing';
  elStatusExisting.classList.add('active');
  elStatusNew.classList.remove('active');
  calculateTotal();
});

elClientName.addEventListener('input', (e) => {
  state.clientName = e.target.value;
});

elKbSearch.addEventListener('input', (e) => {
  state.kbSearch = e.target.value;
  renderKnowledgeBase();
});

elBtnCopyProposal.addEventListener('click', () => {
  const proposalText = generateProposalText();
  navigator.clipboard.writeText(proposalText).then(() => {
    showToast('КП скопійовано в буфер обміну!');
  }).catch(() => {
    prompt('Скопіюйте комерційну пропозицію вручну:', proposalText);
  });
});

elBtnSaveClient.addEventListener('click', saveCurrentClient);

// Initialize App
renderTiers();
renderAddons();
calculateTotal();
renderKnowledgeBase();
updateSavedClientsDropdown();
