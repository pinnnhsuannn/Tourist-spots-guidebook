/**
 * 旅遊景點統整小幫手 (Travel Journal Guide)
 * 交互邏輯：搜尋、標籤篩選、3D 手帳卡片翻轉
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化資料
  const spots = Array.isArray(window.SPOTS_DATA) ? window.SPOTS_DATA : [];
  
  // 狀態管理
  let searchQuery = '';
  let activeRegion = 'ALL';
  let activeCategory = 'ALL';

  // DOM 節點
  const searchInput = document.getElementById('searchInput');
  const regionTabsContainer = document.getElementById('regionTabs');
  const categoryTabsContainer = document.getElementById('categoryTabs');
  const spotsGrid = document.getElementById('spotsGrid');
  const countDisplay = document.getElementById('countDisplay');
  const resetBtn = document.getElementById('resetBtn');

  // 可愛手繪風地圖座標 SVG
  const cutePinSVG = `
    <svg class="cute-pin-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  // HTML 逸出防護
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 2. 初始化篩選標籤
  function initFilters() {
    // 取得所有地區（不重複）
    const regions = ['ALL', ...new Set(spots.map(s => s.region).filter(Boolean))];
    regionTabsContainer.innerHTML = regions.map(reg => `
      <button class="tab-btn ${reg === activeRegion ? 'active' : ''}" data-region="${escapeHTML(reg)}">
        ${reg === 'ALL' ? '全部地區' : escapeHTML(reg)}
      </button>
    `).join('');

    // 取得所有分類主題標籤（不重複）
    const allCategories = spots.flatMap(s => s.category || []);
    const categories = ['ALL', ...new Set(allCategories.filter(Boolean))];
    categoryTabsContainer.innerHTML = categories.map(cat => `
      <button class="tab-btn ${cat === activeCategory ? 'active' : ''}" data-cat="${escapeHTML(cat)}">
        ${cat === 'ALL' ? '全部分類' : escapeHTML(cat)}
      </button>
    `).join('');

    // 綁定地區切換事件
    regionTabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeRegion = btn.dataset.region;
        updateTabActiveStates(regionTabsContainer, 'region', activeRegion);
        renderSpots();
      });
    });

    // 綁定分類切換事件
    categoryTabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        updateTabActiveStates(categoryTabsContainer, 'cat', activeCategory);
        renderSpots();
      });
    });
  }

  function updateTabActiveStates(container, dataAttr, currentValue) {
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset[dataAttr] === currentValue);
    });
  }

  // 3. 核心過濾運算
  function getFilteredSpots() {
    return spots.filter(spot => {
      // 關鍵字搜尋過濾 (名稱、特色、筆記、標籤、避坑提醒)
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        (spot.name && spot.name.toLowerCase().includes(query)) ||
        (spot.highlight && spot.highlight.toLowerCase().includes(query)) ||
        (spot.description && spot.description.toLowerCase().includes(query)) ||
        (spot.tips && spot.tips.toLowerCase().includes(query)) ||
        (spot.region && spot.region.toLowerCase().includes(query)) ||
        (spot.category && spot.category.some(c => c.toLowerCase().includes(query)));

      // 地區過濾
      const matchRegion = activeRegion === 'ALL' || spot.region === activeRegion;

      // 分類過濾
      const matchCategory = activeCategory === 'ALL' || (spot.category && spot.category.includes(activeCategory));

      return matchSearch && matchRegion && matchCategory;
    });
  }

  // 4. 畫面渲染
  function renderSpots() {
    const filtered = getFilteredSpots();

    // 更新計數顯示
    countDisplay.textContent = `顯示 ${filtered.length} / 共 ${spots.length} 個手帳景點`;

    if (filtered.length === 0) {
      spotsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📖</div>
          <p>手帳裡還沒有找到符合條件的景點筆記呢！</p>
          <p style="font-size: 0.82rem; margin-top: 6px; color: var(--text-muted);">試試搜尋其他關鍵字或重設篩選條件～</p>
        </div>
      `;
      return;
    }

    spotsGrid.innerHTML = filtered.map((spot, index) => {
      const hasImage = spot.images && spot.images.length > 0 && spot.images[0].trim() !== '';
      const imageUrl = hasImage ? spot.images[0] : '';
      const imageCreditText = hasImage 
        ? (spot.imageCredit ? escapeHTML(spot.imageCredit) : '') 
        : '(照片待補上)';

      const tagsHTML = (spot.category || [])
        .map(cat => `<span class="cat-pill">#${escapeHTML(cat)}</span>`)
        .join('');

      return `
        <div class="journal-card" id="card-${escapeHTML(spot.id || index)}">
          <div class="card-inner">
            
            <!-- 正面：拍立得照片與亮點簡介 -->
            <div class="card-front">
              <div class="polaroid-frame">
                <div class="washi-tape"></div>
                <div class="spot-image-box">
                  ${hasImage ? `
                    <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(spot.name)}" class="spot-image" loading="lazy" onerror="if(this.src.indexOf('assets/images/')!==-1){this.src='./'+this.src.split('/').pop();}">
                  ` : `
                    <div class="spot-image-placeholder">
                      <div class="placeholder-icon">📷</div>
                      <div class="placeholder-text">照片待補上</div>
                      <div class="placeholder-sub">日後可隨時記錄美好回憶</div>
                    </div>
                  `}
                </div>
                ${imageCreditText ? `<div class="image-credit">${imageCreditText}</div>` : ''}
              </div>

              <div class="spot-meta-region">
                ${cutePinSVG}
                <span>${escapeHTML(spot.region)}</span>
              </div>

              <h3 class="spot-title">${escapeHTML(spot.name)}</h3>
              <p class="spot-highlight">${escapeHTML(spot.highlight)}</p>

              <div class="category-tags">
                ${tagsHTML}
              </div>

              <div class="flip-action-bar">
                <span style="font-size: 0.76rem; color: var(--text-muted);">收錄於 ${escapeHTML(spot.createdAt || '近期')}</span>
                <button class="flip-btn" onclick="toggleFlip('card-${escapeHTML(spot.id || index)}')">
                  翻看攻略手札 ↻
                </button>
              </div>
            </div>

            <!-- 背面：深度攻略手帳內頁 -->
            <div class="card-back">
              <div class="journal-back-header">
                <div class="journal-back-title">
                  <span>📝</span>
                  <span>${escapeHTML(spot.name)}・手帳筆記</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(spot.region)}</div>
              </div>

              <div class="journal-note-body">
                ${escapeHTML(spot.description)}
              </div>

              <div class="info-guide-list">
                ${spot.ticket ? `
                  <div class="guide-item">
                    <span class="guide-item-icon">🎟️</span>
                    <span class="guide-label">門票費用：</span>
                    <span class="guide-val">${escapeHTML(spot.ticket)}</span>
                  </div>
                ` : ''}
                
                ${spot.openHours ? `
                  <div class="guide-item">
                    <span class="guide-item-icon">🕒</span>
                    <span class="guide-label">開放時間：</span>
                    <span class="guide-val">${escapeHTML(spot.openHours)}</span>
                  </div>
                ` : ''}

                ${spot.recommendedDuration ? `
                  <div class="guide-item">
                    <span class="guide-item-icon">⏳</span>
                    <span class="guide-label">建議停留：</span>
                    <span class="guide-val">${escapeHTML(spot.recommendedDuration)}</span>
                  </div>
                ` : ''}

                ${spot.transportation ? `
                  <div class="guide-item">
                    <span class="guide-item-icon">🚃</span>
                    <span class="guide-label">交通方式：</span>
                    <span class="guide-val">${escapeHTML(spot.transportation)}</span>
                  </div>
                ` : ''}
              </div>

              ${spot.tips && spot.tips !== '未提供' ? `
                <div class="tips-box">
                  <strong>💡 避坑與旅行提示：</strong><br>
                  ${escapeHTML(spot.tips)}
                </div>
              ` : ''}

              <div class="back-action-bar">
                ${spot.mapsUrl ? `
                  <a href="${escapeHTML(spot.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="map-link-btn">
                    🗺️ 在 Google Maps 開啟
                  </a>
                ` : '<span></span>'}
                
                <button class="flip-back-btn" onclick="toggleFlip('card-${escapeHTML(spot.id || index)}')">
                  返回封面 ↺
                </button>
              </div>

            </div>

          </div>
        </div>
      `;
    }).join('');
  }

  // 5. 翻卡切換功能 (暴露至全域供 onclick 調用)
  window.toggleFlip = function(cardId) {
    const cardEl = document.getElementById(cardId);
    if (cardEl) {
      cardEl.classList.toggle('is-flipped');
    }
  };

  // 6. 搜尋事件綁定 (加入微防抖)
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value;
      renderSpots();
    }, 180);
  });

  // 7. 重設篩選器
  resetBtn.addEventListener('click', () => {
    searchQuery = '';
    activeRegion = 'ALL';
    activeCategory = 'ALL';
    searchInput.value = '';
    updateTabActiveStates(regionTabsContainer, 'region', 'ALL');
    updateTabActiveStates(categoryTabsContainer, 'cat', 'ALL');
    renderSpots();
  });

  // 啟動初始化
  initFilters();
  renderSpots();
});
