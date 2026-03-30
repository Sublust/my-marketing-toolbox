/* Prototype: static, no dependencies. */

const SEP = " | ";

const SCHEMA = {
  platforms: {
    meta: {
      label: "Meta Ads",
      trackingTemplate:
        "utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}",
      levels: {
        campaign: {
          label: "Campaign",
          template: ["IMR", "META", "objective", "product", "audience", "geo", "dateWithSuffix"],
          fields: [
            {
              key: "objective",
              label: "Ціль (Objective)",
              type: "select",
              required: true,
              options: [
                ["CONV", "CONV — Продажі / Conversions"],
                ["LEAD", "LEAD — Ліди / Lead Gen"],
                ["TRAF", "TRAF — Трафік / Traffic"],
                ["MSG", "MSG — Повідомлення / Messages"],
                ["DPA", "DPA — Каталог / Dynamic Product Ads"],
                ["ENG", "ENG — Взаємодія / Engagement"],
                ["VV", "VV — Перегляди відео / Video Views"],
                ["APP", "APP — Установлення / App Installs"],
                ["AWAR", "AWAR — Впізнаваність / Awareness"],
                ["RCH", "RCH — Охоплення / Reach"],
                ["EVNT", "EVNT — Події / Event Responses"],
                ["LIKE", "LIKE — Лайки сторінки / Page Likes"],
                ["STOR", "STOR — Store Traffic"],
              ],
              hint: "Уникаємо SALE (продажі = CONV або DPA).",
            },
            {
              key: "product",
              label: "Продукт / Оффер (Product)",
              type: "text",
              required: true,
              placeholder: "Leggings / Audit / BF26 / Pixel10 / HomeDecor",
              hint: "Коротко, без пробілів. CamelCase або _ якщо 2 слова.",
            },
            {
              key: "audience",
              label: "Аудиторія (Global)",
              type: "select",
              required: true,
              options: [
                ["COLD", "COLD — холодна"],
                ["RET", "RET — ретаргет"],
                ["HOT", "HOT — гарячий ретаргет"],
                ["BROAD", "BROAD — широка"],
                ["INT", "INT — інтереси"],
                ["LAL", "LAL — lookalike"],
                ["ASC", "ASC — Advantage+ Shopping"],
                ["APC", "APC — Advantage+ App"],
                ["ACQ", "ACQ — acquisition (як альтернатива COLD)"],
                ["WARM", "WARM — як альтернатива RET"],
              ],
            },
            {
              key: "geo",
              label: "Гео (ISO)",
              type: "text",
              required: true,
              placeholder: "UA / PL / US / WW",
              hint: "ISO Alpha-2. Для локалу можна KYV/KHM/LVI (як у PDF).",
            },
            {
              key: "dateWithSuffix",
              label: "Дата + суфікси",
              type: "dateSuffix",
              required: true,
            },
          ],
        },
        adset: {
          label: "Ad Set",
          template: ["targetingType", "categoryAudience", "geoOpt", "placementAgeOpt", "date"],
          fields: [
            {
              key: "targetingType",
              label: "Тип таргетингу (Targeting Type)",
              type: "select",
              required: true,
              options: [
                ["ADV+", "ADV+ — Advantage+ Audience"],
                ["ADV+INT", "ADV+INT — Advantage+ з інтересами"],
                ["ADV+LAL", "ADV+LAL — Advantage+ з LAL"],
                ["ADV+CUST", "ADV+CUST — Advantage+ з базами"],
                ["BROAD", "BROAD — широка"],
                ["INT", "INT — інтереси"],
                ["LAL", "LAL — lookalike"],
                ["RET", "RET — ретаргет"],
              ],
            },
            {
              key: "categoryAudience",
              label: "Категорія_Аудиторія (Category/Audience)",
              type: "text",
              required: true,
              placeholder: "PlusSize_Coats / Purch_1% / SiteVis_30d / RealEstate",
              hint: "E-com: категорія. Для баз/LAL: Purch_1%, SiteVis_30d.",
            },
            {
              key: "geoOpt",
              label: "Гео (опціонально)",
              type: "text",
              required: false,
              placeholder: "KHM+20km / Lviv_Center / LavinaMall",
            },
            {
              key: "placementAgeOpt",
              label: "Плейсмент_Вік (опц., тільки якщо тест)",
              type: "text",
              required: false,
              placeholder: "IG_Stories_F25-45 / THR / F25-45",
              hint: "Якщо налаштування стандартні — пропустіть.",
            },
            { key: "date", label: "Дата створення", type: "date", required: true },
          ],
        },
        ad: {
          label: "Ad",
          template: ["format", "conceptId", "productModel", "offerOpt", "date"],
          fields: [
            {
              key: "format",
              label: "Формат (Format)",
              type: "select",
              required: true,
              options: [
                ["IMG", "IMG — статичне"],
                ["VID", "VID — відео"],
                ["CAR", "CAR — карусель"],
                ["COL", "COL — collection"],
                ["DPA", "DPA — каталог"],
              ],
            },
            {
              key: "conceptId",
              label: "Концепт_ID (Concept / Creative ID)",
              type: "text",
              required: true,
              placeholder: "UGC_Review / Motion_01 / CR01 / Founder",
            },
            {
              key: "productModel",
              label: "Товар_Модель (Product/Model)",
              type: "text",
              required: true,
              placeholder: "Dress_Zara / Sneakers_Air / Septic_5m3",
            },
            {
              key: "offerOpt",
              label: "Оффер (опціонально)",
              type: "text",
              required: false,
              placeholder: "Disc15 / FreeShip / Benefits / Pain",
            },
            { key: "date", label: "Дата завантаження", type: "date", required: true },
          ],
        },
      },
    },

    tiktok: {
      label: "TikTok Ads",
      trackingTemplate:
        "utm_source=tiktok&utm_medium=cpc&utm_campaign=__CAMPAIGN_NAME__&utm_content=__AID_NAME__&utm_term=__CID_NAME__",
      levels: {
        campaign: {
          label: "Campaign",
          template: ["IMR", "TT", "objective", "product", "audience", "geo", "dateWithSuffix"],
          fields: [
            {
              key: "objective",
              label: "Ціль (Objective)",
              type: "select",
              required: true,
              options: [
                ["CONV", "CONV — Web Conversions"],
                ["LEAD", "LEAD — Lead Generation"],
                ["TRAF", "TRAF — Traffic"],
                ["APP", "APP — App Installs"],
                ["VV", "VV — Video Views"],
                ["COMM", "COMM — Community Interaction"],
              ],
              hint: "Уникаємо SALE (як у PDF).",
            },
            {
              key: "product",
              label: "Продукт (Product)",
              type: "text",
              required: true,
              placeholder: "Sneakers / Consult / BlackFriday",
            },
            {
              key: "audience",
              label: "Аудиторія (стратегія)",
              type: "select",
              required: true,
              options: [
                ["COLD", "COLD — холодна"],
                ["RET", "RET — ретаргет"],
                ["BROAD", "BROAD — широка"],
                ["SPC", "SPC — Smart Performance Campaign"],
              ],
            },
            {
              key: "geo",
              label: "Гео (ISO)",
              type: "text",
              required: true,
              placeholder: "UA / US / PL / WW",
            },
            { key: "dateWithSuffix", label: "Дата + суфікси", type: "dateSuffix", required: true },
          ],
        },
        adgroup: {
          label: "Ad Group",
          template: ["targetingType", "categoryAudience", "geoOpt", "placementAgeOpt", "date"],
          fields: [
            {
              key: "targetingType",
              label: "Тип таргетингу (Targeting Type)",
              type: "select",
              required: true,
              options: [
                ["SPC", "SPC — Smart Performance"],
                ["ACO_BROAD", "ACO_BROAD — ACO на широку"],
                ["ACO_INT", "ACO_INT — ACO на інтереси"],
                ["BROAD", "BROAD — широка"],
                ["INT", "INT — інтереси"],
                ["HT", "HT — hashtags"],
                ["CREA", "CREA — creator interactions"],
                ["LAL", "LAL — lookalike"],
                ["RET", "RET — ретаргет/бази"],
              ],
            },
            {
              key: "categoryAudience",
              label: "Категорія_Аудиторія (Category/Audience)",
              type: "text",
              required: true,
              placeholder: "Streetwear / Open / BookTok / Purch_1%",
              hint: 'Для BROAD/SPC: "Open" або категорія. Для HT: BookTok.',
            },
            {
              key: "geoOpt",
              label: "Гео (опціонально)",
              type: "text",
              required: false,
              placeholder: "KYV+10km",
            },
            {
              key: "placementAgeOpt",
              label: "Плейсмент/Вік (опц., тільки якщо тест)",
              type: "text",
              required: false,
              placeholder: "TT_F18-24 / PANGLE / ALL18+",
              hint: "Приклад: TT_F18-24. Плейсмент: AUTO/TT/PANGLE.",
            },
            { key: "date", label: "Дата створення", type: "date", required: true },
          ],
        },
        ad: {
          label: "Ad",
          template: ["format", "conceptId", "productModel", "offerOpt", "date"],
          fields: [
            {
              key: "format",
              label: "Формат (Format)",
              type: "select",
              required: true,
              options: [
                ["VID", "VID — завантажене відео (dark post)"],
                ["SPARK", "SPARK — Spark Ad (органічне)"],
                ["CAR", "CAR — карусель"],
                ["PLAY", "PLAY — playable ads"],
              ],
            },
            {
              key: "conceptId",
              label: "Концепт_ID (Concept / Creative ID)",
              type: "text",
              required: true,
              placeholder: "UGC_Trend / CR01 / Unpacking / Review",
            },
            {
              key: "productModel",
              label: "Товар_Модель (Product/Model)",
              type: "text",
              required: true,
              placeholder: "Dress_Zara / Sneakers_Air / Septic_5m3",
            },
            {
              key: "offerOpt",
              label: "Оффер (опціонально)",
              type: "text",
              required: false,
              placeholder: "PromoCode / Disc20 / FreeDelivery",
            },
            { key: "date", label: "Дата завантаження", type: "date", required: true },
          ],
        },
      },
    },

    google: {
      label: "Google Ads",
      trackingTemplate:
        "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}",
      levels: {
        campaign: {
          label: "Campaign",
          template: [
            "IMR",
            "GADS",
            "objective",
            "campaignType",
            "product",
            "traffic",
            "geo",
            "dateWithSuffix",
          ],
          fields: [
            {
              key: "objective",
              label: "Ціль (Objective)",
              type: "select",
              required: true,
              options: [
                ["CONV", "CONV — Продажі / E-commerce"],
                ["LEAD", "LEAD — Ліди"],
                ["TRAF", "TRAF — Трафік"],
                ["AWAR", "AWAR — Впізнаваність/Охоплення"],
                ["APP", "APP — Додатки"],
                ["LOCAL", "LOCAL — Локальні візити"],
              ],
              hint: "Уникаємо SALE (як у PDF).",
            },
            {
              key: "campaignType",
              label: "Тип кампанії (Campaign Type)",
              type: "select",
              required: true,
              options: [
                ["SRCH", "SRCH — Search"],
                ["PMAX", "PMAX — Performance Max"],
                ["VID", "VID — YouTube / Video"],
                ["DISP", "DISP — Display / GDN"],
                ["SHOP", "SHOP — Standard Shopping"],
                ["DEM", "DEM — Demand Gen"],
                ["APP", "APP — App Campaigns"],
              ],
            },
            {
              key: "product",
              label: "Продукт / Категорія (Product)",
              type: "text",
              required: true,
              placeholder: "Audit / Leggings / Brand_Puma / AllProducts",
            },
            {
              key: "traffic",
              label: "Характер трафіку (Traffic/Audience)",
              type: "select",
              required: true,
              options: [
                ["BRAND", "BRAND — брендовий"],
                ["GEN", "GEN — generic"],
                ["COMP", "COMP — конкуренти"],
                ["PROMO", "PROMO — розпродаж/акція"],
                ["REM", "REM — ремаркетинг"],
                ["NEW", "NEW — new customer acquisition"],
              ],
            },
            {
              key: "geo",
              label: "Гео (ISO/місто)",
              type: "text",
              required: true,
              placeholder: "UA / US / PL / WW / KYV / KHM",
            },
            { key: "dateWithSuffix", label: "Дата + суфікси", type: "dateSuffix", required: true },
          ],
        },
        group: {
          label: "Ad Group / Asset Group",
          template: ["googleGroup"],
          fields: [
            {
              key: "googleGroupMode",
              label: "Тип логіки для групи (за типом кампанії)",
              type: "select",
              required: true,
              options: [
                ["SRCH_PMAX", "SRCH / PMAX — напрямок або категорія"],
                ["VID_DISP", "VID / DISP — тип таргетингу | деталізація"],
                ["SHOP", "SHOP — критерій | значення"],
                ["DEM", "DEM — тема креативів | тип аудиторії"],
                ["APP", "APP — тема об'єктів | концепт"],
              ],
              hint: "Логіка відповідає розділу Google Ads у PDF.",
            },

            {
              key: "srchPmaxCategory",
              label: "Напрямок / Категорія",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "SRCH_PMAX",
              showIf: (v) => v.googleGroupMode === "SRCH_PMAX",
              placeholder: "Brand_Puma / Competitors_Nike / Buy_Sneakers / Mens_Sneakers",
              hint: "Для SRCH/PMAX показуємо лише напрямок/категорію.",
            },

            {
              key: "vidDispTargeting",
              label: "Тип таргетингу",
              type: "select",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "VID_DISP",
              showIf: (v) => v.googleGroupMode === "VID_DISP",
              options: [
                ["PLAC", "PLAC — плейсменти"],
                ["INT", "INT — інтереси / in-market"],
                ["AFF", "AFF — affinity"],
                ["TOPIC", "TOPIC — тематики"],
                ["KW", "KW — ключові слова"],
                ["CUST", "CUST — CRM списки"],
              ],
            },
            {
              key: "vidDispDetail",
              label: "Деталізація",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "VID_DISP",
              showIf: (v) => v.googleGroupMode === "VID_DISP",
              placeholder: "Marketing_Channels / Real_Estate_Buyers",
              hint: 'Збирається як "TYPE | Detail".',
            },

            {
              key: "shopCriterion",
              label: "Критерій поділу",
              type: "select",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "SHOP",
              showIf: (v) => v.googleGroupMode === "SHOP",
              options: [
                ["Category", "Category — категорія"],
                ["Brand", "Brand — бренд"],
                ["Label", "Label — custom label"],
                ["All", "All — усі товари"],
              ],
            },
            {
              key: "shopValue",
              label: "Значення",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "SHOP",
              showIf: (v) => v.googleGroupMode === "SHOP",
              placeholder: "High_Margin / Nike / Mens_Sneakers",
              hint: 'Збирається як "Criterion | Value".',
            },

            {
              key: "demTheme",
              label: "Тема креативів",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "DEM",
              showIf: (v) => v.googleGroupMode === "DEM",
              placeholder: "Video_Reviews / Carousel_TopSellers",
            },
            {
              key: "demAudience",
              label: "Тип аудиторії",
              type: "select",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "DEM",
              showIf: (v) => v.googleGroupMode === "DEM",
              options: [
                ["LAL_Narrow", "LAL_Narrow — 2.5%"],
                ["LAL_Bal", "LAL_Bal — 5%"],
                ["LAL_Broad", "LAL_Broad — 10%"],
                ["RET_30d", "RET_30d — ремаркетинг"],
              ],
              hint: 'Збирається як "Theme | Audience".',
            },

            {
              key: "appTheme",
              label: "Тема об'єктів",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "APP",
              showIf: (v) => v.googleGroupMode === "APP",
              placeholder: "Gameplay / Interface / Features",
            },
            {
              key: "appConcept",
              label: "Концепт",
              type: "text",
              required: false,
              requiredIf: (v) => v.googleGroupMode === "APP",
              showIf: (v) => v.googleGroupMode === "APP",
              placeholder: "HardLevel_Video / DarkMode_Screenshots",
              hint: 'Збирається як "Theme | Concept".',
            },
          ],
        },
        asset: {
          label: "Ad / Asset (Video/Display/Demand Gen)",
          template: ["format", "conceptAngle", "offer", "date"],
          fields: [
            {
              key: "format",
              label: "Формат (Format)",
              type: "select",
              required: true,
              options: [
                ["RDA", "RDA — Responsive Display Ad"],
                ["IMG", "IMG — статичний банер"],
                ["HTML5", "HTML5 — анімований банер"],
                ["SKIP", "SKIP — In-Stream skippable"],
                ["BUMP", "BUMP — Bumper 6s"],
                ["SHORTS", "SHORTS — YouTube Shorts"],
              ],
            },
            {
              key: "conceptAngle",
              label: "Концепт/Кут (Concept/Angle)",
              type: "text",
              required: true,
              placeholder: "USP / Pain / SocialProof / Founder / UGC / Motion",
            },
            {
              key: "offer",
              label: "Оффер (Offer)",
              type: "text",
              required: true,
              placeholder: "Disc20 / FreeDelivery / LeadMagnet / Reg",
            },
            { key: "date", label: "Дата створення", type: "date", required: true },
          ],
        },
      },
    },
  },
};

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

function todayYYMMDD() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function normalizeLatinish(s) {
  return String(s ?? "").trim();
}

function isLatinAllowed(s) {
  // Allow: A-Z a-z 0-9 space underscore plus percent dash dot and pipes (for user input blocks)
  // Disallow: Cyrillic and most non-ASCII letters.
  return !/[А-Яа-яЁёІіЇїЄєҐґ]/.test(s);
}

function joinSegments(segments) {
  return segments.filter((x) => x != null && String(x).trim() !== "").join(SEP);
}

function safeValue(state, key) {
  const v = state[key];
  if (v == null) return "";
  return String(v).trim();
}

function setClipboard(text) {
  const v = String(text ?? "");
  if (!v) return Promise.resolve(false);
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(v).then(() => true, () => false);
  // fallback
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.style.position = "fixed";
  ta.style.left = "-1000px";
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve(!!ok);
  } catch {
    document.body.removeChild(ta);
    return Promise.resolve(false);
  }
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(c);
  return node;
}

function shouldShowField(field, values) {
  if (typeof field.showIf === "function") {
    try {
      return !!field.showIf(values);
    } catch {
      return true;
    }
  }
  return true;
}

function isFieldRequired(field, values) {
  if (typeof field.requiredIf === "function") {
    try {
      return !!field.requiredIf(values);
    } catch {
      return !!field.required;
    }
  }
  return !!field.required;
}

// ---------- Field renderers ----------
function renderField(field, state, onChange) {
  const wrap = el("label", { class: "field" });

  const labelRow = el("span", { class: "field__label" });
  labelRow.appendChild(el("span", { text: field.label }));
  if (field.hint) labelRow.appendChild(el("span", { class: "field__hint", text: field.hint }));
  wrap.appendChild(labelRow);

  const key = field.key;

  if (field.type === "select") {
    const sel = el("select", { class: "input" });
    for (const [value, label] of field.options) {
      sel.appendChild(el("option", { value, text: label }));
    }
    if (state[key]) sel.value = state[key];
    sel.addEventListener("change", () => onChange(key, sel.value));
    wrap.appendChild(sel);
    return wrap;
  }

  if (field.type === "text") {
    const inp = el("input", {
      class: "input",
      type: "text",
      placeholder: field.placeholder ?? "",
      value: state[key] ?? "",
      autocomplete: "off",
      spellcheck: "false",
    });
    inp.addEventListener("input", () => onChange(key, inp.value));
    wrap.appendChild(inp);
    return wrap;
  }

  if (field.type === "date") {
    const inp = el("input", {
      class: "input input--mono",
      type: "text",
      inputmode: "numeric",
      maxlength: "6",
      placeholder: "YYMMDD",
      value: state[key] ?? todayYYMMDD(),
      autocomplete: "off",
      spellcheck: "false",
    });
    inp.addEventListener("input", () => onChange(key, inp.value));
    wrap.appendChild(inp);
    return wrap;
  }

  if (field.type === "dateSuffix") {
    const box = el("div", { class: "fields" });

    const date = el("input", {
      class: "input input--mono",
      type: "text",
      inputmode: "numeric",
      maxlength: "6",
      placeholder: "YYMMDD",
      value: state.date ?? todayYYMMDD(),
      autocomplete: "off",
      spellcheck: "false",
    });
    date.addEventListener("input", () => onChange("date", date.value));

    const suffix = el("input", {
      class: "input input--mono",
      type: "text",
      placeholder: "_v2 / _CBO / _tCPA / _UPD260330",
      value: state.suffix ?? "",
      autocomplete: "off",
      spellcheck: "false",
    });
    suffix.addEventListener("input", () => onChange("suffix", suffix.value));

    box.appendChild(
      el("label", { class: "field" }, [
        el("span", { class: "field__label" }, [el("span", { text: "Дата (YYMMDD)" })]),
        date,
      ])
    );
    box.appendChild(
      el("label", { class: "field" }, [
        el("span", { class: "field__label" }, [
          el("span", { text: "Суфікс (опц.)" }),
          el("span", {
            class: "field__hint",
            text: "Для дублів/тестів: _v2 / _CBO. Форс-мажор: _UPD + дата змін.",
          }),
        ]),
        suffix,
      ])
    );

    wrap.appendChild(box);
    return wrap;
  }

  // fallback
  wrap.appendChild(el("div", { class: "note", text: `Невідомий тип поля: ${field.type}` }));
  return wrap;
}

// ---------- Generator ----------
function computeSegments(platformKey, levelKey, state) {
  const platform = SCHEMA.platforms[platformKey];
  const level = platform.levels[levelKey];

  const googleGroup = (() => {
    if (platformKey !== "google" || levelKey !== "group") return "";
    const mode = safeValue(state, "googleGroupMode");

    if (mode === "SRCH_PMAX") {
      return normalizeTokenLoose(safeValue(state, "srchPmaxCategory"));
    }

    if (mode === "VID_DISP") {
      const t = safeValue(state, "vidDispTargeting");
      const d = normalizeTokenLoose(safeValue(state, "vidDispDetail"));
      return joinSegments([t, d]).replaceAll(SEP, " | ");
    }

    if (mode === "SHOP") {
      const c = safeValue(state, "shopCriterion");
      const v = normalizeTokenLoose(safeValue(state, "shopValue"));
      return joinSegments([c, v]).replaceAll(SEP, " | ");
    }

    if (mode === "DEM") {
      const theme = normalizeTokenLoose(safeValue(state, "demTheme"));
      const aud = safeValue(state, "demAudience");
      return joinSegments([theme, aud]).replaceAll(SEP, " | ");
    }

    if (mode === "APP") {
      const theme = normalizeTokenLoose(safeValue(state, "appTheme"));
      const concept = normalizeTokenLoose(safeValue(state, "appConcept"));
      return joinSegments([theme, concept]).replaceAll(SEP, " | ");
    }

    // fallback: allow manual text if someone typed it
    return normalizeGroupPattern(safeValue(state, "groupPattern"));
  })();

  const m = {
    IMR: "IMR",
    META: "META",
    TT: "TT",
    GADS: "GADS",
    googleGroup,
    dateWithSuffix: (() => {
      const d = safeValue(state, "date") || todayYYMMDD();
      const suf = safeValue(state, "suffix");
      return d + (suf ? normalizeSuffix(suf) : "");
    })(),
    date: normalizeDate(safeValue(state, "date") || todayYYMMDD()),
    geoOpt: safeValue(state, "geoOpt"),
    placementAgeOpt: safeValue(state, "placementAgeOpt"),
    offerOpt: safeValue(state, "offerOpt"),
  };

  // pass-through fields
  for (const f of Object.keys(state)) m[f] = safeValue(state, f);

  // normalize some common fields
  if (m.geo) m.geo = normalizeGeo(m.geo);
  if (m.product) m.product = normalizeToken(m.product);
  if (m.categoryAudience) m.categoryAudience = normalizeToken(m.categoryAudience);
  if (m.productModel) m.productModel = normalizeToken(m.productModel);
  if (m.conceptId) m.conceptId = normalizeToken(m.conceptId);
  if (m.groupPattern) m.groupPattern = normalizeGroupPattern(m.groupPattern);
  if (m.conceptAngle) m.conceptAngle = normalizeToken(m.conceptAngle);
  if (m.offer) m.offer = normalizeToken(m.offer);
  if (m.placementAgeOpt) m.placementAgeOpt = normalizeTokenLoose(m.placementAgeOpt);
  if (m.geoOpt) m.geoOpt = normalizeTokenLoose(m.geoOpt);

  const segments = level.template.map((k) => m[k]);
  return segments;
}

function normalizeToken(s) {
  return normalizeLatinish(s).replace(/\s+/g, "");
}

function normalizeTokenLoose(s) {
  // keep + and _ and - and digits, remove leading/trailing spaces
  return normalizeLatinish(s).replace(/\s+/g, "");
}

function normalizeSuffix(s) {
  const v = normalizeLatinish(s);
  if (!v) return "";
  return v.startsWith("_") ? v : `_${v}`;
}

function normalizeGeo(s) {
  const v = normalizeLatinish(s);
  if (!v) return "";
  return v.toUpperCase();
}

function normalizeDate(s) {
  const v = normalizeLatinish(s);
  return v;
}

function normalizeGroupPattern(s) {
  // Google groups sometimes use "TYPE | Detail". We won't strip pipes here; just trim.
  return normalizeLatinish(s);
}

function validate(platformKey, levelKey, state) {
  const platform = SCHEMA.platforms[platformKey];
  const level = platform.levels[levelKey];

  const issues = [];

  const allValues = Object.values(state).filter((x) => x != null).map(String).join(" ");
  if (!isLatinAllowed(allValues)) {
    issues.push({ type: "bad", title: "Лише латиниця", text: "Знайдено кирилицю. Стандарт вимагає лише латиницю." });
  } else {
    issues.push({ type: "good", title: "Латиниця", text: "Ок." });
  }

  // required fields
  for (const f of level.fields) {
    if (!shouldShowField(f, state)) continue;
    if (!isFieldRequired(f, state)) continue;
    if (f.type === "dateSuffix") {
      const d = safeValue(state, "date");
      if (!d) issues.push({ type: "bad", title: "Дата", text: "Дата обов'язкова (YYMMDD)." });
      continue;
    }
    const v = safeValue(state, f.key);
    if (!v) issues.push({ type: "bad", title: "Обов'язкове поле", text: `Заповніть: ${f.label}` });
  }

  // date format
  const d = safeValue(state, "date") || "";
  if (d && !/^\d{6}$/.test(d)) {
    issues.push({ type: "warn", title: "Формат дати", text: "Рекомендовано YYMMDD (6 цифр), напр. 260330." });
  }

  // suffix sanity
  const suf = safeValue(state, "suffix");
  if (suf && /[^\w\-]/.test(suf.replace(/^_/, ""))) {
    issues.push({ type: "warn", title: "Суфікс", text: "Суфікс краще робити з латиниці/цифр/_/-." });
  }

  // separator reminder
  issues.push({
    type: "good",
    title: "Роздільник",
    text: `Фінальна назва буде зібрана через "${SEP}".`,
  });

  return issues;
}

function renderHints(issues) {
  const wrap = $("resultHints");
  wrap.innerHTML = "";
  for (const it of issues) {
    const cls = it.type === "bad" ? "hint hint--bad" : it.type === "warn" ? "hint hint--warn" : "hint hint--good";
    wrap.appendChild(
      el("div", { class: cls }, [
        el("div", { class: "hint__badge", text: (it.type || "info").toUpperCase() }),
        el("div", {}, [el("div", { style: "font-weight:700; margin-bottom:2px;", text: it.title }), el("div", { text: it.text })]),
      ])
    );
  }
}

// ---------- App state ----------
const state = {
  platform: "meta",
  level: "campaign",
  values: {},
};

function getCurrentLevelKeys() {
  return Object.keys(SCHEMA.platforms[state.platform].levels);
}

function setDefaultsFor(platformKey, levelKey) {
  const level = SCHEMA.platforms[platformKey].levels[levelKey];
  const v = {};

  for (const f of level.fields) {
    if (f.type === "select") v[f.key] = f.options[0]?.[0] ?? "";
    if (f.type === "date") v[f.key] = todayYYMMDD();
    if (f.type === "dateSuffix") {
      v.date = todayYYMMDD();
      v.suffix = "";
    }
  }

  // sensible defaults
  if (platformKey === "meta" && levelKey === "campaign") {
    v.objective = "CONV";
    v.audience = "COLD";
    v.geo = "UA";
  }
  if (platformKey === "tiktok" && levelKey === "campaign") {
    v.objective = "CONV";
    v.audience = "SPC";
    v.geo = "UA";
  }
  if (platformKey === "google" && levelKey === "campaign") {
    v.objective = "LEAD";
    v.campaignType = "SRCH";
    v.traffic = "GEN";
    v.geo = "UA";
  }

  if (platformKey === "google" && levelKey === "group") {
    v.googleGroupMode = "SRCH_PMAX";
    v.srchPmaxCategory = "Buy_Sneakers";
    v.vidDispTargeting = "INT";
    v.vidDispDetail = "Real_Estate_Buyers";
    v.shopCriterion = "Label";
    v.shopValue = "High_Margin";
    v.demTheme = "Video_Reviews";
    v.demAudience = "LAL_Narrow";
    v.appTheme = "Interface";
    v.appConcept = "DarkMode_Screenshots";
  }

  state.values = v;
}

function hydrateLevels() {
  const platform = SCHEMA.platforms[state.platform];
  const levelSel = $("level");
  levelSel.innerHTML = "";
  for (const [k, v] of Object.entries(platform.levels)) {
    levelSel.appendChild(el("option", { value: k, text: v.label }));
  }
  levelSel.value = state.level;
}

function renderFields() {
  const platform = SCHEMA.platforms[state.platform];
  const level = platform.levels[state.level];
  const root = $("fields");
  root.innerHTML = "";

  for (const f of level.fields) {
    if (!shouldShowField(f, state.values)) continue;
    root.appendChild(
      renderField(f, state.values, (key, value) => {
        state.values[key] = value;
        updateResult();
      })
    );
  }
}

function updateResult() {
  const platform = SCHEMA.platforms[state.platform];
  const segments = computeSegments(state.platform, state.level, state.values);
  $("resultName").value = joinSegments(segments);
  $("resultTracking").value = platform.trackingTemplate;

  const issues = validate(state.platform, state.level, state.values);
  renderHints(issues);
}

// ---------- Events ----------
function init() {
  const platformSel = $("platform");
  platformSel.value = state.platform;

  platformSel.addEventListener("change", () => {
    state.platform = platformSel.value;
    // pick first level by default
    state.level = Object.keys(SCHEMA.platforms[state.platform].levels)[0];
    hydrateLevels();
    setDefaultsFor(state.platform, state.level);
    renderFields();
    updateResult();
  });

  $("level").addEventListener("change", () => {
    state.level = $("level").value;
    setDefaultsFor(state.platform, state.level);
    renderFields();
    updateResult();
  });

  $("btnCopyName").addEventListener("click", async () => {
    const ok = await setClipboard($("resultName").value);
    $("btnCopyName").textContent = ok ? "Copied" : "Copy";
    setTimeout(() => ($("btnCopyName").textContent = "Copy"), 900);
  });

  $("btnCopyTracking").addEventListener("click", async () => {
    const ok = await setClipboard($("resultTracking").value);
    $("btnCopyTracking").textContent = ok ? "Copied" : "Copy";
    setTimeout(() => ($("btnCopyTracking").textContent = "Copy"), 900);
  });

  $("btnReset").addEventListener("click", () => {
    setDefaultsFor(state.platform, state.level);
    renderFields();
    updateResult();
  });

  // Quick chips
  $("chipMetaConv").addEventListener("click", () => {
    state.platform = "meta";
    state.level = "campaign";
    $("platform").value = state.platform;
    hydrateLevels();
    $("level").value = state.level;
    setDefaultsFor(state.platform, state.level);
    state.values.product = "Leggings";
    state.values.audience = "COLD";
    state.values.geo = "UA";
    renderFields();
    updateResult();
  });
  $("chipTikTokConv").addEventListener("click", () => {
    state.platform = "tiktok";
    state.level = "campaign";
    $("platform").value = state.platform;
    hydrateLevels();
    $("level").value = state.level;
    setDefaultsFor(state.platform, state.level);
    state.values.product = "Sneakers";
    state.values.audience = "SPC";
    state.values.geo = "UA";
    renderFields();
    updateResult();
  });
  $("chipGoogleLeadSearch").addEventListener("click", () => {
    state.platform = "google";
    state.level = "campaign";
    $("platform").value = state.platform;
    hydrateLevels();
    $("level").value = state.level;
    setDefaultsFor(state.platform, state.level);
    state.values.product = "Audit";
    state.values.traffic = "GEN";
    state.values.geo = "UA";
    renderFields();
    updateResult();
  });

  // initial
  hydrateLevels();
  setDefaultsFor(state.platform, state.level);
  renderFields();
  updateResult();
}

document.addEventListener("DOMContentLoaded", init);

