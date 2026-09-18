import { CHANNELS, PM_GUIDE } from './data.js';

// Application State
const state = {
  activeChannels: ['meta', 'google'], // Default to both channels enabled for cross-channel view!
  tiers: {
    meta: 'pro',
    google: 'pro'
  },
  addons: {
    meta: {},
    google: {}
  },
  accountStatus: 'existing', // 'existing' | 'new'
  clientName: '',
  guideCategory: 'all',
  guideSearch: ''
};

// DOM Selectors
const elClientName = document.getElementById('clientName');
const elStatusExisting = document.getElementById('statusExisting');
const elStatusNew = document.getElementById('statusNew');
const elChannelSelectors = document.getElementById('channelSelectors');
const elModulesContainer = document.getElementById('channelModulesContainer');

// Sticky Summary Selectors
const elSummaryChannelsList = document.getElementById('summaryChannelsList');
const elTotalSetupPrice = document.getElementById('totalSetupPrice');
const elTotalMonthlyPrice = document.getElementById('totalMonthlyPrice');
const elTotalFirstMonth = document.getElementById('totalFirstMonth');
const elBtnCopyWorksection = document.getElementById('btnCopyWorksection');
const elBtnCopyClientKp = document.getElementById('btnCopyClientKp');

// PM Guide Selectors
const elPmGuideSearch = document.getElementById('pmGuideSearch');
const elPmGuideTags = document.getElementById('pmGuideTags');
const elPmGuideList = document.getElementById('pmGuideList');

// Modal & Toast
const elModal = document.getElementById('infoModal');
const elModalTitle = document.getElementById('modalTitle');
const elModalBody = document.getElementById('modalBody');
const elModalClose = document.getElementById('modalClose');
const elToast = document.getElementById('toastNotice');

function formatUah(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₴';
}

function showToast(text) {
  elToast.innerHTML = `<i class="fa-solid fa-check-circle" style="color:#11cfea;"></i> <span>${text}</span>`;
  elToast.classList.add('show');
  setTimeout(() => elToast.classList.remove('show'), 2500);
}

// 1. Render Channel Check Cards
function renderChannelCards() {
  elChannelSelectors.innerHTML = Object.values(CHANNELS).map(ch => {
    const isActive = state.activeChannels.includes(ch.id);
    return `
      <div class="channel-check-card ${isActive ? 'active' : ''}" data-channel="${ch.id}">
        <div class="channel-card-top">
          <div class="channel-icon-name">
            <i class="${ch.icon}"></i>
            <span>${ch.name}</span>
          </div>
          <div class="channel-check-indicator">
            ${isActive ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
        </div>
        <div class="channel-card-desc">${ch.shortDesc}</div>
        <div class="channel-card-pricing-badge">
          Базовий ретейнер: від ${formatUah(ch.tiers.base.monthlyPrice)}/міс.
        </div>
      </div>
    `;
  }).join('');

  elChannelSelectors.querySelectorAll('.channel-check-card').forEach(card => {
    card.addEventListener('click', () => {
      const chId = card.dataset.channel;
      if (state.activeChannels.includes(chId)) {
        if (state.activeChannels.length > 1) {
          state.activeChannels = state.activeChannels.filter(id => id !== chId);
        } else {
          showToast('У проєкті має бути обрано хоча б 1 канал реклами');
          return;
        }
      } else {
        state.activeChannels.push(chId);
      }
      renderChannelCards();
      renderModules();
      calculateTotals();
    });
  });
}

// 2. Render Active Channel Modules
function renderModules() {
  if (state.activeChannels.length === 0) {
    elModulesContainer.innerHTML = `
      <div style="text-align:center; padding:40px; background:#fff; border-radius:12px; border:1px dashed #cbd5e1;">
        <p style="color:#64748b;">Оберіть хоча б один канал у блоці вище (Meta Ads або Google Ads), щоб налаштувати пакет.</p>
      </div>
    `;
    return;
  }

  elModulesContainer.innerHTML = state.activeChannels.map(chId => {
    const channel = CHANNELS[chId];
    const selectedTierId = state.tiers[chId] || 'pro';
    const currentTier = channel.tiers[selectedTierId];

    return `
      <div class="channel-module" id="module_${chId}">
        <div class="module-header">
          <div class="module-title-area">
            <i class="${channel.icon}" style="font-size:24px; color:var(--accent-blue);"></i>
            <div>
              <h3>${channel.name} — Пакети та операційні межі</h3>
              <p style="font-size:12px; color:var(--text-muted);">${channel.pmHighlights}</p>
            </div>
          </div>
        </div>

        <!-- Tiers Grid for this channel -->
        <div class="tiers-row">
          ${Object.values(channel.tiers).map(t => {
            const isSelected = t.id === selectedTierId;
            return `
              <div class="tier-item ${isSelected ? 'selected' : ''}" data-channel="${chId}" data-tier="${t.id}">
                ${t.recommended ? '<div class="tier-flag">Основний вибір</div>' : ''}
                <div class="tier-item-head">
                  <div class="tier-title">${t.name}</div>
                  ${isSelected ? '<i class="fa-solid fa-circle-check" style="color:var(--accent-blue); font-size:16px;"></i>' : ''}
                </div>
                <div class="tier-for">${t.audience}</div>
                <div class="tier-price-block">
                  <div class="tier-price-val">${formatUah(t.monthlyPrice)} <span style="font-size:12px; font-weight:normal; color:#64748b;">/ міс.</span></div>
                  <div class="tier-price-sub">Стартовий сетап: ${formatUah(t.setupPrice)}</div>
                </div>
                <ul class="tier-specs-list">
                  <li><i class="fa-solid fa-layer-group"></i> <span><strong>${t.limits.streams}</strong></span></li>
                  <li><i class="fa-solid fa-palette"></i> <span><strong>${t.limits.staticPlots} сюжетів</strong> (${t.limits.staticFormats})</span></li>
                  ${chId === 'meta' 
                    ? `<li><i class="fa-solid fa-video"></i> <span><strong>${t.limits.readyVideos} відео клієнта</strong> (Safe Zones 4:5/9:16/1:1, плашки. Без монтажу)</span></li>`
                    : `<li><i class="fa-brands fa-youtube"></i> <span>Відео вантажить замовник на свій YouTube</span></li>`
                  }
                  <li><i class="fa-solid fa-paper-plane"></i> <span>${t.limits.leads}</span></li>
                  <li><i class="fa-solid fa-file-lines"></i> <span>${t.limits.reporting}</span></li>
                </ul>
              </div>
            `;
          }).join('')}
        </div>

        <!-- PM Advice Callout for the Selected Tier -->
        <div class="pm-cheat-box">
          <div class="pm-cheat-title">
            <i class="fa-solid fa-lightbulb"></i>
            <span>Шпаргалка для PM по тарифу ${currentTier.name} (${channel.name})</span>
          </div>
          <div class="pm-cheat-content">
            <p><strong>🎯 Коли пропонувати:</strong> ${currentTier.pmAdvice.whenToSell}</p>
            <p style="margin-top:4px;"><strong>⚡ Тригер для апгрейду:</strong> ${currentTier.pmAdvice.upgradeTrigger}</p>
          </div>
        </div>

        <!-- Add-ons Sub-block for this Channel -->
        <div class="module-addons-area">
          <div style="font-size:13px; font-weight:800; text-transform:uppercase; color:var(--text-main); margin-bottom:12px; display:flex; justify-content:space-between;">
            <span>Додаткові опції (Add-ons) для ${channel.name}</span>
            <span style="font-size:11px; font-weight:normal; color:var(--text-muted);">Разові та щомісячні надбудови</span>
          </div>

          <!-- Monthly Add-ons -->
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
            Щомісячні опції (впливають на щомісячний чек):
          </div>
          ${channel.addons.monthly.map(a => {
            if (a.type === 'counter') {
              const val = (state.addons[chId] && state.addons[chId][a.id]) || 0;
              return `
                <div class="addon-row-light">
                  <div class="addon-left">
                    <span class="addon-title">${a.name}</span>
                    <button class="btn-pm-info" data-title="${a.name}" data-info="${a.info}" title="Довідка">
                      <i class="fa-solid fa-circle-info"></i>
                    </button>
                  </div>
                  <div class="addon-right">
                    <span class="addon-price">+${formatUah(a.price)} / ${a.unit}</span>
                    <div class="counter-widget">
                      <button class="counter-btn-light" data-action="dec" data-channel="${chId}" data-id="${a.id}">-</button>
                      <span class="counter-num">${val}</span>
                      <button class="counter-btn-light" data-action="inc" data-channel="${chId}" data-id="${a.id}">+</button>
                    </div>
                  </div>
                </div>
              `;
            } else {
              const isChecked = state.addons[chId] && state.addons[chId][a.id];
              return `
                <div class="addon-row-light">
                  <div class="addon-left">
                    <input type="checkbox" id="${chId}_${a.id}" data-channel="${chId}" data-id="${a.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
                    <label for="${chId}_${a.id}" class="addon-title" style="cursor:pointer;">${a.name}</label>
                    <button class="btn-pm-info" data-title="${a.name}" data-info="${a.info}" title="Довідка">
                      <i class="fa-solid fa-circle-info"></i>
                    </button>
                  </div>
                  <div class="addon-right">
                    <span class="addon-price">+${formatUah(a.price)} / міс.</span>
                  </div>
                </div>
              `;
            }
          }).join('')}

          <!-- One-time Add-ons -->
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin:14px 0 8px 0;">
            Разові технічні рішення (One-time Setup):
          </div>
          ${channel.addons.onetime.map(a => {
            const isChecked = state.addons[chId] && state.addons[chId][a.id];
            return `
              <div class="addon-row-light">
                <div class="addon-left">
                  <input type="checkbox" id="${chId}_${a.id}" data-channel="${chId}" data-id="${a.id}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
                  <label for="${chId}_${a.id}" class="addon-title" style="cursor:pointer;">${a.name}</label>
                  <button class="btn-pm-info" data-title="${a.name}" data-info="${a.info}" title="Довідка">
                    <i class="fa-solid fa-circle-info"></i>
                  </button>
                </div>
                <div class="addon-right">
                  <span class="addon-price">+${formatUah(a.price)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }).join('');

  // Attach tier click handlers
  document.querySelectorAll('.tier-item').forEach(item => {
    item.addEventListener('click', () => {
      const ch = item.dataset.channel;
      const t = item.dataset.tier;
      state.tiers[ch] = t;
      renderModules();
      calculateTotals();
    });
  });

  // Attach addon checkbox listeners
  document.querySelectorAll('.module-addons-area input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const ch = e.target.dataset.channel;
      const id = e.target.dataset.id;
      if (!state.addons[ch]) state.addons[ch] = {};
      state.addons[ch][id] = e.target.checked;
      calculateTotals();
    });
  });

  // Attach counter buttons
  document.querySelectorAll('.counter-btn-light').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = btn.dataset.channel;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (!state.addons[ch]) state.addons[ch] = {};
      const current = state.addons[ch][id] || 0;
      if (action === 'inc') {
        state.addons[ch][id] = current + 1;
      } else if (action === 'dec' && current > 0) {
        state.addons[ch][id] = current - 1;
      }
      renderModules();
      calculateTotals();
    });
  });

  // Attach info buttons
  document.querySelectorAll('.btn-pm-info').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(btn.dataset.title, btn.dataset.info);
    });
  });
}

// 3. Totals Calculation
function calculateTotals() {
  let totalSetup = 0;
  let totalMonthly = 0;
  const channelSummaries = [];

  state.activeChannels.forEach(chId => {
    const channel = CHANNELS[chId];
    const tierId = state.tiers[chId] || 'pro';
    const tier = channel.tiers[tierId];

    channelSummaries.push(`${channel.name} (${tier.name})`);

    // Setup Fee
    if (state.accountStatus === 'new') {
      totalSetup += tier.setupPrice;
    }

    // Onetime Addons
    channel.addons.onetime.forEach(a => {
      if (state.addons[chId] && state.addons[chId][a.id]) {
        totalSetup += a.price;
      }
    });

    // Monthly Retainer
    totalMonthly += tier.monthlyPrice;

    // Monthly Addons
    channel.addons.monthly.forEach(a => {
      if (a.type === 'counter') {
        const count = (state.addons[chId] && state.addons[chId][a.id]) || 0;
        totalMonthly += count * a.price;
      } else if (state.addons[chId] && state.addons[chId][a.id]) {
        totalMonthly += a.price;
      }
    });
  });

  const grandTotalFirstMonth = totalSetup + totalMonthly;

  // Update Summary UI
  elSummaryChannelsList.textContent = channelSummaries.join(' + ') || 'Жодного каналу не обрано';
  elTotalSetupPrice.textContent = formatUah(totalSetup);
  elTotalMonthlyPrice.textContent = formatUah(totalMonthly);
  elTotalFirstMonth.textContent = formatUah(grandTotalFirstMonth);

  return { totalSetup, totalMonthly, grandTotalFirstMonth };
}

// 4. PM Guide & Scripts Accordion
function renderPmGuide() {
  const categories = [
    { id: 'all', name: 'Усі теми' },
    { id: 'Робота з відео', name: 'Відео (без монтажу)' },
    { id: 'Креативи та дизайн', name: 'Креативи 4:5/9:16' },
    { id: 'Ліди та інтеграції', name: 'Telegram & CRM' },
    { id: 'Кампанії та ліміти', name: 'Ліміти та кампанії' },
    { id: 'Ціноутворення', name: 'Сетап та ціни' }
  ];

  elPmGuideTags.innerHTML = categories.map(cat => `
    <button class="nav-hub-link ${state.guideCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}" style="${state.guideCategory === cat.id ? 'background:#081942; color:#fff; border-color:#081942;' : ''}">
      ${cat.name}
    </button>
  `).join('');

  elPmGuideTags.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.guideCategory = btn.dataset.cat;
      renderPmGuide();
    });
  });

  const q = state.guideSearch.toLowerCase().trim();
  const filtered = PM_GUIDE.filter(item => {
    const matchCat = state.guideCategory === 'all' || item.tag === state.guideCategory;
    const matchSearch = !q || item.q.toLowerCase().includes(q) || item.short.toLowerCase().includes(q) || item.clientScript.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    elPmGuideList.innerHTML = `<div style="text-align:center; padding:24px; color:#64748b; font-size:13px;">Нічого не знайдено за запитом "${q}"</div>`;
    return;
  }

  elPmGuideList.innerHTML = filtered.map(item => `
    <div class="kb-card" id="${item.id}">
      <div class="kb-card-header">
        <div>
          <div class="kb-card-tag">${item.tag}</div>
          <div class="kb-card-q">${item.q}</div>
          <div class="kb-card-short">${item.short}</div>
        </div>
        <i class="fa-solid fa-chevron-down kb-chevron" style="color:#64748b; transition:transform 0.2s;"></i>
      </div>
      <div class="kb-card-body">
        <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#081942; margin-bottom:4px;">
          💬 Як розказати про це клієнту (готовий скрипт для PM):
        </div>
        <div class="script-bubble">
          ${item.clientScript}
        </div>
        <div style="margin-top:10px; font-size:12px; color:#475569;">
          <strong>Внутрішній коментар агенції:</strong> ${item.details}
        </div>
      </div>
    </div>
  `).join('');

  elPmGuideList.querySelectorAll('.kb-card-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      hdr.parentElement.classList.toggle('open');
    });
  });
}

// 5. Worksection Task Spec Generator
function generateWorksectionSpec() {
  const { totalSetup, totalMonthly, grandTotalFirstMonth } = calculateTotals();
  const client = state.clientName.trim() || 'Новий клієнт';

  let spec = `📌 ПАСПОРТ ПРОЄКТУ / ОПИС ПАКЕТА ДЛЯ WORKSECTION\n`;
  spec += `👤 Клієнт: ${client}\n`;
  spec += `📅 Дата формування: ${new Date().toLocaleDateString('uk-UA')}\n`;
  spec += `⚙️ Статус запуску: ${state.accountStatus === 'new' ? 'Запуск «з нуля»' : 'Діючий кабінет (сетап 0 грн)'}\n\n`;

  spec += `🎯 ПІДКЛЮЧЕНІ КАНАЛИ ТА ТАРИФИ:\n`;
  state.activeChannels.forEach(chId => {
    const ch = CHANNELS[chId];
    const t = ch.tiers[state.tiers[chId] || 'pro'];
    spec += `\n▶ [${ch.name.toUpperCase()}] Тариф: ${t.name} (${formatUah(t.monthlyPrice)}/міс.)\n`;
    spec += `  • Напрямки бізнесу: ${t.limits.streams}\n`;
    spec += `  • Статичні банери: до ${t.limits.staticPlots} сюжетів (формати: ${t.limits.staticFormats} — до ${t.limits.staticFilesTotal} файлів)\n`;
    if (chId === 'meta') {
      spec += `  • Відео клієнта: до ${t.limits.readyVideos} змонтованих роликів (Safe Zones 4:5/9:16/1:1 + плашки. БЕЗ МОНТАЖУ)\n`;
      spec += `  • Лідогенерація: миттєве сповіщення в Telegram через Make\n`;
    } else {
      spec += `  • Відео: завантажує замовник на свій YouTube\n`;
    }
    spec += `  • Звітність: ${t.limits.reporting}\n`;

    // Add-ons for this channel
    const onetimeSelected = ch.addons.onetime.filter(a => state.addons[chId] && state.addons[chId][a.id]);
    const monthlySelected = ch.addons.monthly.filter(a => (a.type === 'counter' ? state.addons[chId] && state.addons[chId][a.id] > 0 : state.addons[chId] && state.addons[chId][a.id]));

    if (onetimeSelected.length > 0 || monthlySelected.length > 0) {
      spec += `  • Активні Add-ons:\n`;
      onetimeSelected.forEach(a => spec += `    + [Разово] ${a.name} (+${formatUah(a.price)})\n`);
      monthlySelected.forEach(a => {
        if (a.type === 'counter') {
          const cnt = state.addons[chId][a.id];
          spec += `    + [Щомісяця] ${a.name} (x${cnt}) (+${formatUah(a.price * cnt)}/міс.)\n`;
        } else {
          spec += `    + [Щомісяця] ${a.name} (+${formatUah(a.price)}/міс.)\n`;
        }
      });
    }
  });

  spec += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  spec += `💰 ЗВЕДЕНІ ФІНАНСОВІ УМОВИ:\n`;
  spec += `• Стартовий платіж (Setup): ${formatUah(totalSetup)}\n`;
  spec += `• Щомісячний ретейнер (Monthly): ${formatUah(totalMonthly)} / місяць\n`;
  spec += `• Всього за перший місяць: ${formatUah(grandTotalFirstMonth)}\n`;

  return spec;
}

// 6. Client Proposal Generator
function generateClientKp() {
  const { totalSetup, totalMonthly, grandTotalFirstMonth } = calculateTotals();
  const client = state.clientName.trim() || 'Клієнт';

  let kp = `💼 КОМЕРЦІЙНА ПРОПОЗИЦІЯ IMREV AGENCY\n`;
  kp += `Для проєкту: ${client}\n\n`;

  kp += `Обрані напрямки просування:\n`;
  state.activeChannels.forEach(chId => {
    const ch = CHANNELS[chId];
    const t = ch.tiers[state.tiers[chId] || 'pro'];
    kp += `✅ ${ch.name} — Пакет ${t.name}\n`;
    kp += `   Обсяг: ${t.limits.streams}; дизайн-стандарт: до ${t.limits.staticPlots} сюжетів у 3 форматах (1:1, 4:5, 9:16 — разом до ${t.limits.staticFilesTotal} файлів щомісяця).\n`;
    if (chId === 'meta') {
      kp += `   Відео: технічна адаптація до ${t.limits.readyVideos} ваших змонтованих роликів під формати стрічки та Stories + оферні плашки.\n`;
      kp += `   Бонус: автоматичне надсилання заявок у Telegram-бота вашого менеджера через Make.\n`;
    }
  });

  kp += `\nВартість послуг агенції:\n`;
  if (state.accountStatus === 'new') {
    kp += `• Разове налаштування та запуск: ${formatUah(totalSetup)}\n`;
  } else {
    kp += `• Стартове налаштування: 0 грн (діючий робочий акаунт)\n`;
    if (totalSetup > 0) kp += `• Разові обрані рішення: ${formatUah(totalSetup)}\n`;
  }
  kp += `• Щомісячний регулярний супровід: ${formatUah(totalMonthly)} / місяць\n`;
  kp += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  kp += `🔥 Разом за перший місяць: ${formatUah(grandTotalFirstMonth)}\n`;
  kp += `(Рекламний бюджет сплачується напряму в кабінети Meta / Google)\n`;

  return kp;
}

// 7. Modal Handlers
function openModal(title, body) {
  elModalTitle.textContent = title;
  elModalBody.innerHTML = body;
  elModal.classList.add('open');
}

elModalClose.addEventListener('click', () => elModal.classList.remove('open'));
elModal.addEventListener('click', (e) => {
  if (e.target === elModal) elModal.classList.remove('open');
});

// 8. Event Listeners
elStatusExisting.addEventListener('click', () => {
  state.accountStatus = 'existing';
  elStatusExisting.classList.add('active');
  elStatusNew.classList.remove('active');
  calculateTotals();
});

elStatusNew.addEventListener('click', () => {
  state.accountStatus = 'new';
  elStatusNew.classList.add('active');
  elStatusExisting.classList.remove('active');
  calculateTotals();
});

elClientName.addEventListener('input', (e) => {
  state.clientName = e.target.value;
});

elPmGuideSearch.addEventListener('input', (e) => {
  state.guideSearch = e.target.value;
  renderPmGuide();
});

elBtnCopyWorksection.addEventListener('click', () => {
  const spec = generateWorksectionSpec();
  navigator.clipboard.writeText(spec).then(() => {
    showToast('Паспорт для Worksection скопійовано!');
  }).catch(() => {
    prompt('Скопіюйте опис для Worksection:', spec);
  });
});

elBtnCopyClientKp.addEventListener('click', () => {
  const kp = generateClientKp();
  navigator.clipboard.writeText(kp).then(() => {
    showToast('КП для клієнта скопійовано!');
  }).catch(() => {
    prompt('Скопіюйте комерційну пропозицію:', kp);
  });
});

// Initial Render
renderChannelCards();
renderModules();
calculateTotals();
renderPmGuide();
