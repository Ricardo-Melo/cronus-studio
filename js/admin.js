/**
 * Agende-me — Admin Manager (Painel da Manicure & Pedicure)
 * Gerencia o cadastro de serviços (CRUD), financeiro, clientes e configurações.
 */

class AdminManager {
  constructor() {
    this.currentServiceCategory = 'TODOS';
    this.editingServiceId = null;
    this.editingClientId = null;
    this.clientSearchQuery = '';
    this.financialSelectedMonth = ''; // 'YYYY-MM' ou 'all'
    this.financialSearchQuery = '';
    this.financialMethodFilter = 'all';
  }

  init() {
    this.renderAdminCategoryFilters();
    this.renderAdminServices();
    this.renderFinancialDashboard();
    this.renderClientsList();
    this.loadSettingsForm();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Form de Serviço (Criar/Editar)
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
      serviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveService();
      });
    }

    // Form de Configurações
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    // Form de Agendamento Manual pela Manicure
    const manualBookingForm = document.getElementById('manualBookingForm');
    if (manualBookingForm) {
      manualBookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveManualBooking();
      });
    }

    // Máscara de telefone no cadastro de Cliente
    const clientPhoneInput = document.getElementById('clientCrudPhone');
    if (clientPhoneInput) {
      clientPhoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 6) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        } else if (v.length > 2) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        } else {
          e.target.value = v;
        }
      });
    }
  }

  // --- Gestão de Serviços (CRUD) ---
  // --- Switcher de Exibição dos Cards (Com Foto vs Sem Foto) ---
  setCardPhotoDisplay(showPhotos) {
    window.dataManager.setShowServicePhotos(showPhotos);

    // Atualizar botões de toggle no Admin
    const btnPhoto = document.getElementById('btnCardModePhoto');
    const btnCompact = document.getElementById('btnCardModeCompact');
    if (btnPhoto && btnCompact) {
      btnPhoto.classList.toggle('active', showPhotos);
      btnCompact.classList.toggle('active', !showPhotos);
    }

    this.renderAdminServices();
    if (window.bookingFlow) {
      window.bookingFlow.renderServicesList();
    }

    window.app.showToast(showPhotos ? 'Exibindo cards com fotos ilustrativas' : 'Exibindo cards em modo compacto (sem fotos)');
  }

  // --- Gestão de Serviços (CRUD) ---
  renderAdminServices() {
    const grid = document.getElementById('adminServicesGrid');
    if (!grid) return;

    const allServices = window.dataManager.getServices();
    const showPhotosGlobal = window.dataManager.getShowServicePhotos();

    // Sincronizar estado dos botões do switcher
    const btnPhoto = document.getElementById('btnCardModePhoto');
    const btnCompact = document.getElementById('btnCardModeCompact');
    if (btnPhoto && btnCompact) {
      btnPhoto.classList.toggle('active', showPhotosGlobal);
      btnCompact.classList.toggle('active', !showPhotosGlobal);
    }

    const filtered = this.currentServiceCategory === 'TODOS'
      ? allServices
      : allServices.filter(s => s.category.toLowerCase() === this.currentServiceCategory.toLowerCase());

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 48px; background-color: var(--color-surface-0); border-radius: var(--radius-lg); border: 1px dashed var(--color-border-100);">
          <p style="color:var(--color-text-500); margin-bottom: 16px;">Nenhum serviço cadastrado nesta categoria.</p>
          <button class="btn-primary" onclick="window.adminManager.openServiceModal()">+ Cadastrar Serviço nesta Categoria</button>
        </div>
      `;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      const hasPhoto = showPhotosGlobal && s.hasPhoto !== false && s.image;
      card.className = `service-card ${hasPhoto ? '' : 'no-photo'}`;

      let imageHtml = '';
      if (hasPhoto) {
        imageHtml = `<img class="service-card-cover" src="${s.image}" alt="${s.name}" onerror="this.src='assets/manicure.jpg'">`;
      }

      card.innerHTML = `
        ${imageHtml}
        <div class="service-card-content">
          <div class="service-badge-row">
            <span class="badge badge-brand">${s.category}</span>
            <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; color: ${s.active ? 'var(--color-success-500)' : 'var(--color-text-500)'}; font-weight:700;">
              <input type="checkbox" ${s.active ? 'checked' : ''} onchange="window.adminManager.toggleStatus('${s.id}')">
              ${s.active ? 'Ativo' : 'Pausado'}
            </label>
          </div>
          <h3 class="service-card-title">${s.name}</h3>
          <p class="service-card-desc">${s.description || 'Procedimento profissional completo com materiais de alta qualidade e biossegurança.'}</p>
          <div class="service-card-footer">
            <div class="service-price-block">
              <div class="price">R$ ${s.price.toFixed(2)}</div>
              <div class="duration">⏱️ ${s.duration} minutos de atendimento</div>
            </div>
            <div class="service-card-actions">
              <button class="btn-icon-action" title="Editar Serviço" onclick="window.adminManager.openServiceModal('${s.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="btn-icon-action delete" title="Excluir Serviço" onclick="window.adminManager.deleteService('${s.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Atualizar contador na navegação
    const navCount = document.getElementById('navServicesCount');
    if (navCount) {
      navCount.textContent = allServices.length;
    }
  }

  filterAdminServices(category) {
    this.currentServiceCategory = category;
    document.querySelectorAll('.admin-cat-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    this.renderAdminServices();
  }

  toggleStatus(id) {
    window.dataManager.toggleServiceStatus(id);
    this.renderAdminServices();
    window.bookingFlow.renderServicesList();
    window.app.showToast('Status do serviço atualizado!');
  }

  openServiceModal(id = null) {
    this.editingServiceId = id;
    const modal = document.getElementById('serviceModalBackdrop');
    const title = document.getElementById('serviceModalTitle');
    const form = document.getElementById('serviceForm');
    if (!modal || !form) return;

    form.reset();
    const serviceToEdit = id ? window.dataManager.getServiceById(id) : null;
    this.populateCategorySelect(serviceToEdit ? serviceToEdit.category : null);

    if (id) {
      const s = serviceToEdit;
      if (s) {
        title.textContent = 'Editar Serviço';
        document.getElementById('serviceNameInput').value = s.name;
        document.getElementById('serviceCategorySelect').value = s.category;
        document.getElementById('servicePriceInput').value = s.price;
        document.getElementById('serviceDurationSelect').value = s.duration;
        document.getElementById('serviceDescInput').value = s.description;
        document.getElementById('serviceImageSelect').value = s.image || 'assets/manicure.jpg';
        document.getElementById('serviceActiveCheck').checked = s.active !== false;
        document.getElementById('serviceHasPhotoCheck').checked = s.hasPhoto !== false;
      }
    } else {
      title.textContent = 'Cadastrar Novo Serviço';
      document.getElementById('serviceActiveCheck').checked = true;
      document.getElementById('serviceHasPhotoCheck').checked = true;
      document.getElementById('serviceImageSelect').value = 'assets/manicure.jpg';
    }

    this.updateServicePhotoPreview();
    this.toggleServicePhotoField();
    modal.classList.add('open');
  }

  updateServicePhotoPreview() {
    const select = document.getElementById('serviceImageSelect');
    const preview = document.getElementById('serviceImagePreview');
    if (select && preview) {
      preview.src = select.value;
    }
  }

  toggleServicePhotoField() {
    const hasPhoto = document.getElementById('serviceHasPhotoCheck')?.checked;
    const previewContainer = document.getElementById('serviceImagePreviewContainer');
    const imageSelect = document.getElementById('serviceImageSelect');
    if (previewContainer) {
      previewContainer.style.opacity = hasPhoto ? '1' : '0.35';
    }
    if (imageSelect) {
      imageSelect.disabled = !hasPhoto;
    }
  }

  closeServiceModal() {
    const modal = document.getElementById('serviceModalBackdrop');
    if (modal) modal.classList.remove('open');
    this.editingServiceId = null;
  }

  saveService() {
    const name = document.getElementById('serviceNameInput').value.trim();
    const category = document.getElementById('serviceCategorySelect').value;
    const price = parseFloat(document.getElementById('servicePriceInput').value);
    const duration = parseInt(document.getElementById('serviceDurationSelect').value);
    const description = document.getElementById('serviceDescInput').value.trim();
    const image = document.getElementById('serviceImageSelect').value;
    const active = document.getElementById('serviceActiveCheck').checked;
    const hasPhoto = document.getElementById('serviceHasPhotoCheck').checked;

    if (!name || isNaN(price) || isNaN(duration)) {
      window.app.showToast('Preencha os campos obrigatórios corretamente.', 'danger');
      return;
    }

    if (this.editingServiceId) {
      window.dataManager.updateService(this.editingServiceId, {
        name, category, price, duration, description, image, active, hasPhoto
      });
      window.app.showToast('Serviço atualizado com sucesso!', 'success');
    } else {
      window.dataManager.addService({
        name, category, price, duration, description, image, active, hasPhoto
      });
      window.app.showToast('Novo serviço cadastrado com sucesso!', 'success');
    }

    this.closeServiceModal();
    this.renderAdminCategoryFilters();
    this.renderAdminServices();
    window.bookingFlow.renderServicesList();
  }

  deleteService(id) {
    const s = window.dataManager.getServiceById(id);
    if (!s) return;
    if (confirm(`Deseja realmente excluir o serviço "${s.name}"?`)) {
      window.dataManager.deleteService(id);
      this.renderAdminCategoryFilters();
      this.renderAdminServices();
      window.bookingFlow.renderServicesList();
      window.app.showToast('Serviço removido com sucesso!');
    }
  }

  // --- Gestão Dinâmica de Categorias (CRUD) ---
  renderAdminCategoryFilters() {
    const container = document.getElementById('adminCategoryFiltersBar');
    if (!container) return;

    const categories = window.dataManager.getCategories();
    const allServices = window.dataManager.getServices();

    // Se a categoria atualmente filtrada não existir mais, volta para TODOS
    if (this.currentServiceCategory !== 'TODOS' && !categories.some(c => c.name.toLowerCase() === this.currentServiceCategory.toLowerCase())) {
      this.currentServiceCategory = 'TODOS';
    }

    let html = `
      <button type="button" class="btn-pill admin-cat-filter ${this.currentServiceCategory === 'TODOS' ? 'active' : ''}" data-category="TODOS" onclick="window.adminManager.filterAdminServices('TODOS')">
        Todos (${allServices.length})
      </button>
    `;

    categories.forEach(cat => {
      const count = window.dataManager.getServicesCountByCategory(cat.name);
      const isActive = this.currentServiceCategory.toLowerCase() === cat.name.toLowerCase();
      html += `
        <button type="button" class="btn-pill admin-cat-filter ${isActive ? 'active' : ''}" data-category="${cat.name}" onclick="window.adminManager.filterAdminServices('${cat.name}')">
          ${cat.name} (${count})
        </button>
      `;
    });

    container.innerHTML = html;
  }

  populateCategorySelect(selectedCategory = null) {
    const select = document.getElementById('serviceCategorySelect');
    if (!select) return;

    select.innerHTML = '';
    const categories = window.dataManager.getCategories();

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      if (selectedCategory && selectedCategory.toLowerCase() === cat.name.toLowerCase()) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    if (selectedCategory && !categories.some(c => c.name.toLowerCase() === selectedCategory.toLowerCase())) {
      const opt = document.createElement('option');
      opt.value = selectedCategory;
      opt.textContent = selectedCategory;
      opt.selected = true;
      select.appendChild(opt);
    }
  }

  openCategoriesModal() {
    const modal = document.getElementById('categoriesModalBackdrop');
    if (!modal) return;
    this.renderCategoriesList();
    modal.classList.add('open');
    const input = document.getElementById('newCategoryNameInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  }

  closeCategoriesModal() {
    const modal = document.getElementById('categoriesModalBackdrop');
    if (modal) modal.classList.remove('open');
    this.renderAdminCategoryFilters();
    this.renderAdminServices();
    if (window.bookingFlow && typeof window.bookingFlow.renderCategoryFilter === 'function') {
      window.bookingFlow.renderCategoryFilter();
    }
  }

  renderCategoriesList() {
    const container = document.getElementById('categoriesManagerList');
    if (!container) return;

    const categories = window.dataManager.getCategories();
    let html = '';

    if (categories.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px; color:var(--color-text-500); font-size:13px;">
          Nenhuma categoria cadastrada.
        </div>
      `;
      return;
    }

    categories.forEach(cat => {
      const count = window.dataManager.getServicesCountByCategory(cat.name);
      html += `
        <div class="category-manager-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--color-surface-50); border:1px solid var(--color-border-100); border-radius:var(--radius-md); transition:all 0.15s ease;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:8px; height:8px; border-radius:50%; background:var(--color-brand-700);"></div>
            <div>
              <strong style="color:var(--color-brand-900); font-size:13.5px;">${cat.name}</strong>
              <div style="font-size:11.5px; color:var(--color-text-500); margin-top:1px;">
                ${count} ${count === 1 ? 'procedimento cadastrado' : 'procedimentos cadastrados'}
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-icon-action" title="Renomear Categoria" onclick="window.adminManager.promptRenameCategory('${cat.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button type="button" class="btn-icon-action delete" title="Excluir Categoria" onclick="window.adminManager.deleteCategory('${cat.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  saveNewCategory() {
    const input = document.getElementById('newCategoryNameInput');
    if (!input) return;
    const name = input.value.trim();

    try {
      window.dataManager.addCategory(name);
      input.value = '';
      this.renderCategoriesList();
      this.renderAdminCategoryFilters();
      this.renderAdminServices();
      if (window.bookingFlow && typeof window.bookingFlow.renderCategoryFilter === 'function') {
        window.bookingFlow.renderCategoryFilter();
      }
      window.app.showToast(`Categoria "${name}" criada com sucesso!`, 'success');
    } catch (err) {
      alert(err.message);
    }
  }

  promptRenameCategory(id) {
    const cat = window.dataManager.getCategories().find(c => c.id === id);
    if (!cat) return;

    const newName = prompt(`Digite o novo nome para a categoria "${cat.name}":`, cat.name);
    if (!newName || !newName.trim() || newName.trim() === cat.name) return;

    try {
      window.dataManager.updateCategory(id, newName.trim());
      this.renderCategoriesList();
      this.renderAdminCategoryFilters();
      this.renderAdminServices();
      if (window.bookingFlow && typeof window.bookingFlow.renderCategoryFilter === 'function') {
        window.bookingFlow.renderCategoryFilter();
      }
      window.app.showToast(`Categoria renomeada para "${newName.trim()}"!`, 'success');
    } catch (err) {
      alert(err.message);
    }
  }

  deleteCategory(id) {
    const cat = window.dataManager.getCategories().find(c => c.id === id);
    if (!cat) return;

    const count = window.dataManager.getServicesCountByCategory(cat.name);
    const confirmMsg = count > 0
      ? `Deseja realmente excluir a categoria "${cat.name}"?\n\nOs ${count} procedimento(s) atualmente vinculados serão mantidos e transferidos automaticamente para outra categoria ativa.`
      : `Deseja realmente excluir a categoria "${cat.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      window.dataManager.deleteCategory(id);
      this.renderCategoriesList();
      this.renderAdminCategoryFilters();
      this.renderAdminServices();
      if (window.bookingFlow && typeof window.bookingFlow.renderCategoryFilter === 'function') {
        window.bookingFlow.renderCategoryFilter();
      }
      window.app.showToast(`Categoria "${cat.name}" excluída com sucesso!`, 'success');
    } catch (err) {
      alert(err.message);
    }
  }

  // --- Painel Financeiro Dinâmico (Filtro por Mês, Busca e Métodos) ---
  populateFinancialMonthSelect() {
    const select = document.getElementById('financialMonthSelect');
    if (!select) return;

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const bookings = window.dataManager.getBookings();
    const monthsSet = new Set();
    const now = new Date();

    // Adiciona o mês atual e meses ao redor (-2 a +5 meses)
    for (let offset = -2; offset <= 5; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(key);
    }

    // Adiciona meses que já contenham agendamentos
    bookings.forEach(b => {
      if (b.date && b.date.length >= 7) {
        monthsSet.add(b.date.substring(0, 7));
      }
    });

    const sortedMonths = Array.from(monthsSet).sort();

    // Se financialSelectedMonth estiver vazio, define inteligentemente:
    if (!this.financialSelectedMonth) {
      const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const hasCurBookings = bookings.some(b => b.date && b.date.startsWith(curKey) && b.status !== 'CANCELADO');
      if (hasCurBookings || bookings.length === 0) {
        this.financialSelectedMonth = curKey;
      } else {
        const sortedBookings = [...bookings].filter(b => b.status !== 'CANCELADO').sort((a,b) => b.date.localeCompare(a.date));
        this.financialSelectedMonth = sortedBookings[0] ? sortedBookings[0].date.substring(0, 7) : curKey;
      }
    }

    select.innerHTML = '';

    // Opção "Todos os Meses"
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'Todo o Período (Todos os Meses)';
    select.appendChild(optAll);

    // Meses específicos
    sortedMonths.forEach(mKey => {
      const [yStr, mStr] = mKey.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const opt = document.createElement('option');
      opt.value = mKey;
      const isCur = (y === now.getFullYear() && m === (now.getMonth() + 1));
      opt.textContent = `${monthNames[m - 1]} de ${y}${isCur ? ' (Mês Atual)' : ''}`;
      select.appendChild(opt);
    });

    select.value = this.financialSelectedMonth;
  }

  changeFinancialMonth(delta) {
    if (!this.financialSelectedMonth || this.financialSelectedMonth === 'all') {
      const now = new Date();
      this.financialSelectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const [y, m] = this.financialSelectedMonth.split('-').map(Number);
      const newDate = new Date(y, (m - 1) + delta, 1);
      this.financialSelectedMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    }
    const select = document.getElementById('financialMonthSelect');
    if (select) select.value = this.financialSelectedMonth;
    this.renderFinancialDashboard();
  }

  onFinancialMonthSelectChange(val) {
    this.financialSelectedMonth = val;
    this.renderFinancialDashboard();
  }

  resetFinancialToCurrentMonth() {
    const now = new Date();
    this.financialSelectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const select = document.getElementById('financialMonthSelect');
    if (select) select.value = this.financialSelectedMonth;
    this.renderFinancialDashboard();
  }

  onFinancialSearch(query) {
    this.financialSearchQuery = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('btnFinancialClearSearch');
    if (clearBtn) {
      clearBtn.style.display = this.financialSearchQuery ? 'block' : 'none';
    }
    this.renderFinancialDashboard();
  }

  clearFinancialSearch() {
    const input = document.getElementById('financialSearchInput');
    if (input) input.value = '';
    this.financialSearchQuery = '';
    const clearBtn = document.getElementById('btnFinancialClearSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    this.renderFinancialDashboard();
  }

  onFinancialMethodFilterChange(method) {
    this.financialMethodFilter = method || 'all';
    this.renderFinancialDashboard();
  }

  clearAllFinancialFilters() {
    this.financialSearchQuery = '';
    this.financialMethodFilter = 'all';
    this.financialSelectedMonth = 'all';

    const searchInput = document.getElementById('financialSearchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btnFinancialClearSearch');
    if (clearBtn) clearBtn.style.display = 'none';
    const methodSelect = document.getElementById('financialMethodFilter');
    if (methodSelect) methodSelect.value = 'all';
    const monthSelect = document.getElementById('financialMonthSelect');
    if (monthSelect) monthSelect.value = 'all';

    this.renderFinancialDashboard();
  }

  renderFinancialDashboard() {
    this.populateFinancialMonthSelect();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let stats;
    let periodName = 'Mês Atual';

    if (this.financialSelectedMonth === 'all') {
      stats = window.dataManager.getFinancialStats(null, 'all');
      periodName = 'Geral (Todos os Meses)';
    } else {
      const [y, m] = (this.financialSelectedMonth || '').split('-').map(Number);
      stats = window.dataManager.getFinancialStats(y, m);
      periodName = `${monthNames[m - 1]} de ${y}`;
    }

    const monthEl = document.getElementById('statMonthRevenue');
    const monthLbl = document.getElementById('statMonthRevenueLabel');
    const monthSub = document.getElementById('statMonthRevenueSub');
    const todayEl = document.getElementById('statTodayRevenue');
    const totalEl = document.getElementById('statTotalBookings');
    const totalLbl = document.getElementById('statTotalBookingsLabel');
    const ticketEl = document.getElementById('statAverageTicket');

    if (monthEl) monthEl.textContent = `R$ ${stats.revenueMonth.toFixed(2)}`;
    if (monthLbl) monthLbl.textContent = `Faturamento (${periodName})`;
    if (monthSub) {
      monthSub.textContent = stats.totalAppointments > 0 
        ? `${stats.pixCount} via Pix • ${stats.cardCount} Cartão • ${stats.localCount || 0} No Local`
        : '↑ Recebimentos confirmados';
    }
    if (todayEl) todayEl.textContent = `R$ ${stats.revenueToday.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${stats.totalAppointments}`;
    if (totalLbl) totalLbl.textContent = `Agendamentos (${periodName})`;
    if (ticketEl) ticketEl.textContent = `R$ ${stats.averageTicket.toFixed(2)}`;

    // Tabela de Transações com Filtros Aplicados
    const tableBody = document.getElementById('financialTransactionsBody');
    const countBadge = document.getElementById('financialRecordsCount');
    if (!tableBody) return;

    const allBookings = [...window.dataManager.getBookings()].sort((a,b) => b.date.localeCompare(a.date));

    const filteredBookings = allBookings.filter(b => {
      // 1. Filtro por Mês/Período
      if (this.financialSelectedMonth && this.financialSelectedMonth !== 'all') {
        if (!b.date || !b.date.startsWith(this.financialSelectedMonth)) {
          return false;
        }
      }

      // 2. Filtro por Forma de Pagamento
      if (this.financialMethodFilter && this.financialMethodFilter !== 'all') {
        if (this.financialMethodFilter === 'PIX' && b.paymentMethod !== 'PIX') return false;
        if (this.financialMethodFilter === 'CARTAO' && !(b.paymentMethod && b.paymentMethod.includes('CARTAO'))) return false;
        if (this.financialMethodFilter === 'PAGAR_NO_LOCAL' && b.paymentMethod !== 'PAGAR_NO_LOCAL') return false;
      }

      // 3. Filtro de Busca Textual
      if (this.financialSearchQuery) {
        const q = this.financialSearchQuery;
        const qDigits = q.replace(/\D/g, '');
        const clientPhoneDigits = (b.clientPhone || '').replace(/\D/g, '');
        const idMatch = (b.id || '').toLowerCase().includes(q);
        const nameMatch = (b.clientName || '').toLowerCase().includes(q);
        const servicesMatch = (b.serviceNames || '').toLowerCase().includes(q);
        const methodMatch = (b.paymentMethod || '').toLowerCase().includes(q);
        const phoneMatch = qDigits && clientPhoneDigits.includes(qDigits);

        if (!idMatch && !nameMatch && !servicesMatch && !methodMatch && !phoneMatch) {
          return false;
        }
      }

      return true;
    });

    if (countBadge) {
      countBadge.textContent = `${filteredBookings.length} ${filteredBookings.length === 1 ? 'registro' : 'registros'}`;
    }

    tableBody.innerHTML = '';

    if (filteredBookings.length === 0) {
      const hasActiveFilters = (this.financialSelectedMonth && this.financialSelectedMonth !== 'all') || 
                               (this.financialMethodFilter && this.financialMethodFilter !== 'all') || 
                               this.financialSearchQuery;

      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:36px 20px; color:var(--color-text-500);">
            <div style="font-weight:600; font-size:14px; margin-bottom:6px;">Nenhuma transação encontrada.</div>
            <div style="font-size:12px; color:var(--color-text-400); margin-bottom:12px;">
              ${hasActiveFilters ? `Nenhum resultado para os filtros atuais (${periodName}).` : 'Nenhum agendamento realizado ainda.'}
            </div>
            ${hasActiveFilters ? `
              <button type="button" class="btn-pill" onclick="window.adminManager.clearAllFinancialFilters()">
                Ver Todos os Meses e Limpar Filtros
              </button>
            ` : ''}
          </td>
        </tr>
      `;
      return;
    }

    filteredBookings.forEach(b => {
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';
      row.title = 'Clique para ver detalhes ou dar baixa';
      row.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          window.app.showBookingDetails(b.id);
        }
      });

      const [y, m, d] = (b.date || '').split('-');
      const formattedDate = (d && m && y) ? `${d}/${m}/${y}` : (b.date || '—');
      const isPaid = b.paymentStatus === 'PAGO' || b.status === 'CONCLUIDO';

      let payBadgeHtml = '';
      if (b.paymentMethod === 'PIX') {
        payBadgeHtml = `<span class="badge badge-brand">Pix Online</span>`;
      } else if (b.paymentMethod === 'CARTAO_CREDITO' || b.paymentMethod === 'CARTAO') {
        payBadgeHtml = `<span class="badge badge-event">Cartão de Crédito</span>`;
      } else if (b.paymentMethod === 'CARTAO_DEBITO') {
        payBadgeHtml = `<span class="badge badge-event" style="background:#e0f2fe; color:#0369a1;">Cartão de Débito</span>`;
      } else if (b.paymentMethod === 'DINHEIRO') {
        payBadgeHtml = `<span class="badge" style="background:#dcfce7; color:#15803d;">Dinheiro</span>`;
      } else if (b.paymentMethod === 'PAGAR_NO_LOCAL') {
        payBadgeHtml = `<span class="badge badge-warning" style="background:#fef3c7; color:#92400e;">No Studio</span>`;
      } else {
        payBadgeHtml = `<span class="badge">${b.paymentMethod || 'Outro'}</span>`;
      }

      const statusBadgeHtml = isPaid
        ? `<span class="badge badge-success" style="font-size:10px; margin-left:4px;">PAGO</span>`
        : `<span class="badge badge-warning" style="font-size:10px; margin-left:4px;">A RECEBER</span>`;

      const locationBadge = b.serviceLocation === 'home'
        ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:10px; margin-left:6px; font-weight:700;">Domicílio</span>`
        : '';

      row.innerHTML = `
        <td><strong>#${b.id}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--color-text-900); display:flex; align-items:center;">
            <span>${b.clientName || 'Cliente'}</span>
            ${locationBadge}
          </div>
          ${b.clientPhone && b.clientPhone !== '—' ? `<div style="font-size:11px; color:var(--color-text-400); margin-top:2px;">${b.clientPhone}</div>` : ''}
        </td>
        <td>
          <span style="font-size:13px; color:var(--color-text-800);">${b.serviceNames || '—'}</span>
        </td>
        <td>
          <div style="font-weight:600; font-size:13px; color:var(--color-text-900);">${formattedDate}</div>
          <div style="font-size:11px; color:var(--color-text-500); margin-top:1px;">às ${b.time || '—'} (${b.duration || 0} min)</div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
            ${payBadgeHtml}
            ${statusBadgeHtml}
          </div>
        </td>
        <td style="font-weight:800; font-size:14px; color:var(--color-brand-900);">
          R$ ${(b.totalPrice || 0).toFixed(2)}
        </td>
        <td style="text-align:right;">
          ${!isPaid ? `
            <button type="button" class="btn-dar-baixa" onclick="window.app.showBookingDetails('${b.id}')" title="Dar baixa no pagamento deste agendamento">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Dar Baixa</span>
            </button>
          ` : `
            <button type="button" class="btn-pago-pill" onclick="window.app.showBookingDetails('${b.id}')" title="Ver comprovante e detalhes">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Pago</span>
            </button>
          `}
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // --- Carteira de Clientes (CRUD Completo) ---
  getInitials(name) {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  filterClients(query) {
    this.renderClientsList(query);
  }

  renderClientsList(filterQuery = '') {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    this.clientSearchQuery = (filterQuery !== undefined ? filterQuery : this.clientSearchQuery) || '';
    const allClients = window.dataManager.getClients();

    // Atualizar contador na navegação da Sidebar
    const navCount = document.getElementById('navClientsCount');
    if (navCount) {
      navCount.textContent = allClients.length;
    }

    const q = this.clientSearchQuery.trim().toLowerCase();
    const filtered = allClients.filter(c => {
      if (!q) return true;
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      const qDigits = q.replace(/\D/g, '');
      return (c.name && c.name.toLowerCase().includes(q)) ||
             (c.email && c.email.toLowerCase().includes(q)) ||
             (c.notes && c.notes.toLowerCase().includes(q)) ||
             (qDigits && cleanPhone.includes(qDigits));
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:36px; color:var(--color-text-500);">
            ${q ? 'Nenhuma cliente encontrada com o termo buscado.' : 'Nenhuma cliente cadastrada ainda.'}<br>
            <button class="btn-pill" style="margin-top:12px;" onclick="window.adminManager.openClientModal()">
              + Cadastrar Nova Cliente
            </button>
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(c => {
      const stats = window.dataManager.getClientStats(c);
      const row = document.createElement('tr');
      const initials = this.getInitials(c.name);
      const cleanPhone = (c.phone || '').replace(/\D/g, '');

      row.innerHTML = `
        <td>
          <div class="client-info-cell" title="${c.notes ? 'Preferências: ' + c.notes : ''}">
            <div class="client-avatar-circle">${initials}</div>
            <div>
              <div class="client-name-text">${c.name}</div>
              ${c.birthdate ? `<div class="client-bday-text" style="display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path><path d="M2 21h20"></path><line x1="12" y1="7" x2="12" y2="11"></line></svg><span>Niver: ${c.birthdate}</span></div>` : ''}
              ${c.blockLocalPayment ? `<span class="badge-blocked-local" title="Esta cliente não pode escolher pagamento no local ao agendar online" style="display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg><span>Pagamento no local bloqueado</span></span>` : ''}
            </div>
          </div>
        </td>
        <td>
          <a href="https://wa.me/55${cleanPhone}" target="_blank" style="color:var(--color-brand-700); font-weight:600; display:inline-flex; align-items:center; gap:4px;" title="Conversar no WhatsApp">
            ${c.phone}
          </a>
        </td>
        <td style="color:var(--color-text-700);">${c.email || '—'}</td>
        <td>
          <span class="badge badge-brand">${stats.totalVisits} ${stats.totalVisits === 1 ? 'visita' : 'visitas'}</span>
        </td>
        <td style="font-weight:700; color:var(--color-brand-900);">
          R$ ${stats.totalSpent.toFixed(2)}
        </td>
        <td>
          <div class="client-table-actions" style="justify-content:flex-end;">
            <a class="btn-icon-action wa" href="https://wa.me/55${cleanPhone}" target="_blank" title="Abrir WhatsApp da Cliente">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.82 2.79.82 3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.464 9.948-9.95 9.948-1.688 0-3.273-.426-4.665-1.173l-5.385 1.411 1.439-5.253c-.848-1.455-1.339-3.14-1.339-4.933 0-5.485 4.464-9.949 9.95-9.949 5.486 0 9.95 4.464 9.95 9.949z"/></svg>
            </a>
            <button class="btn-icon-action" title="Agendar Horário para esta Cliente" onclick="window.adminManager.quickBookForClient('${c.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
            <button class="btn-icon-action" title="Editar Dados da Cliente" onclick="window.adminManager.openClientModal('${c.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="btn-icon-action delete" title="Excluir Cliente" onclick="window.adminManager.deleteClient('${c.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  openClientModal(id = null) {
    this.editingClientId = id;
    const modal = document.getElementById('clientModalBackdrop');
    const title = document.getElementById('clientModalTitle');
    const form = document.getElementById('clientCrudForm');
    if (!modal || !form) return;

    form.reset();

    if (id) {
      const c = window.dataManager.getClientById(id);
      if (c) {
        title.textContent = 'Editar Dados da Cliente';
        document.getElementById('clientCrudName').value = c.name || '';
        document.getElementById('clientCrudPhone').value = c.phone || '';
        document.getElementById('clientCrudEmail').value = c.email || '';
        document.getElementById('clientCrudAddress').value = c.address || '';
        document.getElementById('clientCrudBirthdate').value = c.birthdate || '';
        document.getElementById('clientCrudNotes').value = c.notes || '';
        const chkBlock = document.getElementById('clientCrudBlockLocal');
        if (chkBlock) {
          chkBlock.checked = !!c.blockLocalPayment;
          this.handleBlockLocalSwitchChange(chkBlock);
        }
      }
    } else {
      title.textContent = 'Cadastrar Nova Cliente';
      const addrEl = document.getElementById('clientCrudAddress');
      if (addrEl) addrEl.value = '';
      const chkBlock = document.getElementById('clientCrudBlockLocal');
      if (chkBlock) {
        chkBlock.checked = false;
        this.handleBlockLocalSwitchChange(chkBlock);
      }
    }

    modal.classList.add('open');
  }

  handleBlockLocalSwitchChange(chk) {
    const card = document.getElementById('cardBlockLocalPayment');
    if (card) {
      card.classList.toggle('active', chk.checked);
    }
  }

  closeClientModal() {
    const modal = document.getElementById('clientModalBackdrop');
    if (modal) modal.classList.remove('open');
    this.editingClientId = null;
  }

  saveClient() {
    const name = document.getElementById('clientCrudName').value.trim();
    const phone = document.getElementById('clientCrudPhone').value.trim();
    const email = document.getElementById('clientCrudEmail').value.trim();
    const address = document.getElementById('clientCrudAddress')?.value.trim() || '';
    const birthdate = document.getElementById('clientCrudBirthdate').value.trim();
    const notes = document.getElementById('clientCrudNotes').value.trim();
    const blockLocalPayment = document.getElementById('clientCrudBlockLocal')?.checked || false;

    if (!name || !phone || phone.length < 10) {
      window.app.showToast('Preencha o nome e um número de WhatsApp válido.', 'danger');
      return;
    }

    if (this.editingClientId) {
      window.dataManager.updateClient(this.editingClientId, {
        name, phone, email, address, birthdate, notes, blockLocalPayment
      });
      window.app.showToast(`Dados de ${name} atualizados com sucesso!`, 'success');
    } else {
      window.dataManager.addClient({
        name, phone, email, address, birthdate, notes, blockLocalPayment
      });
      window.app.showToast(`Cliente ${name} cadastrada com sucesso!`, 'success');
    }

    this.closeClientModal();
    this.renderClientsList();
  }

  deleteClient(id) {
    const c = window.dataManager.getClientById(id);
    if (!c) return;

    if (confirm(`Deseja realmente remover a cliente "${c.name}" da sua carteira?`)) {
      window.dataManager.deleteClient(id);
      this.renderClientsList();
      window.app.showToast('Cliente removida com sucesso!');
    }
  }

  quickBookForClient(clientId) {
    const c = window.dataManager.getClientById(clientId);
    if (!c) return;

    this.openManualBookingModal();
    const nameInput = document.getElementById('manualClientName');
    const phoneInput = document.getElementById('manualClientPhone');
    if (nameInput) nameInput.value = c.name;
    if (phoneInput) phoneInput.value = c.phone;
  }

  // --- Configurações Expandidas (4 Subtabs) ---
  switchSettingsSubtab(subtabId) {
    const tabs = ['studio', 'agenda', 'payments', 'rules'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabNav${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const panel = document.getElementById(`subtabSection-${t}`);
      if (btn) btn.classList.toggle('active', t === subtabId);
      if (panel) panel.classList.toggle('active', t === subtabId);
    });
  }

  handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      this.uploadedLogoDataUrl = event.target.result;
      const preview = document.getElementById('settingLogoPreview');
      if (preview) preview.src = this.uploadedLogoDataUrl;
      window.app.showToast('Logomarca carregada! Clique em Salvar para gravar.');
    };
    reader.readAsDataURL(file);
  }

  resetLogo() {
    this.uploadedLogoDataUrl = 'assets/manicure.jpg';
    const preview = document.getElementById('settingLogoPreview');
    if (preview) preview.src = this.uploadedLogoDataUrl;
    window.app.showToast('Logomarca restaurada para a imagem padrão.');
  }

  toggleDepositOptions() {
    const selected = document.querySelector('input[name="settingDepositPolicy"]:checked')?.value || 'full';
    const box = document.getElementById('depositInputsBox');
    if (box) {
      box.style.display = selected === 'deposit' ? 'block' : 'none';
    }
  }

  toggleDepositTypeInputs() {
    const type = document.getElementById('settingDepositType')?.value;
    const lbl = document.getElementById('lblDepositVal');
    const input = document.getElementById('settingDepositValue');
    if (lbl && input) {
      if (type === 'percentage') {
        lbl.textContent = 'Porcentagem (%)';
        input.max = '100';
        input.value = '30';
      } else {
        lbl.textContent = 'Valor Fixo (R$)';
        input.removeAttribute('max');
        input.value = '20';
      }
    }
  }

  addVacationFromSettings() {
    const start = document.getElementById('vacationStartDate')?.value;
    const end = document.getElementById('vacationEndDate')?.value;
    const reason = document.getElementById('vacationReasonInput')?.value.trim();

    if (!start || !end) {
      window.app.showToast('Informe a data de início e término das férias.', 'danger');
      return;
    }
    if (start > end) {
      window.app.showToast('A data final deve ser igual ou posterior à data de início.', 'danger');
      return;
    }

    window.dataManager.addVacationPeriod({ start, end, reason: reason || 'Férias / Recesso' });
    window.app.showToast(`Período de recesso bloqueado (${start} até ${end})!`, 'success');
    
    document.getElementById('vacationStartDate').value = '';
    document.getElementById('vacationEndDate').value = '';
    document.getElementById('vacationReasonInput').value = '';
    
    this.renderVacationList();

    if (window.calendarEngine) {
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    }
    if (window.bookingFlow) {
      window.bookingFlow.renderBookingMiniCal();
    }
  }

  removeVacationFromSettings(id) {
    if (confirm('Deseja remover este período de bloqueio / férias?')) {
      window.dataManager.removeVacationPeriod(id);
      window.app.showToast('Período de férias liberado!');
      this.renderVacationList();

      if (window.calendarEngine) {
        window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
        window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
        window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
      }
      if (window.bookingFlow) {
        window.bookingFlow.renderBookingMiniCal();
      }
    }
  }

  renderVacationList() {
    const container = document.getElementById('vacationListContainer');
    if (!container) return;

    const list = window.dataManager.getSettings().vacationPeriods || [];
    if (list.length === 0) {
      container.innerHTML = `<p style="font-size:12px; color:var(--color-text-500); margin:0;">Nenhum recesso ou férias cadastradas no momento.</p>`;
      return;
    }

    container.innerHTML = '';
    list.forEach(v => {
      const item = document.createElement('div');
      item.className = 'vacation-period-item';
      item.innerHTML = `
        <div>
          <strong style="color:#991b1b; display:inline-flex; align-items:center; gap:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>${v.reason}</span></strong>
          <span style="color:var(--color-text-700); margin-left:8px;">De ${v.start.split('-').reverse().join('/')} até ${v.end.split('-').reverse().join('/')}</span>
        </div>
        <button type="button" class="btn-icon-action delete" style="width:24px; height:24px;" onclick="window.adminManager.removeVacationFromSettings('${v.id}')" title="Excluir período">✕</button>
      `;
      container.appendChild(item);
    });
  }

  loadSettingsForm() {
    const s = window.dataManager.getSettings();
    if (!s) return;

    // Subtab 1: Studio e Logo
    const logoPreview = document.getElementById('settingLogoPreview');
    if (logoPreview) logoPreview.src = s.logoUrl || 'assets/manicure.jpg';
    this.uploadedLogoDataUrl = s.logoUrl || 'assets/manicure.jpg';

    const studioName = document.getElementById('settingStudioName');
    const manicureName = document.getElementById('settingManicureName');
    const waNumber = document.getElementById('settingWhatsapp');
    const instagram = document.getElementById('settingInstagram');
    const address = document.getElementById('settingAddress');

    if (studioName) studioName.value = s.studioName || '';
    if (manicureName) manicureName.value = s.manicureName || '';
    if (waNumber) waNumber.value = s.whatsappNumber || '';
    if (instagram) instagram.value = s.instagramHandle || '';
    if (address) address.value = s.address || '';

    // Modalidade e Local de Atendimento
    const locMode = document.getElementById('settingServiceLocationMode');
    const homeFee = document.getElementById('settingHomeServiceFee');
    if (locMode) locMode.value = s.serviceLocationMode || 'both';
    if (homeFee) homeFee.value = s.homeServiceFee !== undefined ? s.homeServiceFee : 0;
    this.handleLocationModeSettingChange(locMode ? locMode.value : 'both');

    // Login e Senha Definitivos
    const adminEmail = document.getElementById('settingAdminEmail');
    const adminPassword = document.getElementById('settingAdminPassword');
    const currentLogin = s.adminLogin || {};
    if (adminEmail) adminEmail.value = currentLogin.email || 'manicure@studio.com';
    if (adminPassword) adminPassword.value = currentLogin.password || '123456';

    // Subtab 2: Agenda e Bloqueios
    const opening = document.getElementById('settingOpeningTime');
    const closing = document.getElementById('settingClosingTime');
    const buffer = document.getElementById('settingCleaningBuffer');
    const hasLunch = document.getElementById('settingHasLunch');
    const lunchStart = document.getElementById('settingLunchStart');
    const lunchEnd = document.getElementById('settingLunchEnd');

    if (opening) opening.value = s.openingTime || '09:00';
    if (closing) closing.value = s.closingTime || '19:00';
    if (buffer) buffer.value = String(s.cleaningBufferMinutes !== undefined ? s.cleaningBufferMinutes : 10);

    if (hasLunch) hasLunch.checked = s.hasLunchBreak !== false;
    if (lunchStart) lunchStart.value = s.lunchStartTime || '12:00';
    if (lunchEnd) lunchEnd.value = s.lunchEndTime || '13:00';

    this.toggleLunchInputs();
    this.updateWorkDayButtons();
    this.renderVacationList();

    // Subtab 3: Pagamentos e Sinal
    const methods = s.paymentMethods || { pix: true, creditCard: true, debitCard: true, local: true };
    const chkPix = document.getElementById('payMethodPix');
    const chkCredit = document.getElementById('payMethodCredit');
    const chkDebit = document.getElementById('payMethodDebit');
    const chkLocal = document.getElementById('payMethodLocal');

    if (chkPix) chkPix.checked = methods.pix !== false;
    if (chkCredit) chkCredit.checked = methods.creditCard !== false;
    if (chkDebit) chkDebit.checked = methods.debitCard !== false;
    if (chkLocal) chkLocal.checked = methods.local !== false;

    // Política de cobrança
    const policyRadios = document.querySelectorAll('input[name="settingDepositPolicy"]');
    policyRadios.forEach(r => {
      r.checked = (r.value === (s.depositPolicy || 'full'));
    });
    this.toggleDepositOptions();

    const depositType = document.getElementById('settingDepositType');
    const depositVal = document.getElementById('settingDepositValue');
    if (depositType) depositType.value = s.depositType || 'percentage';
    if (depositVal) depositVal.value = (s.depositType === 'fixed' ? (s.depositFixedAmount || 20) : (s.depositPercentage || 30));
    this.toggleDepositTypeInputs();

    const pixType = document.getElementById('settingPixKeyType');
    const pixKey = document.getElementById('settingPixKey');
    if (pixType) pixType.value = s.pixKeyType || 'Celular';
    if (pixKey) pixKey.value = s.pixKey || '';

    // Subtab 4: Regras e Políticas
    const minNotice = document.getElementById('settingMinNotice');
    const maxDays = document.getElementById('settingMaxDaysAhead');
    const cancelNotice = document.getElementById('settingCancelNotice');
    const delayTol = document.getElementById('settingDelayTolerance');

    if (minNotice) minNotice.value = String(s.minNoticeHours || 2);
    if (maxDays) maxDays.value = String(s.maxDaysAhead || 30);
    if (cancelNotice) cancelNotice.value = String(s.cancellationHours || 4);
    if (delayTol) delayTol.value = String(s.delayToleranceMinutes || 10);
  }

  handleLocationModeSettingChange(mode) {
    const feeGroup = document.getElementById('settingHomeFeeGroup');
    const tip = document.getElementById('settingLocationTip');
    if (feeGroup) {
      feeGroup.style.display = (mode === 'studio') ? 'none' : 'block';
    }
    if (tip) {
      if (mode === 'studio') {
        tip.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line></svg><span>Seus atendimentos acontecem exclusivamente no endereço do seu Studio.</span>';
      } else if (mode === 'home') {
        tip.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 22"></polyline></svg><span>Atendimento exclusivo em domicílio. O sistema pedirá o endereço da cliente no agendamento.</span>';
      } else {
        tip.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>Atendimento no Studio e a Domicílio. A cliente escolhe na hora de agendar e, se for em domicílio, informa o endereço.</span>';
      }
    }
  }

  toggleWorkDay(dayNumber) {
    const s = window.dataManager.getSettings();
    let days = Array.isArray(s.workDays) ? [...s.workDays] : [1, 2, 3, 4, 5, 6];
    
    if (days.includes(dayNumber)) {
      if (days.length <= 1) {
        window.app.showToast('Mantenha pelo menos um dia de trabalho ativo.', 'warning');
        return;
      }
      days = days.filter(d => d !== dayNumber);
    } else {
      days.push(dayNumber);
      days.sort();
    }
    
    s.workDays = days;
    window.dataManager.updateSettings({ workDays: days });
    this.updateWorkDayButtons();
    
    if (window.calendarEngine) {
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    }
    if (window.bookingFlow) {
      window.bookingFlow.renderBookingMiniCal();
    }
  }

  updateWorkDayButtons() {
    const s = window.dataManager.getSettings();
    const days = Array.isArray(s.workDays) ? s.workDays : [1, 2, 3, 4, 5, 6];
    const buttons = document.querySelectorAll('#settingsWorkDaysGroup .workday-toggle-btn');
    buttons.forEach(btn => {
      const d = parseInt(btn.dataset.day);
      btn.classList.toggle('active', days.includes(d));
    });
  }

  toggleLunchInputs() {
    const chk = document.getElementById('settingHasLunch');
    const container = document.getElementById('lunchInputsContainer');
    if (chk && container) {
      container.style.opacity = chk.checked ? '1' : '0.4';
      container.style.pointerEvents = chk.checked ? 'auto' : 'none';
    }
  }

  saveSettings() {
    const studioName = document.getElementById('settingStudioName')?.value.trim();
    const manicureName = document.getElementById('settingManicureName')?.value.trim();
    const whatsappNumber = document.getElementById('settingWhatsapp')?.value.replace(/\D/g, '');
    const instagramHandle = document.getElementById('settingInstagram')?.value.trim();
    const address = document.getElementById('settingAddress')?.value.trim();

    const openingTime = document.getElementById('settingOpeningTime')?.value || '09:00';
    const closingTime = document.getElementById('settingClosingTime')?.value || '19:00';
    const cleaningBufferMinutes = parseInt(document.getElementById('settingCleaningBuffer')?.value) || 0;
    const hasLunchBreak = document.getElementById('settingHasLunch')?.checked || false;
    const lunchStartTime = document.getElementById('settingLunchStart')?.value || '12:00';
    const lunchEndTime = document.getElementById('settingLunchEnd')?.value || '13:00';

    const payMethodPix = document.getElementById('payMethodPix')?.checked ?? true;
    const payMethodCredit = document.getElementById('payMethodCredit')?.checked ?? true;
    const payMethodDebit = document.getElementById('payMethodDebit')?.checked ?? true;
    const payMethodLocal = document.getElementById('payMethodLocal')?.checked ?? true;

    const depositPolicy = document.querySelector('input[name="settingDepositPolicy"]:checked')?.value || 'full';
    const depositType = document.getElementById('settingDepositType')?.value || 'percentage';
    const depositVal = parseFloat(document.getElementById('settingDepositValue')?.value) || 0;

    const pixKeyType = document.getElementById('settingPixKeyType')?.value || 'Celular';
    const pixKey = document.getElementById('settingPixKey')?.value.trim();

    const minNoticeHours = parseInt(document.getElementById('settingMinNotice')?.value) || 2;
    const maxDaysAhead = parseInt(document.getElementById('settingMaxDaysAhead')?.value) || 30;
    const cancellationHours = parseInt(document.getElementById('settingCancelNotice')?.value) || 4;
    const delayToleranceMinutes = parseInt(document.getElementById('settingDelayTolerance')?.value) || 10;

    const logoUrl = this.uploadedLogoDataUrl || window.dataManager.getSettings().logoUrl || 'assets/manicure.jpg';

    window.dataManager.updateSettings({
      studioName,
      manicureName,
      logoUrl,
      whatsappNumber,
      instagramHandle,
      address,
      openingTime,
      closingTime,
      cleaningBufferMinutes,
      hasLunchBreak,
      lunchStartTime,
      lunchEndTime,
      paymentMethods: {
        pix: payMethodPix,
        creditCard: payMethodCredit,
        debitCard: payMethodDebit,
        local: payMethodLocal
      },
      depositPolicy,
      depositType,
      depositPercentage: depositType === 'percentage' ? depositVal : 30,
      depositFixedAmount: depositType === 'fixed' ? depositVal : 20,
      pixKeyType,
      pixKey,
      minNoticeHours,
      maxDaysAhead,
      cancellationHours,
      delayToleranceMinutes,
      serviceLocationMode: document.getElementById('settingServiceLocationMode')?.value || 'both',
      homeServiceFee: parseFloat(document.getElementById('settingHomeServiceFee')?.value) || 0,
      adminLogin: {
        email: document.getElementById('settingAdminEmail')?.value.trim() || 'manicure@studio.com',
        password: document.getElementById('settingAdminPassword')?.value.trim() || '123456',
        isCustom: true
      }
    });

    // Sincronizar sessão ativa
    if (window.authManager && window.authManager.session) {
      window.authManager.session.email = document.getElementById('settingAdminEmail')?.value.trim() || window.authManager.session.email;
      window.authManager.session.name = manicureName;
      localStorage.setItem('agendeme_session_v1', JSON.stringify(window.authManager.session));
      window.authManager.updateUserInterface();
    }

    window.app.showToast('Todas as configurações e login definitivo foram salvos com sucesso!', 'success');

    // Atualizar UI do admin
    if (window.calendarEngine) {
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
    }
    if (window.bookingFlow) {
      window.bookingFlow.renderBookingMiniCal();
    }
  }

  // --- Modal de Bloqueio de Horário / Data por Imprevisto ---
  openBlockSlotModal(presetDate = null, forceAllDay = true) {
    const modal = document.getElementById('blockSlotModalBackdrop');
    if (!modal) return;

    const modalTitle = document.getElementById('blockSlotModalTitle');
    if (modalTitle) {
      modalTitle.textContent = forceAllDay ? 'Bloquear Data Inteira (Imprevisto)' : 'Bloquear Horário na Agenda';
    }

    const dateInput = document.getElementById('blockSlotDate');
    if (dateInput) {
      dateInput.value = presetDate || window.calendarEngine.formatDateKey(new Date());
    }

    const startInput = document.getElementById('blockSlotStartTime');
    const endInput = document.getElementById('blockSlotEndTime');
    if (startInput) startInput.value = '12:00';
    if (endInput) endInput.value = '13:30';

    const radioAllDay = document.querySelector('input[name="blockSlotType"][value="allday"]');
    const radioPartial = document.querySelector('input[name="blockSlotType"][value="partial"]');
    if (forceAllDay && radioAllDay) {
      radioAllDay.checked = true;
    } else if (radioPartial) {
      radioPartial.checked = true;
    }
    this.toggleBlockSlotType();

    modal.classList.add('open');
  }

  closeBlockSlotModal() {
    const modal = document.getElementById('blockSlotModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  toggleBlockSlotType() {
    const radioAllDay = document.querySelector('input[name="blockSlotType"][value="allday"]');
    const timeGroup = document.getElementById('blockPartialTimeGroup');
    if (timeGroup && radioAllDay) {
      timeGroup.style.display = radioAllDay.checked ? 'none' : 'grid';
    }
  }

  saveBlockSlot() {
    const date = document.getElementById('blockSlotDate').value;
    const isAllDay = document.querySelector('input[name="blockSlotType"][value="allday"]').checked;
    const startTime = document.getElementById('blockSlotStartTime').value;
    const endTime = document.getElementById('blockSlotEndTime').value;
    const reason = document.getElementById('blockSlotReason').value;
    const notes = document.getElementById('blockSlotNotes').value.trim();

    if (!date) {
      window.app.showToast('Informe a data do bloqueio.', 'danger');
      return;
    }

    // Se bloquear o dia inteiro, alertar se houver clientes já agendadas
    const existingBookings = window.dataManager.getBookingsByDate(date).filter(b => !b.isBlock && b.status !== 'CANCELADO');
    if (isAllDay && existingBookings.length > 0) {
      const names = existingBookings.map(b => `• ${b.time} - ${b.clientName} (${b.serviceNames})`).join('\n');
      const proceed = confirm(`ATENÇÃO: Já existem ${existingBookings.length} cliente(s) agendada(s) nesta data:\n\n${names}\n\nDeseja confirmar o bloqueio deste dia por imprevisto? (Lembre-se de avisar as clientes pelo WhatsApp).`);
      if (!proceed) return;
    }

    let duration = 60;
    if (!isAllDay) {
      if (!startTime || !endTime) {
        window.app.showToast('Informe o horário inicial e final do bloqueio.', 'danger');
        return;
      }
      const [h1, m1] = startTime.split(':').map(Number);
      const [h2, m2] = endTime.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff <= 0) {
        window.app.showToast('O horário de término deve ser após o horário de início.', 'danger');
        return;
      }
      duration = diff;
    }

    window.dataManager.addBlockedSlot({
      date,
      allDay: isAllDay,
      startTime,
      duration,
      reason,
      notes
    });

    this.closeBlockSlotModal();
    window.app.showToast(isAllDay ? `Data ${date} bloqueada! Nenhum cliente poderá agendar.` : 'Horário bloqueado com sucesso!', 'success');

    // Atualizar calendário e clientes
    if (window.calendarEngine) {
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    }
    if (window.bookingFlow) {
      window.bookingFlow.renderBookingMiniCal();
    }
  }

  removeBlockSlot(id) {
    window.dataManager.deleteBooking(id);
    window.app.showToast('Horário desbloqueado com sucesso!');
    if (window.calendarEngine) {
      window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
      window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
      window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    }
    if (window.bookingFlow) {
      window.bookingFlow.renderBookingMiniCal();
    }
  }

  unblockFullDate(dateStr) {
    if (confirm(`Deseja desbloquear a data ${dateStr} para permitir agendamentos normalmente?`)) {
      window.dataManager.unblockDate(dateStr);
      window.app.showToast(`Data ${dateStr} liberada para agendamentos!`, 'success');

      if (window.calendarEngine) {
        window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
        window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
        window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
      }
      if (window.bookingFlow) {
        window.bookingFlow.renderBookingMiniCal();
      }
    }
  }

  toggleManualLocationFields() {
    const isHome = document.getElementById('manualLocationHome')?.checked;
    const container = document.getElementById('manualClientAddressContainer');
    const input = document.getElementById('manualClientAddress');
    if (container) {
      container.style.display = isHome ? 'block' : 'none';
      if (isHome && input) {
        input.focus();
      }
    }
  }

  // --- Agendamento Manual pela Manicure ---
  openManualBookingModal(presetDate = null, presetTime = null) {
    const modal = document.getElementById('manualBookingModalBackdrop');
    if (!modal) return;

    const select = document.getElementById('manualBookingServiceSelect');
    if (select) {
      select.innerHTML = '';
      window.dataManager.getActiveServices().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} - R$ ${s.price.toFixed(2)} (${s.duration} min)`;
        select.appendChild(opt);
      });
    }

    const dateInput = document.getElementById('manualBookingDate');
    if (dateInput) {
      dateInput.value = presetDate || window.calendarEngine.formatDateKey(new Date());
    }

    if (presetTime) {
      const timeInput = document.getElementById('manualBookingTime');
      if (timeInput) {
        timeInput.value = presetTime;
      }
    }

    // Configurar opção de local padrão conforme configurações
    const s = window.dataManager.getSettings();
    const isHomeOnly = s.serviceLocationMode === 'home';
    const radStudio = document.getElementById('manualLocationStudio');
    const radHome = document.getElementById('manualLocationHome');
    if (isHomeOnly) {
      if (radHome) radHome.checked = true;
    } else {
      if (radStudio) radStudio.checked = true;
    }

    const addrInput = document.getElementById('manualClientAddress');
    if (addrInput) addrInput.value = '';
    this.toggleManualLocationFields();

    modal.classList.add('open');
  }

  closeManualBookingModal() {
    const modal = document.getElementById('manualBookingModalBackdrop');
    if (modal) modal.classList.remove('open');
  }

  saveManualBooking() {
    const clientName = document.getElementById('manualClientName').value.trim();
    const clientPhone = document.getElementById('manualClientPhone').value.trim();
    const serviceId = document.getElementById('manualBookingServiceSelect').value;
    const date = document.getElementById('manualBookingDate').value;
    const time = document.getElementById('manualBookingTime').value;
    const payStatus = document.getElementById('manualBookingPaymentStatus').value;
    const notes = document.getElementById('manualBookingNotes').value.trim();

    // Local do atendimento (Studio ou Domicílio)
    const isHome = document.getElementById('manualLocationHome')?.checked;
    const serviceLocation = isHome ? 'home' : 'studio';
    const clientAddress = isHome ? (document.getElementById('manualClientAddress')?.value.trim() || '') : '';

    if (!clientName || !serviceId || !date || !time) {
      window.app.showToast('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    if (isHome && !clientAddress) {
      window.app.showToast('Por favor, informe o endereço da cliente para o atendimento a domicílio.', 'warning');
      const addrEl = document.getElementById('manualClientAddress');
      if (addrEl) addrEl.focus();
      return;
    }

    const service = window.dataManager.getServiceById(serviceId);
    if (!service) return;

    const newBooking = window.dataManager.addBooking({
      clientName,
      clientPhone,
      clientEmail: '',
      serviceLocation,
      clientAddress,
      serviceIds: [service.id],
      serviceNames: service.name,
      date: date,
      time: time,
      duration: service.duration,
      totalPrice: service.price,
      paymentMethod: payStatus === 'PAGO' ? 'PIX' : 'A COMBINAR',
      paymentStatus: payStatus,
      status: 'CONFIRMADO',
      notes: notes
    });

    this.closeManualBookingModal();
    window.calendarEngine.renderMainCalendar('.calendar-grid-body', '.month-display-title');
    window.calendarEngine.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
    window.calendarEngine.renderSelectedDayAgenda('.selected-day-agenda-box');
    this.renderFinancialDashboard();
    window.app.showToast('Agendamento registrado com sucesso!', 'success');

    if (window.app && typeof window.app.triggerNewBookingAlert === 'function') {
      window.app.triggerNewBookingAlert(newBooking, true);
    }
  }
}

// Instância global disponível
window.adminManager = new AdminManager();
