/**
 * Agende-me — Booking Flow & Online Payment Controller
 * Gerencia o agendamento em etapas do cliente, geração de QR Code Pix,
 * processamento de Cartão de Crédito, Cartão de Débito, Pagamento no Local e Sinal de Reserva.
 */

class BookingFlow {
  constructor() {
    this.currentStep = 1;
    this.selectedServices = new Set();
    this.selectedDateStr = '';
    this.selectedTime = '';
    this.customerData = {
      name: '',
      phone: '',
      email: '',
      notes: ''
    };
    this.paymentMethod = 'PIX'; // 'PIX', 'CREDITO', 'DEBITO', 'LOCAL'
    this.pixQrCodeInstance = null;
    this.pixTimerInterval = null;
    this.currentCategory = 'TODOS';
    this.lastCreatedBooking = null;
    this.currentCalDate = new Date(); // Controle de navegação de meses no agendamento
    this.totalPrice = 0;
    this.amountToPayNow = 0;
    this.remainingAmount = 0;
  }

  init() {
    this.updateStudioHeader();
    this.renderCategoryFilter();
    this.renderServicesList();
    this.setupDatePickers();
    this.setupFormListeners();
    this.updateStepsUI();
  }

  // --- Atualização do Topbar com Logomarca e Nome do Studio ---
  updateStudioHeader() {
    const settings = window.dataManager.getSettings();
    const logoBadge = document.getElementById('clientBookingLogoBadge');
    const studioNameEl = document.getElementById('clientBookingStudioName');
    const subtitleEl = document.getElementById('clientBookingStudioSubtitle');

    if (studioNameEl) {
      studioNameEl.textContent = settings.studioName || 'Studio Bela Unha';
    }

    if (subtitleEl) {
      subtitleEl.textContent = settings.manicureName 
        ? `Por ${settings.manicureName} • Agendamento e Pagamento Seguro`
        : 'Agendamento e Pagamento Online Seguro';
    }

    if (logoBadge) {
      if (settings.logoUrl) {
        logoBadge.innerHTML = `<img src="${settings.logoUrl}" alt="${settings.studioName}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      } else {
        logoBadge.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
      }
    }
  }

  // --- Filtros e Lista de Serviços ---
  renderCategoryFilter() {
    const filterContainer = document.getElementById('bookingCategoryFilters');
    if (!filterContainer) return;

    const dynamicCats = (window.dataManager && typeof window.dataManager.getCategories === 'function')
      ? window.dataManager.getCategories().map(c => c.name)
      : ['Mãos', 'Pés', 'Combos', 'Gel e Alongamento', 'Spa e Cuidados'];

    if (this.currentCategory !== 'TODOS' && !dynamicCats.includes(this.currentCategory)) {
      this.currentCategory = 'TODOS';
    }

    const categories = ['TODOS', ...dynamicCats];
    filterContainer.innerHTML = '';

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `btn-pill ${this.currentCategory === cat ? 'active' : ''}`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        this.currentCategory = cat;
        this.renderCategoryFilter();
        this.renderServicesList();
      });
      filterContainer.appendChild(btn);
    });
  }

  renderServicesList() {
    const grid = document.getElementById('bookingServicesGrid');
    if (!grid) return;

    const allServices = window.dataManager.getActiveServices();
    // O modo de exibição (com foto ou sem foto) é 100% definido pela Administradora no Painel
    const showPhotosGlobal = window.dataManager.getShowServicePhotos();

    const filtered = this.currentCategory === 'TODOS' 
      ? allServices 
      : allServices.filter(s => {
          const sCat = (s.category || '').toLowerCase().replace('&', 'e');
          const curCat = this.currentCategory.toLowerCase().replace('&', 'e');
          return sCat === curCat;
        });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--color-text-500);">Nenhum serviço disponível nesta categoria.</p>`;
      return;
    }

    filtered.forEach(s => {
      const isSelected = this.selectedServices.has(s.id);
      const hasPhoto = showPhotosGlobal && s.hasPhoto !== false && s.image;
      const card = document.createElement('div');
      card.className = `client-service-card ${isSelected ? 'selected' : ''} ${hasPhoto ? '' : 'no-photo'}`;

      let imageHtml = '';
      if (hasPhoto) {
        imageHtml = `<img class="client-service-img" src="${s.image}" alt="${s.name}" onerror="this.src='assets/manicure.jpg'">`;
      }

      card.innerHTML = `
        ${imageHtml}
        <div class="client-service-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span class="badge badge-brand">${s.category.replace('&', 'e')}</span>
            <span class="client-service-duration">⏱️ ${s.duration} min</span>
          </div>
          <h3 class="client-service-title">${s.name.replace('&', 'e')}</h3>
          <p class="client-service-desc">${s.description || 'Procedimento profissional completo.'}</p>
          <div class="client-service-footer">
            <span class="client-service-price">R$ ${s.price.toFixed(2)}</span>
            <button class="btn-select-service">${isSelected ? '✓ Selecionado' : '+ Selecionar'}</button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.selectedServices.has(s.id)) {
          this.selectedServices.delete(s.id);
        } else {
          this.selectedServices.add(s.id);
        }
        this.renderServicesList();
        this.updateCartSummary();
      });

      grid.appendChild(card);
    });

    this.updateCartSummary();
  }

  getServicesTotal() {
    const selectedList = Array.from(this.selectedServices).map(id => window.dataManager.getServiceById(id)).filter(Boolean);
    return selectedList.reduce((acc, s) => acc + s.price, 0);
  }

  getHomeFee() {
    const isHome = document.getElementById('clientLocHome')?.checked;
    if (!isHome) return 0;
    const settings = window.dataManager.getSettings();
    return parseFloat(settings.homeServiceFee) || 0;
  }

  updateCartSummary() {
    const countEl = document.getElementById('summaryServiceCount');
    const timeEl = document.getElementById('summaryTotalDuration');
    const priceEl = document.getElementById('summaryTotalPrice');
    const nextBtn = document.getElementById('btnNextStep1');

    const selectedList = Array.from(this.selectedServices).map(id => window.dataManager.getServiceById(id)).filter(Boolean);
    const totalCount = selectedList.length;
    const totalDuration = selectedList.reduce((acc, s) => acc + s.duration, 0);
    const servicesTotal = this.getServicesTotal();
    const homeFee = this.getHomeFee();
    const totalPrice = servicesTotal + homeFee;

    this.servicesTotal = servicesTotal;
    this.homeFee = homeFee;
    this.totalPrice = totalPrice;

    if (countEl) countEl.textContent = `${totalCount} ${totalCount === 1 ? 'serviço' : 'serviços'}`;
    if (timeEl) timeEl.textContent = `${totalDuration} min`;
    if (priceEl) priceEl.textContent = `R$ ${totalPrice.toFixed(2)}`;

    if (nextBtn) nextBtn.disabled = totalCount === 0;

    this.updateFooterBar();
  }

  // --- Etapa 2: Data e Horário ---
  setupDatePickers() {
    const now = new Date();
    this.currentCalDate = new Date();
    this.selectedDateStr = window.calendarEngine.formatDateKey(now);

    this.renderBookingMiniCal();
    this.renderAvailableSlots();
  }

  prevCalMonth() {
    const today = new Date();
    if (this.currentCalDate.getFullYear() === today.getFullYear() && this.currentCalDate.getMonth() <= today.getMonth()) {
      return;
    }
    this.currentCalDate.setMonth(this.currentCalDate.getMonth() - 1);
    this.renderBookingMiniCal();
  }

  nextCalMonth() {
    this.currentCalDate.setMonth(this.currentCalDate.getMonth() + 1);
    this.renderBookingMiniCal();
  }

  renderBookingMiniCal() {
    const container = document.getElementById('bookingDateCalendar');
    if (!container) return;

    const year = this.currentCalDate.getFullYear();
    const month = this.currentCalDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
        <span style="font-weight:700; font-size:16px; color: var(--color-brand-900);">
          ${window.calendarEngine.months[month]} de ${year}
        </span>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-pill" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; font-size:18px; line-height:1; ${isCurrentMonth ? 'opacity:0.3; cursor:not-allowed;' : ''}" 
                  ${isCurrentMonth ? 'disabled' : ''} 
                  onclick="window.bookingFlow.prevCalMonth()" title="Mês anterior" aria-label="Mês anterior">‹</button>
          <button type="button" class="btn-pill" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; font-size:18px; line-height:1;" 
                  onclick="window.bookingFlow.nextCalMonth()" title="Próximo mês" aria-label="Próximo mês">›</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); text-align:center; font-size:11px; font-weight:700; color:var(--color-text-500); margin-bottom:8px;">
        <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;">
    `;

    const firstDayIndex = new Date(year, month, 1).getDay();
    for (let x = 0; x < firstDayIndex; x++) {
      html += `<div></div>`;
    }

    const settings = window.dataManager.getSettings();
    const maxDays = settings.maxDaysAhead || 30;
    const maxLimitDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxDays);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isTooFar = d > maxLimitDate;
      const isClosed = settings.workDays && !settings.workDays.includes(d.getDay());
      const dateKey = window.calendarEngine.formatDateKey(d);
      const isBlockedDate = window.dataManager.isDateFullyBlocked(dateKey);
      const isUnavailable = isPast || isTooFar || isClosed || isBlockedDate;
      const isSelected = dateKey === this.selectedDateStr;

      let titleAttr = `Agendar para ${day}/${month+1}`;
      if (isPast) titleAttr = 'Data passada';
      else if (isTooFar) titleAttr = `Data além da antecedência permitida (${maxDays} dias)`;
      else if (isClosed) titleAttr = 'Studio fechado neste dia da semana';
      else if (isBlockedDate) titleAttr = 'Data bloqueada pela manicure (imprevisto ou recesso)';

      let blockedStyle = '';
      if (isBlockedDate) {
        blockedStyle = 'text-decoration: line-through; background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;';
      }

      html += `
        <button type="button" class="mini-cal-day ${isSelected ? 'selected' : ''}" 
                style="${isUnavailable ? 'opacity:0.4; cursor:not-allowed;' : ''} ${blockedStyle}"
                ${isUnavailable ? 'disabled' : ''} 
                title="${titleAttr}"
                onclick="window.bookingFlow.selectDate('${dateKey}')">
          ${day}
        </button>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  ensureValidDateSelected() {
    const selectedList = Array.from(this.selectedServices).map(id => window.dataManager.getServiceById(id)).filter(Boolean);
    const totalDuration = selectedList.reduce((acc, s) => acc + s.duration, 0) || 45;

    // Verificar se a data já selecionada tem slots livres
    if (this.selectedDateStr) {
      const currentSlots = window.calendarEngine.getAvailableSlots(this.selectedDateStr, totalDuration);
      if (currentSlots.length > 0) {
        return; // Data atual já tem horários disponíveis
      }
    }

    // Se hoje já passou do horário de fechamento ou está sem vagas, avançar para a próxima data com vaga
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const testKey = window.calendarEngine.formatDateKey(testDate);
      if (window.dataManager.isDateFullyBlocked(testKey)) continue;

      const slots = window.calendarEngine.getAvailableSlots(testKey, totalDuration);
      if (slots.length > 0) {
        this.selectedDateStr = testKey;
        this.currentCalDate = new Date(testDate);
        break;
      }
    }
  }

  selectDate(dateStr) {
    if (window.dataManager.isDateFullyBlocked(dateStr)) {
      window.app.showToast('Esta data está bloqueada pela profissional devido a um imprevisto ou férias.', 'warning');
      return;
    }

    this.selectedDateStr = dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    this.currentCalDate = new Date(y, m - 1, d);
    this.selectedTime = '';
    this.renderBookingMiniCal();
    this.renderAvailableSlots();
    this.checkStep2Validity();
    this.updateFooterBar();
  }

  selectSlot(time) {
    this.selectedTime = time;
    this.renderAvailableSlots();
    this.checkStep2Validity();
    this.updateFooterBar();
    window.app.showToast(`Horário das ${time} selecionado!`, 'success');
  }

  renderAvailableSlots() {
    const slotsGrid = document.getElementById('bookingTimeSlots');
    if (!slotsGrid) return;

    if (!this.selectedDateStr) {
      slotsGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--color-text-500);">Selecione um dia no calendário primeiro.</p>`;
      return;
    }

    if (window.dataManager.isDateFullyBlocked(this.selectedDateStr)) {
      slotsGrid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:30px 16px; background-color:#fee2e2; border:1px solid #fca5a5; border-radius:var(--radius-md); color:#991b1b;">
          <div style="display:flex; justify-content:center; margin-bottom:8px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
          </div>
          <strong style="font-size:14px; display:block; margin-bottom:4px;">Dia Indisponível</strong>
          <span style="font-size:13px;">A manicure não atenderá nesta data devido a um imprevisto ou recesso. Por favor, escolha outro dia.</span>
        </div>
      `;
      return;
    }

    const selectedList = Array.from(this.selectedServices).map(id => window.dataManager.getServiceById(id)).filter(Boolean);
    const totalDuration = selectedList.reduce((acc, s) => acc + s.duration, 0) || 45;

    const slots = window.calendarEngine.getAvailableSlots(this.selectedDateStr, totalDuration);

    slotsGrid.innerHTML = '';

    // Atualizar banner de horário selecionado
    const banner = document.getElementById('bookingSelectedSlotBanner');
    const slotText = document.getElementById('bookingSelectedSlotText');
    if (banner && slotText) {
      if (this.selectedTime) {
        banner.style.display = 'flex';
        const [y, m, d] = (this.selectedDateStr || '').split('-');
        slotText.textContent = `${this.selectedTime} (Dia ${d}/${m})`;
      } else {
        banner.style.display = 'none';
      }
    }

    if (slots.length === 0) {
      slotsGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--color-text-500);">Nenhum horário livre nesta data para a duração selecionada (${totalDuration} min). Por favor, selecione outro dia no calendário.</p>`;
      return;
    }

    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = slot.time === this.selectedTime;
      btn.className = `slot-btn time-slot-btn ${isSelected ? 'selected' : ''}`;

      if (!slot.available) {
        btn.disabled = true;
        btn.title = 'Horário indisponível ou já reservado';
        btn.textContent = slot.time;
      } else {
        if (isSelected) {
          btn.innerHTML = `<span style="font-weight:800; font-size:15px; margin-right:4px;">✓</span> ${slot.time}`;
        } else {
          btn.textContent = slot.time;
        }
        btn.onclick = (e) => {
          e.preventDefault();
          this.selectSlot(slot.time);
        };
      }

      slotsGrid.appendChild(btn);
    });
  }

  checkStep2Validity() {
    const btnNext = document.getElementById('btnNextStep2');
    if (btnNext) {
      const isValid = Boolean(this.selectedDateStr && this.selectedTime);
      btnNext.disabled = !isValid;
      if (isValid) {
        btnNext.style.boxShadow = '0 0 0 3px rgba(7, 24, 84, 0.25)';
        btnNext.innerHTML = `<span>Continuar</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
      } else {
        btnNext.style.boxShadow = 'none';
        btnNext.innerHTML = `<span>${this.selectedTime ? 'Continuar' : 'Escolha o Horário'}</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
      }
    }
  }

  // --- Etapa 3: Dados de Contato e Ouvintes dos Cartões ---
  setupFormListeners() {
    const nameInput = document.getElementById('clientNameInput');
    const phoneInput = document.getElementById('clientPhoneInput');

    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 6) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
        } else if (v.length > 2) {
          e.target.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        } else {
          e.target.value = v;
        }

        if (v.length >= 10) {
          this.lookupAndFillClient(v);
        } else {
          this.hideReturningClientAlert();
        }

        this.checkStep3Validity();
      });
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => this.checkStep3Validity());
    }

    const addrInput = document.getElementById('clientAddressInput');
    if (addrInput) {
      addrInput.addEventListener('input', () => this.checkStep3Validity());
    }

    // Formulário do Cartão de Crédito
    const ccNumber = document.getElementById('ccNumber');
    if (ccNumber) {
      ccNumber.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 16);
        let formatted = v.match(/.{1,4}/g)?.join(' ') || v;
        e.target.value = formatted;
        const display = document.getElementById('ccDisplayNumber');
        if (display) display.textContent = formatted || '•••• •••• •••• ••••';
      });
    }

    const ccHolder = document.getElementById('ccHolder');
    if (ccHolder) {
      ccHolder.addEventListener('input', (e) => {
        const display = document.getElementById('ccDisplayHolder');
        if (display) display.textContent = e.target.value.toUpperCase() || 'NOME DO TITULAR';
      });
    }

    const ccExpiry = document.getElementById('ccExpiry');
    if (ccExpiry) {
      ccExpiry.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
        e.target.value = v;
        const display = document.getElementById('ccDisplayExpiry');
        if (display) display.textContent = v || 'MM/AA';
      });
    }

    // Formulário do Cartão de Débito
    const debNumber = document.getElementById('debNumber');
    if (debNumber) {
      debNumber.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 16);
        let formatted = v.match(/.{1,4}/g)?.join(' ') || v;
        e.target.value = formatted;
        const display = document.getElementById('debDisplayNumber');
        if (display) display.textContent = formatted || '•••• •••• •••• ••••';
      });
    }

    const debHolder = document.getElementById('debHolder');
    if (debHolder) {
      debHolder.addEventListener('input', (e) => {
        const display = document.getElementById('debDisplayHolder');
        if (display) display.textContent = e.target.value.toUpperCase() || 'NOME DO TITULAR';
      });
    }

    const debExpiry = document.getElementById('debExpiry');
    if (debExpiry) {
      debExpiry.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
        e.target.value = v;
        const display = document.getElementById('debDisplayExpiry');
        if (display) display.textContent = v || 'MM/AA';
      });
    }
  }

  checkStep3Validity() {
    const name = document.getElementById('clientNameInput')?.value.trim();
    const phone = document.getElementById('clientPhoneInput')?.value.trim();
    const isStudio = document.getElementById('clientLocStudio')?.checked;
    const isHome = document.getElementById('clientLocHome')?.checked;
    const address = document.getElementById('clientAddressInput')?.value.trim();

    const settings = window.dataManager.getSettings();
    const mode = settings.serviceLocationMode || 'both';

    let valid = !!(name && name.length >= 3 && phone && phone.length >= 14);

    // No modo 'both', a cliente precisa obrigatoriamente marcar uma das opções
    if (mode === 'both') {
      const locationChosen = !!(isStudio || isHome);
      valid = valid && locationChosen;
    }

    // Se a opção selecionada for domicílio, o endereço é obrigatório
    if (isHome) {
      valid = valid && !!(address && address.length >= 5);
    }

    const btn = document.getElementById('btnNextStep3');
    if (btn) {
      btn.disabled = !valid;
    }
  }

  onLocationChange() {
    this.userExplicitlyPickedLocation = true;
    const isStudio = document.getElementById('clientLocStudio')?.checked;
    const isHome = document.getElementById('clientLocHome')?.checked;
    const addrGroup = document.getElementById('clientAddressGroup');
    const addrInput = document.getElementById('clientAddressInput');
    const studioBadge = document.getElementById('studioAddressBadgeInfo');
    const lblStudio = document.getElementById('clientLocStudioLabel');
    const lblHome = document.getElementById('clientLocHomeLabel');

    if (addrGroup) {
      addrGroup.style.display = isHome ? 'block' : 'none';
      if (isHome && addrInput) {
        addrInput.focus();
      }
    }
    if (studioBadge) {
      // Exibe o endereço do studio apenas quando 'No Studio' for selecionado
      studioBadge.style.display = isStudio ? 'flex' : 'none';
    }
    if (lblStudio) {
      lblStudio.style.borderColor = isStudio ? 'var(--color-brand-700)' : '';
      lblStudio.style.background = isStudio ? 'var(--color-brand-100)' : '';
    }
    if (lblHome) {
      lblHome.style.borderColor = isHome ? 'var(--color-brand-700)' : '';
      lblHome.style.background = isHome ? 'var(--color-brand-100)' : '';
    }

    // Atualiza imediatamente o cálculo do valor total no footer (com ou sem taxa de deslocamento)
    this.updateCartSummary();
    this.checkStep3Validity();
  }

  prepareStep3() {
    const settings = window.dataManager.getSettings();
    const studioAddrEl = document.getElementById('studioAddressDisplay');
    if (studioAddrEl) {
      studioAddrEl.textContent = settings.address || 'Studio Bela Unha';
    }

    // Exibir indicação de taxa de deslocamento no botão Na Minha Casa
    const homeFee = parseFloat(settings.homeServiceFee) || 0;
    const homeFeeSubtext = document.getElementById('clientLocHomeFeeText');
    if (homeFeeSubtext) {
      if (homeFee > 0) {
        homeFeeSubtext.textContent = `+ R$ ${homeFee.toFixed(2)} taxa`;
        homeFeeSubtext.style.color = '#15803d';
        homeFeeSubtext.style.fontWeight = '700';
      } else {
        homeFeeSubtext.textContent = 'Sem taxa extra';
        homeFeeSubtext.style.color = 'var(--color-text-500)';
        homeFeeSubtext.style.fontWeight = '500';
      }
    }

    const mode = settings.serviceLocationMode || 'both';
    const radStudio = document.getElementById('clientLocStudio');
    const radHome = document.getElementById('clientLocHome');
    const buttonsGrid = document.getElementById('clientLocationButtonsGrid');

    if (mode === 'studio') {
      if (radStudio) radStudio.checked = true;
      if (radHome) radHome.checked = false;
      if (buttonsGrid) buttonsGrid.style.display = 'none';
    } else if (mode === 'home') {
      if (radHome) radHome.checked = true;
      if (radStudio) radStudio.checked = false;
      if (buttonsGrid) buttonsGrid.style.display = 'none';
    } else {
      // Modo 'both': deve vir desmarcado para que a cliente escolha conscientemente
      if (buttonsGrid) buttonsGrid.style.display = 'grid';
      if (!this.userExplicitlyPickedLocation) {
        if (radStudio) radStudio.checked = false;
        if (radHome) radHome.checked = false;
      }
    }

    this.onLocationChange();

    // Reconhecimento automático: se o campo estiver vazio, verificar se há telefone salvo da última visita
    const phoneInput = document.getElementById('clientPhoneInput');
    if (phoneInput) {
      let currentVal = phoneInput.value.replace(/\D/g, '');
      if (!currentVal) {
        const savedPhone = localStorage.getItem('maoepe_last_client_phone');
        if (savedPhone) {
          const v = savedPhone.replace(/\D/g, '');
          if (v.length > 6) {
            phoneInput.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
          } else if (v.length > 2) {
            phoneInput.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
          } else {
            phoneInput.value = v;
          }
          currentVal = v;
        }
      }
      if (currentVal && currentVal.length >= 10) {
        this.lookupAndFillClient(currentVal);
      }
    }
    this.checkStep3Validity();
  }

  // --- Auto-identificação Inteligente de Cliente Recorrente ---
  lookupAndFillClient(phoneVal) {
    if (!phoneVal) return;
    const cleanPhone = phoneVal.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;

    const clients = window.dataManager.getClients();
    const existing = clients.find(c => {
      const cp = (c.phone || '').replace(/\D/g, '');
      if (!cp) return false;
      return cp === cleanPhone || 
             (cleanPhone.length === 11 && cp.endsWith(cleanPhone.slice(-9))) || 
             (cp.length === 11 && cleanPhone.endsWith(cp.slice(-9)));
    });

    const alertEl = document.getElementById('returningClientAlert');
    const nameEl = document.getElementById('returningClientName');
    const badgeEl = document.getElementById('phoneRecognizedBadge');
    const nameInput = document.getElementById('clientNameInput');
    const emailInput = document.getElementById('clientEmailInput');
    const addrInput = document.getElementById('clientAddressInput');

    if (existing) {
      const firstName = (existing.name || 'Cliente').trim().split(' ')[0];
      if (nameEl) nameEl.textContent = firstName;
      if (alertEl) alertEl.style.display = 'block';
      if (badgeEl) badgeEl.style.display = 'inline-flex';

      // Auto-preencher dados se estiverem vazios ou se foram preenchidos pelo auto-complete
      if (nameInput && (!nameInput.value.trim() || this.autoFilledByLookup)) {
        nameInput.value = existing.name;
      }
      if (emailInput && (!emailInput.value.trim() || this.autoFilledByLookup) && existing.email) {
        emailInput.value = existing.email;
      }
      if (addrInput && (!addrInput.value.trim() || this.autoFilledByLookup) && existing.address) {
        addrInput.value = existing.address;
      }

      this.autoFilledByLookup = true;
      this.recognizedClientId = existing.id;
      this.checkStep3Validity();
    } else {
      this.hideReturningClientAlert();
    }
  }

  hideReturningClientAlert() {
    const alertEl = document.getElementById('returningClientAlert');
    const badgeEl = document.getElementById('phoneRecognizedBadge');
    if (alertEl) alertEl.style.display = 'none';
    if (badgeEl) badgeEl.style.display = 'none';
    this.recognizedClientId = null;
  }

  clearRecognizedClient() {
    const nameInput = document.getElementById('clientNameInput');
    const phoneInput = document.getElementById('clientPhoneInput');
    const emailInput = document.getElementById('clientEmailInput');
    const addrInput = document.getElementById('clientAddressInput');
    const notesInput = document.getElementById('clientNotesInput');
    const radStudio = document.getElementById('clientLocStudio');
    const radHome = document.getElementById('clientLocHome');

    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (emailInput) emailInput.value = '';
    if (addrInput) addrInput.value = '';
    if (notesInput) notesInput.value = '';
    if (radStudio) radStudio.checked = false;
    if (radHome) radHome.checked = false;
    this.userExplicitlyPickedLocation = false;
    this.onLocationChange();

    localStorage.removeItem('maoepe_last_client_phone');
    this.autoFilledByLookup = false;
    this.hideReturningClientAlert();
    this.checkStep3Validity();

    if (phoneInput) phoneInput.focus();
  }

  // --- Etapa 4: Preparação Dinâmica do Pagamento (Sinal, Débito, Crédito, Pix, Local) ---
  prepareStep4() {
    const settings = window.dataManager.getSettings();
    const servicesTotal = this.getServicesTotal();
    const homeFee = this.getHomeFee();
    const totalPrice = servicesTotal + homeFee;

    this.servicesTotal = servicesTotal;
    this.homeFee = homeFee;
    this.totalPrice = totalPrice;

    // Cálculo da Política de Pagamento (100% online, Sinal de Reserva, ou Local)
    const policy = settings.depositPolicy || 'full';
    let amountToPayNow = totalPrice;
    let remainingAmount = 0;

    if (policy === 'deposit') {
      if (settings.depositType === 'fixed') {
        amountToPayNow = Math.min(settings.depositFixedAmount || 20, totalPrice);
      } else {
        const pct = settings.depositPercentage || 30;
        amountToPayNow = Math.round((totalPrice * pct) / 100 * 100) / 100;
      }
      remainingAmount = Math.max(0, totalPrice - amountToPayNow);
    } else if (policy === 'local') {
      amountToPayNow = 0;
      remainingAmount = totalPrice;
    }

    this.amountToPayNow = amountToPayNow;
    this.remainingAmount = remainingAmount;

    // Renderizar Aviso de Política / Sinal de Reserva
    const noticeEl = document.getElementById('paymentSummaryNotice');
    if (noticeEl) {
      const isHome = document.getElementById('clientLocHome')?.checked;
      const breakdownFeeHtml = (isHome && homeFee > 0) ? `
        <div style="font-size:12px; margin-top:10px; padding-top:8px; border-top:1px dashed rgba(0,0,0,0.12); color:var(--color-text-600); display:flex; justify-content:space-between; align-items:center;">
          <span>Procedimentos: <strong>R$ ${servicesTotal.toFixed(2)}</strong> + Deslocamento: <strong style="color:#15803d;">R$ ${homeFee.toFixed(2)}</strong></span>
          <span style="font-weight:700; color:var(--color-brand-900);">Total: R$ ${totalPrice.toFixed(2)}</span>
        </div>
      ` : '';

      if (policy === 'deposit') {
        noticeEl.innerHTML = `
          <div class="deposit-summary-box">
            <div class="deposit-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Sinal de Reserva (Garantia de Horário)
            </div>
            <p class="deposit-desc">
              Para assegurar seu horário na agenda, pague o sinal de reserva agora. O restante do valor será acertado no dia do seu atendimento.
            </p>
            <div class="deposit-values-row">
              <div>
                <span class="deposit-lbl">Valor Total</span>
                <span class="deposit-val">R$ ${totalPrice.toFixed(2)}</span>
              </div>
              <div>
                <span class="deposit-lbl">Sinal a Pagar Agora</span>
                <span class="deposit-val-highlight">R$ ${amountToPayNow.toFixed(2)}</span>
              </div>
              <div>
                <span class="deposit-lbl">Restante no Atendimento</span>
                <span class="deposit-val">R$ ${remainingAmount.toFixed(2)}</span>
              </div>
            </div>
            ${breakdownFeeHtml}
          </div>
        `;
      } else if (policy === 'local') {
        noticeEl.innerHTML = `
          <div class="deposit-summary-box" style="background:#f0fdf4; border-color:#bbf7d0;">
            <div class="deposit-badge" style="background:#16a34a;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Pagamento Presencial
            </div>
            <p class="deposit-desc" style="color:#14532d; margin-bottom:0;">
              Nosso studio não exige pagamento antecipado! Sua reserva é confirmada gratuitamente e o valor total de <strong>R$ ${totalPrice.toFixed(2)}</strong> é pago no dia do seu atendimento.
            </p>
            ${breakdownFeeHtml}
          </div>
        `;
      } else {
        noticeEl.innerHTML = `
          <div class="deposit-summary-box" style="background:#f8fafc; border-color:#e2e8f0;">
            <div class="deposit-badge" style="background:#071854;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Pagamento Seguro
            </div>
            <p class="deposit-desc" style="margin-bottom:0; color:var(--color-text-700);">
              Valor total: <strong>R$ ${totalPrice.toFixed(2)}</strong>. Escolha sua forma de pagamento abaixo para confirmação imediata.
            </p>
            ${breakdownFeeHtml}
          </div>
        `;
      }
    }

    // Verificar se a cliente possui bloqueio individual de pagamento no local
    const enteredPhone = (document.getElementById('clientPhoneInput')?.value || '').replace(/\D/g, '');
    const enteredName = (document.getElementById('clientNameInput')?.value || '').trim().toLowerCase();
    const existingClient = window.dataManager.getClients().find(c => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      const cName = (c.name || '').trim().toLowerCase();
      return (enteredPhone && cPhone && enteredPhone === cPhone) || (enteredName && cName && enteredName === cName);
    });

    const isClientBlockedFromLocal = existingClient && !!existingClient.blockLocalPayment;
    this.isClientBlockedFromLocal = isClientBlockedFromLocal;

    // Configurar Visibilidade das Abas de Pagamento
    const methods = settings.paymentMethods || { pix: true, creditCard: true, debitCard: true, local: true };
    const tabPix = document.getElementById('tabPix');
    const tabCredit = document.getElementById('tabCredit');
    const tabDebit = document.getElementById('tabDebit');
    const tabLocal = document.getElementById('tabLocal');

    if (isClientBlockedFromLocal) {
      // Bloquear e ocultar opção no local para esta cliente
      if (tabLocal) tabLocal.style.display = 'none';
      if (tabPix) tabPix.style.display = 'flex';
      if (tabCredit) tabCredit.style.display = 'flex';
      if (tabDebit) tabDebit.style.display = 'flex';

      // Aviso em destaque informando a exigência de pagamento online
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div class="deposit-summary-box" style="background:#fef2f2; border-color:#fca5a5;">
            <div class="deposit-badge" style="background:#dc2626;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Pagamento Antecipado Obrigatório
            </div>
            <p class="deposit-desc" style="color:#991b1b; margin-bottom:0;">
              Para o seu perfil, este agendamento precisa ser garantido online via Pix, Cartão de Crédito ou Débito.
            </p>
          </div>
        `;
      }

      if (methods.pix !== false) {
        this.switchPaymentTab('PIX');
      } else if (methods.creditCard !== false) {
        this.switchPaymentTab('CREDITO');
      } else {
        this.switchPaymentTab('DEBITO');
      }
    } else {
      if (tabPix) tabPix.style.display = methods.pix !== false && policy !== 'local' ? 'flex' : 'none';
      if (tabCredit) tabCredit.style.display = methods.creditCard !== false && policy !== 'local' ? 'flex' : 'none';
      if (tabDebit) tabDebit.style.display = methods.debitCard !== false && policy !== 'local' ? 'flex' : 'none';
      if (tabLocal) tabLocal.style.display = (methods.local !== false || policy === 'local') ? 'flex' : 'none';

      // Selecionar aba ativa padrão coerente
      if (policy === 'local') {
        this.switchPaymentTab('LOCAL');
      } else {
        if (methods.pix !== false) {
          this.switchPaymentTab('PIX');
        } else if (methods.creditCard !== false) {
          this.switchPaymentTab('CREDITO');
        } else if (methods.debitCard !== false) {
          this.switchPaymentTab('DEBITO');
        } else {
          this.switchPaymentTab('LOCAL');
        }
      }
    }

    // Atualizar labels de valor nos botões e caixas
    const btnCredit = document.getElementById('btnSubmitCredit');
    if (btnCredit) {
      btnCredit.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Pagar no Crédito (R$ ${amountToPayNow.toFixed(2)}) e Confirmar`;
    }

    const btnDebit = document.getElementById('btnSubmitDebit');
    if (btnDebit) {
      btnDebit.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Autorizar Débito em Conta (R$ ${amountToPayNow.toFixed(2)}) e Confirmar`;
    }

    const localValEl = document.getElementById('localTotalValue');
    if (localValEl) {
      localValEl.textContent = `R$ ${totalPrice.toFixed(2)}`;
    }
  }

  switchPaymentTab(method) {
    this.paymentMethod = method;

    const tabs = {
      PIX: document.getElementById('tabPix'),
      CREDITO: document.getElementById('tabCredit'),
      DEBITO: document.getElementById('tabDebit'),
      LOCAL: document.getElementById('tabLocal')
    };

    const panels = {
      PIX: document.getElementById('panelPix'),
      CREDITO: document.getElementById('panelCredit'),
      DEBITO: document.getElementById('panelDebit'),
      LOCAL: document.getElementById('panelLocal')
    };

    Object.keys(tabs).forEach(k => {
      if (tabs[k]) {
        tabs[k].classList.toggle('active', k === method);
      }
      if (panels[k]) {
        panels[k].classList.toggle('active', k === method);
      }
    });

    if (method === 'PIX') {
      this.generatePixPayment();
    }
    this.updateFooterBar();
  }

  generatePixPayment() {
    const qrContainer = document.getElementById('pixQrContainer');
    const codeInput = document.getElementById('pixCopiaColaInput');
    const amountEl = document.getElementById('pixAmountDisplay');
    const labelEl = document.getElementById('pixLabelAmount');
    if (!qrContainer) return;

    const settings = window.dataManager.getSettings();
    const chargeVal = this.amountToPayNow || this.totalPrice;

    if (amountEl) {
      amountEl.textContent = `R$ ${chargeVal.toFixed(2)}`;
    }

    if (labelEl) {
      labelEl.textContent = settings.depositPolicy === 'deposit' 
        ? 'Sinal de Reserva a pagar via Pix:' 
        : 'Total a pagar via Pix:';
    }

    // Payload simulado no padrão BR Code / Pix EMV
    const txId = 'AGENDE' + Math.floor(100000 + Math.random() * 900000);
    const pixPayload = `00020126580014br.gov.bcb.pix0111${settings.pixKey || '11987654321'}5204000053039865405${chargeVal.toFixed(2)}5802BR5916${(settings.studioName || 'Studio').substring(0, 16)}6009SAO PAULO62170513${txId}6304ABCD`;

    if (codeInput) {
      codeInput.value = pixPayload;
    }

    // Gerar QR Code via qrcode.min.js
    qrContainer.innerHTML = '';
    try {
      if (window.QRCode) {
        new QRCode(qrContainer, {
          text: pixPayload,
          width: 196,
          height: 196,
          colorDark: '#071854',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=196x196&data=${encodeURIComponent(pixPayload)}" alt="QR Code Pix" style="width:196px; height:196px;">`;
      }
    } catch (e) {
      qrContainer.innerHTML = `<p style="font-size:12px; color:var(--color-danger-500);">QR Code Pix gerado para pagamento.</p>`;
    }

    // Iniciar cronômetro de 15 minutos
    this.startPixTimer(15 * 60);
  }

  startPixTimer(durationSeconds) {
    if (this.pixTimerInterval) clearInterval(this.pixTimerInterval);
    let timer = durationSeconds;
    const timerEl = document.getElementById('pixTimerDisplay');

    this.pixTimerInterval = setInterval(() => {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      if (timerEl) {
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      if (--timer < 0) {
        clearInterval(this.pixTimerInterval);
        if (timerEl) timerEl.textContent = 'Expirado';
      }
    }, 1000);
  }

  copyPixCode() {
    const codeInput = document.getElementById('pixCopiaColaInput');
    if (codeInput) {
      codeInput.select();
      navigator.clipboard.writeText(codeInput.value).then(() => {
        window.app.showToast('Código Pix Copia e Cola copiado com sucesso!', 'success');
      }).catch(() => {
        document.execCommand('copy');
        window.app.showToast('Código Pix copiado!', 'success');
      });
    }
  }

  // Simular Pagamento Pix Instantâneo
  simulatePixPaymentSuccess() {
    window.app.showToast('Pagamento Pix detectado pelo Banco Central! Confirmando agendamento...', 'success');
    setTimeout(() => {
      this.completeBooking('PIX', 'PAGO');
    }, 1000);
  }

  // Processar Pagamento Cartão de Crédito
  processCreditCardPayment() {
    const btn = document.getElementById('btnSubmitCredit');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Processando com a operadora...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      window.app.showToast('Pagamento com Cartão de Crédito aprovado!', 'success');
      this.completeBooking('CARTAO_CREDITO', 'PAGO');
    }, 1400);
  }

  // Processar Pagamento Cartão de Débito
  processDebitCardPayment() {
    const btn = document.getElementById('btnSubmitDebit');
    const bankSelect = document.getElementById('debBankSelect');
    const bankName = bankSelect ? bankSelect.value : 'banco emissor';
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Autenticando com ${bankName}...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      window.app.showToast(`Débito online autorizado com sucesso pelo ${bankName}!`, 'success');
      this.completeBooking('CARTAO_DEBITO', 'PAGO');
    }, 1500);
  }

  // Simular Pagamento Cartão de Débito Aprovado
  simulateDebitPaymentSuccess() {
    window.app.showToast('Autenticação do Cartão de Débito concluída com sucesso!', 'success');
    setTimeout(() => {
      this.completeBooking('CARTAO_DEBITO', 'PAGO');
    }, 900);
  }

  // Processar Pagamento no Local (Studio)
  processLocalPayment() {
    const btn = document.getElementById('btnConfirmLocal');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Confirmando reserva...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `✓ Confirmar Agendamento (Pagar no Studio)`;
      window.app.showToast('Agendamento confirmado! O acerto será feito no Studio.', 'success');
      this.completeBooking('PAGAR_NO_LOCAL', 'A_PAGAR_NO_LOCAL');
    }, 800);
  }

  // --- Finalização e Criação do Agendamento ---
  completeBooking(paymentMethod, paymentStatus) {
    if (this.pixTimerInterval) clearInterval(this.pixTimerInterval);

    // Validação de segurança para bloqueio individual
    if (paymentMethod === 'PAGAR_NO_LOCAL' && this.isClientBlockedFromLocal) {
      if (window.app) window.app.showToast('Esta cliente possui restrição para pagamento no local. Escolha Pix ou Cartão.', 'danger');
      return;
    }

    const name = document.getElementById('clientNameInput')?.value.trim() || 'Cliente';
    const phone = document.getElementById('clientPhoneInput')?.value.trim() || '';
    const email = document.getElementById('clientEmailInput')?.value.trim() || '';
    const notes = document.getElementById('clientNotesInput')?.value.trim() || '';

    // Local do atendimento
    const isHome = document.getElementById('clientLocHome')?.checked;
    const serviceLocation = isHome ? 'home' : 'studio';
    const clientAddress = isHome ? (document.getElementById('clientAddressInput')?.value.trim() || '') : '';
    const homeFee = isHome ? this.getHomeFee() : 0;

    const selectedList = Array.from(this.selectedServices).map(id => window.dataManager.getServiceById(id)).filter(Boolean);
    const serviceNames = selectedList.map(s => s.name.replace('&', 'e')).join(' + ');
    const totalDuration = selectedList.reduce((acc, s) => acc + s.duration, 0);
    const settings = window.dataManager.getSettings();

    const booking = window.dataManager.addBooking({
      clientName: name,
      clientPhone: phone,
      clientEmail: email,
      serviceLocation: serviceLocation,
      clientAddress: clientAddress,
      homeServiceFee: homeFee,
      serviceIds: Array.from(this.selectedServices),
      serviceNames: serviceNames,
      date: this.selectedDateStr,
      time: this.selectedTime,
      duration: totalDuration,
      totalPrice: this.totalPrice,
      amountPaidNow: this.amountToPayNow,
      remainingAmount: this.remainingAmount,
      depositPolicy: settings.depositPolicy || 'full',
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      status: 'CONFIRMADO',
      notes: notes
    });

    // Salvar telefone no localStorage para reconhecimento rápido no próximo agendamento
    if (phone) {
      localStorage.setItem('maoepe_last_client_phone', phone);
    }

    // Disparar aviso no painel da manicure com sinal sonoro
    if (window.app && typeof window.app.triggerNewBookingAlert === 'function') {
      window.app.triggerNewBookingAlert(booking, true);
    }

    this.lastCreatedBooking = booking;
    this.goToStep(5);
    this.renderVoucher(booking);
  }

  renderVoucher(booking) {
    const voucherEl = document.getElementById('bookingVoucherContent');
    const settings = window.dataManager.getSettings();
    if (!voucherEl) return;

    const [year, month, day] = booking.date.split('-');
    const dateFormatted = `${day}/${month}/${year}`;

    let methodLabel = 'Pix Instantâneo';
    if (booking.paymentMethod === 'CARTAO_CREDITO') methodLabel = 'Cartão de Crédito';
    else if (booking.paymentMethod === 'CARTAO_DEBITO') methodLabel = 'Cartão de Débito';
    else if (booking.paymentMethod === 'PAGAR_NO_LOCAL') methodLabel = 'Pagar no Studio';

    let paymentBadgeHtml = '';
    if (booking.depositPolicy === 'deposit' && booking.remainingAmount > 0) {
      paymentBadgeHtml = `
        <span class="badge badge-success">✓ Sinal PAGO via ${methodLabel} (R$ ${booking.amountPaidNow.toFixed(2)})</span>
        <div style="font-size:12px; color:var(--color-brand-700); font-weight:700; margin-top:4px;">
          Restante a acertar no Studio: R$ ${booking.remainingAmount.toFixed(2)}
        </div>
      `;
    } else if (booking.paymentMethod === 'PAGAR_NO_LOCAL') {
      paymentBadgeHtml = `
        <span class="badge badge-warning" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">
          Pagamento no Studio (R$ ${booking.totalPrice.toFixed(2)})
        </span>
      `;
    } else {
      paymentBadgeHtml = `
        <span class="badge badge-success">✓ ${methodLabel} - 100% PAGO (R$ ${booking.totalPrice.toFixed(2)})</span>
      `;
    }

    voucherEl.innerHTML = `
      <div class="voucher-row">
        <span class="v-label">Código do Agendamento:</span>
        <span class="v-value" style="color:var(--color-brand-900); font-size:16px;">#${booking.id}</span>
      </div>
      <div class="voucher-row">
        <span class="v-label">Cliente:</span>
        <span class="v-value">${booking.clientName} (${booking.clientPhone})</span>
      </div>
      <div class="voucher-row">
        <span class="v-label">Serviços:</span>
        <span class="v-value">${booking.serviceNames}</span>
      </div>
      <div class="voucher-row">
        <span class="v-label">Data e Horário:</span>
        <span class="v-value">${dateFormatted} às ${booking.time} (${booking.duration} min)</span>
      </div>
      <div class="voucher-row">
        <span class="v-label">Local do Atendimento:</span>
        <span class="v-value" style="font-weight:700; color:${booking.serviceLocation === 'home' ? '#166534' : 'var(--color-brand-900)'};">
          ${booking.serviceLocation === 'home' 
            ? `Em Domicílio: ${booking.clientAddress || 'Endereço da Cliente'}` 
            : `No Studio: ${settings.address || 'Studio Bela Unha'}`}
        </span>
      </div>
      ${(booking.serviceLocation === 'home' && booking.homeServiceFee > 0) ? `
      <div class="voucher-row">
        <span class="v-label">Taxa de Deslocamento:</span>
        <span class="v-value" style="font-weight:700; color:#166534;">+ R$ ${booking.homeServiceFee.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="voucher-row">
        <span class="v-label">Profissional Responsável:</span>
        <span class="v-value">${settings.manicureName || 'Studio'}</span>
      </div>
      <div class="voucher-row">
        <span class="v-label">Status do Pagamento:</span>
        <span class="v-value">${paymentBadgeHtml}</span>
      </div>
      <div class="voucher-row" style="background-color:rgba(7,24,84,0.03); padding:10px; border-radius:6px; margin-top:6px;">
        <span class="v-label">Regras do Studio:</span>
        <span class="v-value" style="font-size:12px; font-weight:500;">
          Tolerância de ${settings.delayToleranceMinutes || 10} min • Cancelamento sem multa até ${settings.cancellationHours || 4}h antes
        </span>
      </div>
    `;

    // Botão do WhatsApp com mensagem pronta
    const waBtn = document.getElementById('btnWhatsappConfirmation');
    if (waBtn) {
      let paymentDetailText = `Valor: R$ ${booking.totalPrice.toFixed(2)} (${methodLabel} PAGO)`;
      if (booking.depositPolicy === 'deposit' && booking.remainingAmount > 0) {
        paymentDetailText = `Sinal Pago: R$ ${booking.amountPaidNow.toFixed(2)} (${methodLabel}) | Restante no local: R$ ${booking.remainingAmount.toFixed(2)}`;
      } else if (booking.paymentMethod === 'PAGAR_NO_LOCAL') {
        paymentDetailText = `Valor: R$ ${booking.totalPrice.toFixed(2)} (A pagar no Studio)`;
      }

      const feeMsg = (booking.serviceLocation === 'home' && booking.homeServiceFee > 0)
        ? `Taxa de Deslocamento: R$ ${booking.homeServiceFee.toFixed(2)}\n`
        : '';
      const locationMsg = booking.serviceLocation === 'home'
        ? `Local: Na Minha Casa (${booking.clientAddress})\n${feeMsg}`
        : `Local: No Studio (${settings.address || ''})\n`;

      const msg = encodeURIComponent(
        `Olá ${settings.manicureName || 'Studio'}! Acabei de agendar pelo Cronus:\n\n` +
        `Data: ${dateFormatted} às ${booking.time}\n` +
        `Serviços: ${booking.serviceNames}\n` +
        locationMsg +
        `${paymentDetailText}\n` +
        `Código: #${booking.id}\n\n` +
        `Nos vemos em breve!`
      );
      waBtn.href = `https://wa.me/${settings.whatsappNumber}?text=${msg}`;
    }

    // Botão Google Agenda
    const gCalBtn = document.getElementById('btnGoogleCalendar');
    if (gCalBtn) {
      const gDateStart = booking.date.replace(/-/g, '') + 'T' + booking.time.replace(':', '') + '00';
      const [h, m] = booking.time.split(':').map(Number);
      const endTotalM = h * 60 + m + booking.duration;
      const endH = String(Math.floor(endTotalM / 60)).padStart(2, '0');
      const endM = String(endTotalM % 60).padStart(2, '0');
      const gDateEnd = booking.date.replace(/-/g, '') + 'T' + endH + endM + '00';

      const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(booking.serviceNames + ' - ' + (settings.studioName || 'Studio'))}&dates=${gDateStart}/${gDateEnd}&details=${encodeURIComponent('Agendamento confirmado no ' + (settings.studioName || 'Studio') + '. Código: #' + booking.id)}&location=${encodeURIComponent(settings.address)}`;
      gCalBtn.href = gUrl;
    }
  }

  // --- Navegação entre Etapas ---
  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    this.updateStepsUI();

    // Se entrou no passo 2, certificar que uma data válida está selecionada e os slots renderizados
    if (stepNumber === 2) {
      this.ensureValidDateSelected();
      this.renderBookingMiniCal();
      this.renderAvailableSlots();
      this.checkStep2Validity();
    }

    // Se entrou no passo 3, preparar campos de local e validar
    if (stepNumber === 3) {
      this.prepareStep3();
      this.checkStep3Validity();
    }

    // Se entrou no passo 4, preparar resumo de pagamento e abas
    if (stepNumber === 4) {
      this.prepareStep4();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateStepsUI() {
    for (let i = 1; i <= 5; i++) {
      const panel = document.getElementById(`bookingStep${i}`);
      if (panel) {
        panel.classList.toggle('active', i === this.currentStep);
      }

      const stepItem = document.getElementById(`navStepItem${i}`);
      if (stepItem) {
        stepItem.classList.remove('active', 'completed');
        if (i === this.currentStep) {
          stepItem.classList.add('active');
        } else if (i < this.currentStep) {
          stepItem.classList.add('completed');
        }
      }
    }

    const progressLine = document.getElementById('stepsProgressLine');
    if (progressLine) {
      const progressPercent = ((this.currentStep - 1) / 4) * 100;
      progressLine.style.width = `${progressPercent}%`;
    }

    this.updateFooterBar();
  }

  goBack() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  submitActivePayment() {
    if (this.paymentMethod === 'PIX') {
      window.app.showToast('Escaneie o QR Code Pix acima ou clique no botão de simulação para aprovação instantânea.', 'info');
      const pixBox = document.getElementById('panelPix');
      if (pixBox) pixBox.scrollIntoView({ behavior: 'smooth' });
    } else if (this.paymentMethod === 'CREDITO') {
      const form = document.getElementById('creditCardForm');
      if (form) form.requestSubmit();
    } else if (this.paymentMethod === 'DEBITO') {
      const form = document.getElementById('debitCardForm');
      if (form) form.requestSubmit();
    } else if (this.paymentMethod === 'LOCAL') {
      this.processLocalPayment();
    } else {
      this.processLocalPayment();
    }
  }

  updateFooterBar() {
    const bottomBar = document.getElementById('bookingSummaryBar');
    if (!bottomBar) return;

    // Etapa 5 (Comprovante/Voucher): esconde a barra flutuante
    if (this.currentStep === 5) {
      bottomBar.style.display = 'none';
      return;
    }

    // Se estiver na etapa 1 e não houver serviços selecionados: esconde
    if (this.currentStep === 1 && this.selectedServices.size === 0) {
      bottomBar.style.display = 'none';
      return;
    }

    // Exibe a barra fixa nas etapas 1 a 4
    bottomBar.style.display = 'block';

    const btnBack = document.getElementById('btnFooterBack');
    const btnBackText = document.getElementById('btnFooterBackText');
    const btn1 = document.getElementById('btnNextStep1');
    const btn2 = document.getElementById('btnNextStep2');
    const btn3 = document.getElementById('btnNextStep3');
    const btn4 = document.getElementById('btnNextStep4');
    const btn4Text = document.getElementById('btnNextStep4Text');

    const itemServices = document.getElementById('footerItemCount');
    const itemDuration = document.getElementById('footerItemDuration');
    const itemDateTime = document.getElementById('footerItemDateTime');
    const dateTimeVal = document.getElementById('summarySelectedDateTime');
    const totalLabel = document.getElementById('summaryTotalLabel');
    const totalPriceEl = document.getElementById('summaryTotalPrice');

    // Preço total ou valor a acertar agora
    if (totalPriceEl) {
      if (this.currentStep === 4 && this.amountToPayNow && this.amountToPayNow > 0 && this.amountToPayNow !== this.totalPrice) {
        totalPriceEl.textContent = `R$ ${this.amountToPayNow.toFixed(2)}`;
      } else {
        totalPriceEl.textContent = `R$ ${(this.totalPrice || 0).toFixed(2)}`;
      }
    }

    // Botão Voltar (texto conciso para não quebrar linha)
    if (btnBack) {
      if (this.currentStep === 1) {
        btnBack.style.display = 'none';
      } else {
        btnBack.style.display = 'inline-flex';
        if (btnBackText) {
          btnBackText.textContent = 'Voltar';
        }
      }
    }

    // Ocultar itens secundários nas etapas 2, 3 e 4 para garantir linha única limpa
    if (itemServices && itemDuration) {
      if (this.currentStep === 1) {
        itemServices.style.display = 'flex';
        itemDuration.style.display = 'flex';
      } else {
        itemServices.style.display = 'none';
        itemDuration.style.display = 'none';
      }
    }

    // Exibição e formato de data/horário selecionado
    if (itemDateTime && dateTimeVal) {
      if ((this.currentStep === 2 || this.currentStep === 3) && this.selectedDateStr) {
        itemDateTime.style.display = 'flex';
        const [y, m, d] = this.selectedDateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const dayName = dayNames[dateObj.getDay()];
        const formattedDate = `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
        dateTimeVal.textContent = this.selectedTime ? `${formattedDate} às ${this.selectedTime}` : `${formattedDate}`;
      } else {
        itemDateTime.style.display = 'none';
      }
    }

    // Configuração dos Botões de Avanço
    if (btn1) btn1.style.display = this.currentStep === 1 ? 'inline-flex' : 'none';
    if (btn2) btn2.style.display = this.currentStep === 2 ? 'inline-flex' : 'none';
    if (btn3) btn3.style.display = this.currentStep === 3 ? 'inline-flex' : 'none';
    if (btn4) {
      btn4.style.display = this.currentStep === 4 ? 'inline-flex' : 'none';
      if (btn4Text) {
        if (this.paymentMethod === 'PIX') btn4Text.textContent = 'Pagar via Pix';
        else if (this.paymentMethod === 'CREDITO') btn4Text.textContent = 'Pagar no Cartão';
        else if (this.paymentMethod === 'DEBITO') btn4Text.textContent = 'Pagar no Débito';
        else if (this.paymentMethod === 'LOCAL') btn4Text.textContent = 'Confirmar no Studio';
        else btn4Text.textContent = 'Confirmar';
      }
    }

    // Rótulo do Total
    if (totalLabel) {
      if (this.currentStep === 4 && this.amountToPayNow && this.amountToPayNow > 0 && this.amountToPayNow !== this.totalPrice) {
        totalLabel.textContent = 'Sinal Agora:';
      } else {
        totalLabel.textContent = 'Total:';
      }
    }

    // Validação dos botões ativos
    if (this.currentStep === 2) {
      this.checkStep2Validity();
    } else if (this.currentStep === 3) {
      this.checkStep3Validity();
    }
  }

  resetBooking() {
    this.selectedServices.clear();
    this.selectedTime = '';
    this.lastCreatedBooking = null;
    this.userExplicitlyPickedLocation = false;
    this.updateStudioHeader();
    this.goToStep(1);
    this.renderServicesList();
    this.updateCartSummary();
  }
}

// Instância global disponível
window.bookingFlow = new BookingFlow();
