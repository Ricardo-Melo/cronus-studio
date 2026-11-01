/**
 * Agende-me — Calendar & Slot Calculation Engine
 * Implementa a grade mensal de 7 colunas, o mini-calendário de 328px e cálculo de horários livres.
 */

class CalendarEngine {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.miniCalDate = new Date();
    this.viewMode = 'month'; // 'month' | 'week' | 'day' | 'list'
    this.listFilter = 'all'; // 'all' | 'upcoming' | 'completed' | 'cancelled'
    this.months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    this.weekdaysShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    this.weekdaysLong = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  setViewMode(mode) {
    this.viewMode = mode;

    const modes = ['month', 'week', 'day', 'list'];
    modes.forEach(m => {
      const cap = m.charAt(0).toUpperCase() + m.slice(1);
      const btn = document.getElementById(`btnCalMode${cap}`);
      if (btn) {
        if (m === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      }

      const container = document.getElementById(`calContainer${cap}`);
      if (container) {
        container.style.display = (m === mode) ? 'flex' : 'none';
      }
    });

    this.renderActiveView();
  }

  renderActiveView() {
    if (this.viewMode === 'month') {
      this.renderMainCalendar('.calendar-grid-body', '.month-display-title');
    } else if (this.viewMode === 'week') {
      this.renderWeekView('#calWeekGrid', '.month-display-title');
    } else if (this.viewMode === 'day') {
      this.renderDayView('#calDayContainer', '.month-display-title');
    } else if (this.viewMode === 'list') {
      this.renderListView('#calListContainer', '.month-display-title');
    }

    this.renderMiniCalendar('.mini-cal-days', '.mini-cal-title');
    this.renderSelectedDayAgenda('.selected-day-agenda-box');
  }

  // --- Renderização da Grade Principal de 7 Colunas ---
  renderMainCalendar(containerSelector = '.calendar-grid-body', titleSelector = '.month-display-title') {
    if (this.viewMode !== 'month') {
      this.renderActiveView();
      return;
    }
    const container = document.querySelector(containerSelector);
    const titleEl = document.querySelector(titleSelector);
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    if (titleEl) {
      titleEl.textContent = `${this.months[month]} de ${year}`;
    }

    container.innerHTML = '';

    // Primeiro dia do mês e total de dias
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Dias do mês anterior para completar o início da semana
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const cellDate = new Date(year, month - 1, dayNum);
      const cell = this.createCalendarCell(cellDate, dayNum, true);
      container.appendChild(cell);
    }

    // Dias do mês atual
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(year, month, i);
      const isToday = this.isSameDay(cellDate, today);
      const cell = this.createCalendarCell(cellDate, i, false, isToday);
      container.appendChild(cell);
    }

    // Dias do próximo mês para completar a grade de 35 ou 42 células
    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = totalCells > 35 ? (42 - totalCells) : (35 - totalCells);
    for (let j = 1; j <= remainingCells; j++) {
      const cellDate = new Date(year, month + 1, j);
      const cell = this.createCalendarCell(cellDate, j, true);
      container.appendChild(cell);
    }
  }

  createCalendarCell(date, dayNumber, isOtherMonth, isToday = false) {
    const cell = document.createElement('div');
    const dateKey = this.formatDateKey(date);
    const isSelected = this.isSameDay(date, this.selectedDate);
    const isFullDayBlocked = window.dataManager.isDateFullyBlocked(dateKey);

    cell.className = `calendar-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isFullDayBlocked ? 'day-fully-blocked' : ''}`;
    cell.dataset.date = dateKey;

    // Número do dia
    const numEl = document.createElement('div');
    numEl.className = 'cell-day-number';
    numEl.textContent = dayNumber;
    cell.appendChild(numEl);

    // Banner de dia bloqueado
    if (isFullDayBlocked) {
      const banner = document.createElement('div');
      banner.className = 'cell-full-block-banner';
      banner.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:3px;"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg><span>BLOQUEADO</span>';
      banner.title = 'Data bloqueada por imprevisto / ausência da manicure';
      cell.appendChild(banner);
    }

    // Eventos do dia
    const eventsList = document.createElement('div');
    eventsList.className = 'cell-events-list';

    const bookings = window.dataManager.getBookingsByDate(dateKey);
    const maxVisibleEvents = 3;

    bookings.slice(0, maxVisibleEvents).forEach(b => {
      const eventPill = document.createElement('div');
      const isBlocked = b.status === 'BLOQUEADO' || b.isBlock;
      eventPill.className = `cal-event-pill ${isBlocked ? 'blocked' : ''}`;
      
      if (isBlocked) {
        eventPill.innerHTML = `<span class="pay-status-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg></span> <span>${b.time} Bloqueio</span>`;
        eventPill.title = `${b.time} - HORÁRIO BLOQUEADO (${b.serviceNames})`;
      } else {
        const payIcon = b.paymentMethod === 'PIX' 
          ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>' 
          : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>';
        eventPill.innerHTML = `<span class="pay-status-icon">${payIcon}</span> <span>${b.time} ${b.clientName.split(' ')[0]}</span>`;
        eventPill.title = `${b.time} - ${b.clientName} (${b.serviceNames}) - R$ ${b.totalPrice.toFixed(2)}`;
      }

      eventPill.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isBlocked) {
          if (confirm(`Deseja desbloquear este horário (${b.time} - ${b.serviceNames})?`)) {
            window.adminManager.removeBlockSlot(b.id);
          }
        } else {
          window.app.showBookingDetails(b.id);
        }
      });
      eventsList.appendChild(eventPill);
    });

    if (bookings.length > maxVisibleEvents) {
      const moreEl = document.createElement('div');
      moreEl.className = 'cell-more-events';
      moreEl.textContent = `+${bookings.length - maxVisibleEvents} mais`;
      eventsList.appendChild(moreEl);
    }

    cell.appendChild(eventsList);

    // Clique na célula
    cell.addEventListener('click', () => {
      this.selectedDate = new Date(date);
      this.renderActiveView();
    });

    return cell;
  }

  // --- Renderização do Mini-Calendário (328 px) ---
  renderMiniCalendar(containerSelector, titleSelector) {
    const container = document.querySelector(containerSelector);
    const titleEl = document.querySelector(titleSelector);
    if (!container) return;

    const year = this.miniCalDate.getFullYear();
    const month = this.miniCalDate.getMonth();

    if (titleEl) {
      titleEl.textContent = `${this.months[month]} ${year}`;
    }

    container.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Dias anteriores
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const cellDate = new Date(year, month - 1, dayNum);
      container.appendChild(this.createMiniDayEl(cellDate, dayNum, true));
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(year, month, i);
      container.appendChild(this.createMiniDayEl(cellDate, i, false));
    }

    // Dias posteriores
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = 35 - (totalCells % 35 === 0 ? 35 : (totalCells % 35));
    if (totalCells <= 35) {
      for (let j = 1; j <= (35 - totalCells); j++) {
        const cellDate = new Date(year, month + 1, j);
        container.appendChild(this.createMiniDayEl(cellDate, j, true));
      }
    } else {
      for (let j = 1; j <= (42 - totalCells); j++) {
        const cellDate = new Date(year, month + 1, j);
        container.appendChild(this.createMiniDayEl(cellDate, j, true));
      }
    }
  }

  createMiniDayEl(date, dayNum, isOther) {
    const el = document.createElement('div');
    const dateKey = this.formatDateKey(date);
    const isSelected = this.isSameDay(date, this.selectedDate);
    const bookings = window.dataManager.getBookingsByDate(dateKey);
    const isBlocked = window.dataManager.isDateFullyBlocked(dateKey);

    el.className = `mini-cal-day ${isOther ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${bookings.length > 0 ? 'has-events' : ''} ${isBlocked ? 'blocked-day' : ''}`;
    el.textContent = dayNum;
    if (isBlocked) {
      el.title = 'Data bloqueada (imprevisto)';
    }

    el.addEventListener('click', () => {
      this.selectedDate = new Date(date);
      this.currentDate = new Date(date);
      this.renderActiveView();
    });

    return el;
  }

  // --- Renderiza a lista de atendimentos do dia selecionado ---
  renderSelectedDayAgenda(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const dateKey = this.formatDateKey(this.selectedDate);
    const bookings = window.dataManager.getBookingsByDate(dateKey);
    const dayName = this.weekdaysShort[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthName = this.months[this.selectedDate.getMonth()];
    const settings = window.dataManager.getSettings();
    const isClosedDay = settings.workDays && !settings.workDays.includes(this.selectedDate.getDay());
    const isFullyBlocked = window.dataManager.isDateFullyBlocked(dateKey);

    let html = `
      <div class="agenda-box-title">
        <span>${dayName}, ${dayNum} de ${monthName}</span>
        <span class="badge ${isFullyBlocked ? 'badge-danger' : (isClosedDay ? 'badge-warning' : 'badge-brand')}">
          ${isFullyBlocked ? 'Data Bloqueada' : (isClosedDay ? 'Studio Fechado' : `${bookings.length} ${bookings.length === 1 ? 'item' : 'itens'}`)}
        </span>
      </div>
    `;

    // Banner quando a data inteira está bloqueada por imprevisto
    if (isFullyBlocked) {
      html += `
        <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px; text-align: center;">
          <div style="color: #991b1b; font-weight: 700; font-size: 13px; margin-bottom: 4px; display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            <span>DATA BLOQUEADA (IMPREVISTO)</span>
          </div>
          <div style="color: #7f1d1d; font-size: 12px; margin-bottom: 8px;">Você bloqueou esta data. Clientes não conseguem agendar online neste dia.</div>
          <button type="button" class="btn-pill" style="font-size: 11px; height: 28px; background: #fff; color: #991b1b; border-color: #f87171; font-weight: 600;" onclick="window.adminManager.unblockFullDate('${dateKey}')">
            ✓ Desbloquear este Dia
          </button>
        </div>
      `;
    } else if (isClosedDay) {
      html += `
        <div style="background-color: var(--color-surface-100); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px; font-size: 12px; color: var(--color-text-700); text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span><strong>Dia de Folga Semanal:</strong> A agenda online está fechada para clientes neste dia da semana.</span>
        </div>
      `;
    }

    if (bookings.length === 0) {
      html += `
        <div style="text-align:center; padding: 20px 8px; color: var(--color-text-500); font-size: 13px;">
          Nenhum agendamento ou bloqueio nesta data.
        </div>
      `;
    } else {
      html += `<div style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">`;
      bookings.sort((a,b) => a.time.localeCompare(b.time)).forEach(b => {
        const isBlocked = b.status === 'BLOQUEADO' || b.isBlock;

        if (isBlocked) {
          html += `
            <div class="daily-event-card blocked-slot" style="border-left: 4px solid var(--color-error-base); background-color: var(--color-error-light, #fee2e2);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
                <span class="daily-event-time" style="color: #991b1b; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                  <span>${b.time} (${b.duration} min)</span>
                </span>
                <button type="button" class="btn-icon-action delete" style="width:24px; height:24px; color:#991b1b;" onclick="event.stopPropagation(); window.adminManager.removeBlockSlot('${b.id}')" title="Desbloquear Horário">✕</button>
              </div>
              <div class="daily-event-client" style="color: #7f1d1d;">${b.clientName}</div>
              <div class="daily-event-service" style="color: #991b1b; font-size: 12px;">${b.notes || 'Horário reservado pela Manicure'}</div>
            </div>
          `;
        } else {
          const payBadge = b.paymentMethod === 'PIX' ? 'Pix' : 'Cartão';
          html += `
            <div class="daily-event-card" onclick="window.app.showBookingDetails('${b.id}')">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
                <span class="daily-event-time">${b.time} (${b.duration} min)</span>
                <span class="badge ${b.paymentStatus === 'PAGO' ? 'badge-success' : 'badge-warning'}" style="font-size:10px;">${payBadge} - ${b.paymentStatus}</span>
              </div>
              <div class="daily-event-client">
                ${b.clientName}
                ${b.serviceLocation === 'home' ? '<span class="badge" style="background:#dcfce7; color:#15803d; font-size:10px; margin-left:6px; font-weight:700; display:inline-flex; align-items:center; gap:3px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 22"></polyline></svg>Domicílio</span>' : ''}
              </div>
              <div class="daily-event-service">${b.serviceNames}</div>
              ${b.serviceLocation === 'home' && b.clientAddress ? `<div style="font-size:11px; color:#15803d; font-weight:500; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span>${b.clientAddress}</span></div>` : ''}
              <div style="font-size: 12px; font-weight:700; color: var(--color-brand-900); margin-top: 4px;">R$ ${b.totalPrice.toFixed(2)}</div>
            </div>
          `;
        }
      });
      html += `</div>`;
    }

    // Ações Rápidas do Dia (Agendar e Bloquear Horário)
    if (isFullyBlocked) {
      html += `
        <div style="display:grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--color-border-100);">
          <button type="button" class="btn-pill" style="font-size: 12px; height: 34px; justify-content:center; color: var(--color-error-base); border-color: var(--color-error-base); font-weight: 600;" onclick="window.adminManager.unblockFullDate('${dateKey}')">
            ✓ Liberar / Desbloquear este Dia
          </button>
        </div>
      `;
    } else {
      html += `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--color-border-100);">
          <button type="button" class="btn-pill" style="font-size: 12px; height: 34px; justify-content:center;" onclick="window.adminManager.openManualBookingModal('${dateKey}')">
            + Agendar
          </button>
          <button type="button" class="btn-pill" style="font-size: 12px; height: 34px; justify-content:center; color: var(--color-error-base); border-color: var(--color-error-base); display:inline-flex; align-items:center; gap:4px;" onclick="window.adminManager.openBlockSlotModal('${dateKey}', true)" title="Bloquear esta data inteira por imprevisto">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            <span>Bloquear Dia</span>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // --- Navegação Unificada Conforme Modo Ativo ---
  prev() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.miniCalDate = new Date(this.currentDate);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
      this.selectedDate = new Date(this.currentDate);
      this.miniCalDate = new Date(this.currentDate);
    } else if (this.viewMode === 'day') {
      this.selectedDate.setDate(this.selectedDate.getDate() - 1);
      this.currentDate = new Date(this.selectedDate);
      this.miniCalDate = new Date(this.selectedDate);
    } else if (this.viewMode === 'list') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.miniCalDate = new Date(this.currentDate);
    }
    this.renderActiveView();
  }

  next() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.miniCalDate = new Date(this.currentDate);
    } else if (this.viewMode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
      this.selectedDate = new Date(this.currentDate);
      this.miniCalDate = new Date(this.currentDate);
    } else if (this.viewMode === 'day') {
      this.selectedDate.setDate(this.selectedDate.getDate() + 1);
      this.currentDate = new Date(this.selectedDate);
      this.miniCalDate = new Date(this.selectedDate);
    } else if (this.viewMode === 'list') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.miniCalDate = new Date(this.currentDate);
    }
    this.renderActiveView();
  }

  prevMonth() {
    this.prev();
  }

  nextMonth() {
    this.next();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.miniCalDate = new Date();
    this.renderActiveView();
  }

  goToDate(dateStr) {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    this.currentDate = new Date(target);
    this.selectedDate = new Date(target);
    this.miniCalDate = new Date(target);
    this.renderActiveView();
  }

  calculateEndTime(startTime, durationMinutes = 60) {
    if (!startTime) return '';
    const parts = startTime.split(':').map(Number);
    const totalM = parts[0] * 60 + (parts[1] || 0) + (parseInt(durationMinutes) || 60);
    const endH = Math.floor(totalM / 60) % 24;
    const endM = totalM % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  // --- Visualização Semanal (Semana) ---
  renderWeekView(containerSelector = '#calWeekGrid', titleSelector = '.month-display-title') {
    const container = document.querySelector(containerSelector);
    const titleEl = document.querySelector(titleSelector);
    if (!container) return;

    const current = new Date(this.currentDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current.getFullYear(), current.getMonth(), current.getDate() - dayOfWeek);
    const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);

    if (titleEl) {
      if (sunday.getMonth() === saturday.getMonth()) {
        titleEl.textContent = `${sunday.getDate()} a ${saturday.getDate()} de ${this.months[sunday.getMonth()]} de ${sunday.getFullYear()}`;
      } else if (sunday.getFullYear() === saturday.getFullYear()) {
        titleEl.textContent = `${sunday.getDate()} de ${this.months[sunday.getMonth()].slice(0, 3)} a ${saturday.getDate()} de ${this.months[saturday.getMonth()].slice(0, 3)} de ${sunday.getFullYear()}`;
      } else {
        titleEl.textContent = `${sunday.getDate()} de ${this.months[sunday.getMonth()].slice(0, 3)}/${sunday.getFullYear()} a ${saturday.getDate()} de ${this.months[saturday.getMonth()].slice(0, 3)}/${saturday.getFullYear()}`;
      }
    }

    container.innerHTML = '';
    const today = new Date();
    const settings = window.dataManager.getSettings();

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + d);
      const dateKey = this.formatDateKey(dayDate);
      const isToday = this.isSameDay(dayDate, today);
      const isSelected = this.isSameDay(dayDate, this.selectedDate);
      const isFullyBlocked = window.dataManager.isDateFullyBlocked(dateKey);
      const isClosed = settings.workDays && !settings.workDays.includes(d);
      const bookings = window.dataManager.getBookingsByDate(dateKey);

      // Ordenar agendamentos cronologicamente pelo horário
      bookings.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      const col = document.createElement('div');
      col.className = `cal-week-col ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
      col.dataset.date = dateKey;

      // Cabeçalho da coluna
      const colHeader = document.createElement('div');
      colHeader.className = 'cal-week-col-header';
      colHeader.innerHTML = `
        <div class="cal-week-day-name">${this.weekdaysShort[d]}</div>
        <div class="cal-week-day-num">${dayDate.getDate()}</div>
      `;
      colHeader.title = `Ver agenda de ${this.weekdaysLong[d]}, ${dayDate.getDate()} de ${this.months[dayDate.getMonth()]}`;
      colHeader.addEventListener('click', () => {
        this.selectedDate = new Date(dayDate);
        this.renderActiveView();
      });
      col.appendChild(colHeader);

      // Corpo da coluna (eventos)
      const colBody = document.createElement('div');
      colBody.className = 'cal-week-col-body';

      if (isFullyBlocked) {
        colBody.innerHTML += `
          <div class="week-event-card blocked" style="text-align:center; padding:12px 6px;" onclick="window.adminManager.unblockFullDate('${dateKey}')" title="Clique para liberar esta data">
            <div style="font-weight:800; font-size:11px; color:var(--color-error-base); margin-bottom:3px; display:flex; align-items:center; justify-content:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
              <span>BLOQUEADO</span>
            </div>
            <div style="font-size:10.5px; color:#7f1d1d; margin-bottom:6px;">Imprevisto / Folga</div>
            <button type="button" class="btn-pill" style="font-size:10px; height:24px; padding:0 8px; color:var(--color-error-base); border-color:var(--color-error-base); font-weight:700;">✓ Desbloquear</button>
          </div>
        `;
      } else if (isClosed) {
        colBody.innerHTML += `
          <div style="text-align:center; padding:18px 6px; color:var(--color-text-400); font-size:11px; font-style:italic;">
            Studio Fechado
          </div>
        `;
      } else if (bookings.length === 0) {
        colBody.innerHTML += `
          <div style="text-align:center; padding:24px 6px; color:var(--color-text-400); font-size:11px; display:flex; flex-direction:column; align-items:center; gap:6px;">
            <span>Sem agendamentos</span>
            <button type="button" class="btn-pill" style="font-size:10px; height:26px; padding:0 10px; font-weight:600;" onclick="window.adminManager.openManualBookingModal('${dateKey}')">+ Agendar</button>
          </div>
        `;
      } else {
        bookings.forEach(b => {
          const isBlocked = b.status === 'BLOQUEADO' || b.isBlock;
          const endTime = this.calculateEndTime(b.time, b.durationMinutes || 60);
          const card = document.createElement('div');
          card.className = `week-event-card ${isBlocked ? 'blocked' : ''}`;

          if (isBlocked) {
            card.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <span style="font-size:10.5px; font-weight:800; color:var(--color-error-base);">${b.time}</span>
                <span class="badge badge-danger" style="font-size:9px; padding:1px 5px;">Bloqueio</span>
              </div>
              <div style="font-size:11px; font-weight:600; color:#991b1b; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                ${b.serviceNames || 'Horário Bloqueado'}
              </div>
            `;
            card.title = `Clique para liberar o horário ${b.time}`;
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm(`Deseja desbloquear o horário (${b.time} - ${b.serviceNames})?`)) {
                window.adminManager.removeBlockSlot(b.id);
              }
            });
          } else {
            const clientFirst = (b.clientName || 'Cliente').split(' ')[0];
            const serviceShort = (b.serviceNames || 'Atendimento').split('+')[0].trim();
            const isHome = b.serviceLocation === 'home';
            const statusClass = b.status === 'CONFIRMADO' ? 'badge-success' : (b.status === 'CONCLUÍDO' ? 'badge-brand' : 'badge-warning');

            card.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <span style="font-size:10.5px; font-weight:800; color:var(--color-brand-900);">${b.time} - ${endTime}</span>
                <span class="badge ${statusClass}" style="font-size:9px; padding:1px 5px;">${b.status}</span>
              </div>
              <div style="font-size:12px; font-weight:700; color:var(--color-text-900); margin-bottom:2px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                ${clientFirst}
              </div>
              <div style="font-size:10.5px; color:var(--color-text-600); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-bottom:4px;">
                ${serviceShort}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:10.5px;">
                <strong style="color:var(--color-brand-700);">R$ ${(b.totalPrice || 0).toFixed(2)}</strong>
                ${isHome ? '<span class="badge badge-warning" style="font-size:8.5px; padding:1px 4px;">Domicílio</span>' : ''}
              </div>
            `;
            card.title = `${b.time} - ${b.clientName} (${b.serviceNames}) - R$ ${(b.totalPrice || 0).toFixed(2)}`;
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              window.app.showBookingDetails(b.id);
            });
          }

          colBody.appendChild(card);
        });

        // Botão discreto para adicionar outro agendamento neste dia
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-pill';
        addBtn.style.cssText = 'margin-top:auto; font-size:10px; height:24px; padding:0 8px; justify-content:center; align-self:center; border-style:dashed;';
        addBtn.textContent = '+ Agendar';
        addBtn.addEventListener('click', () => {
          window.adminManager.openManualBookingModal(dateKey);
        });
        colBody.appendChild(addBtn);
      }

      col.appendChild(colBody);
      container.appendChild(col);
    }
  }

  // --- Visualização Diária (Dia) ---
  renderDayView(containerSelector = '#calDayContainer', titleSelector = '.month-display-title') {
    const container = document.querySelector(containerSelector);
    const titleEl = document.querySelector(titleSelector);
    if (!container) return;

    const dateKey = this.formatDateKey(this.selectedDate);
    const dayNameLong = this.weekdaysLong[this.selectedDate.getDay()];
    const dayNum = this.selectedDate.getDate();
    const monthName = this.months[this.selectedDate.getMonth()];
    const year = this.selectedDate.getFullYear();

    if (titleEl) {
      titleEl.textContent = `${dayNameLong}, ${dayNum} de ${monthName} de ${year}`;
    }

    const bookings = window.dataManager.getBookingsByDate(dateKey);
    const isFullyBlocked = window.dataManager.isDateFullyBlocked(dateKey);
    const settings = window.dataManager.getSettings();
    const isClosedDay = settings.workDays && !settings.workDays.includes(this.selectedDate.getDay());

    const activeBookings = bookings.filter(b => b.status !== 'BLOQUEADO' && !b.isBlock && b.status !== 'CANCELADO');
    const totalDayRevenue = activeBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    let html = `
      <div class="cal-day-header-summary">
        <div>
          <div style="font-size: 16px; font-weight: 800; color: var(--color-brand-900); display:flex; align-items:center; gap:8px;">
            <span>${dayNameLong}, ${dayNum} de ${monthName}</span>
            ${isFullyBlocked 
              ? '<span class="badge badge-danger">Data Bloqueada</span>' 
              : (isClosedDay 
                  ? '<span class="badge badge-warning">Studio Fechado</span>' 
                  : `<span class="badge badge-brand">${activeBookings.length} ${activeBookings.length === 1 ? 'atendimento' : 'atendimentos'}</span>`
                )
            }
          </div>
          <div style="font-size: 12.5px; color: var(--color-text-600); margin-top: 3px;">
            Faturamento previsto: <strong style="color:var(--color-success-base); font-size:13.5px;">R$ ${totalDayRevenue.toFixed(2)}</strong>
            ${isHomeServiceActive(settings) ? ' • <span style="color:var(--color-brand-700);">Atendimento em Studio e Domicílio</span>' : ''}
          </div>
        </div>
        <div style="display:flex; gap: 8px; flex-wrap:wrap;">
          ${isFullyBlocked 
            ? `<button type="button" class="btn-pill" style="color:var(--color-error-base); border-color:var(--color-error-base); font-weight:700;" onclick="window.adminManager.unblockFullDate('${dateKey}')">✓ Desbloquear Data</button>`
            : `
              <button type="button" class="btn-primary" style="height:36px; padding:0 14px; font-size:13px;" onclick="window.adminManager.openManualBookingModal('${dateKey}')">+ Novo Agendamento</button>
              <button type="button" class="btn-pill" style="color:var(--color-error-base); border-color:var(--color-error-base); font-weight:600; display:inline-flex; align-items:center; gap:4px; height:36px;" onclick="window.adminManager.openBlockSlotModal('${dateKey}', true)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                <span>Bloquear Dia</span>
              </button>
            `
          }
        </div>
      </div>
      <div class="cal-day-timeline">
    `;

    function isHomeServiceActive(setts) {
      return setts.serviceLocationMode === 'home' || setts.serviceLocationMode === 'both';
    }

    const [openH] = (settings.openingTime || '08:00').split(':').map(Number);
    const [closeH] = (settings.closingTime || '20:00').split(':').map(Number);
    const startH = Math.max(6, Math.min(openH, 8));
    const endH = Math.min(23, Math.max(closeH, 20));

    for (let h = startH; h <= endH; h++) {
      const hourPrefix = String(h).padStart(2, '0');
      const hourStr = `${hourPrefix}:00`;

      // Encontrar agendamentos ou bloqueios que começam nesta hora
      const slotItems = bookings.filter(b => (b.time || '').startsWith(hourPrefix));

      html += `
        <div class="cal-timeline-slot">
          <div class="cal-timeline-time">${hourStr}</div>
          <div class="cal-timeline-content" style="gap:8px;">
      `;

      if (slotItems.length > 0) {
        slotItems.forEach(b => {
          const isBlocked = b.status === 'BLOQUEADO' || b.isBlock;
          const endTime = this.calculateEndTime(b.time, b.durationMinutes || 60);

          if (isBlocked) {
            html += `
              <div class="cal-day-booking-card" style="border-left-color:var(--color-error-base); background:#fff5f5; display:flex; justify-content:space-between; align-items:center;" onclick="if(confirm('Deseja liberar o horário ${b.time}?')) window.adminManager.removeBlockSlot('${b.id}')">
                <div style="display:flex; align-items:center; gap:12px;">
                  <span class="badge badge-danger" style="font-weight:700;">${b.time}</span>
                  <div>
                    <strong style="color:var(--color-error-base); font-size:13.5px;">Horário Bloqueado</strong>
                    <div style="font-size:12px; color:#7f1d1d;">${b.serviceNames || 'Imprevisto / Folga'}</div>
                  </div>
                </div>
                <button type="button" class="btn-pill" style="color:var(--color-error-base); border-color:var(--color-error-base); font-size:11px; height:28px;">Liberar</button>
              </div>
            `;
          } else {
            const isHome = b.serviceLocation === 'home';
            const payText = b.paymentMethod === 'PIX' ? 'Pix Online' : (b.paymentMethod === 'CARD' ? 'Cartão de Crédito' : 'Dinheiro');
            const statusClass = b.status === 'CONFIRMADO' ? 'badge-success' : (b.status === 'CONCLUÍDO' ? 'badge-brand' : 'badge-warning');

            html += `
              <div class="cal-day-booking-card" onclick="window.app.showBookingDetails('${b.id}')">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:13px; font-weight:800; color:var(--color-brand-900); background:var(--color-surface-100); padding:3px 8px; border-radius:var(--radius-sm);">${b.time} - ${endTime}</span>
                    <strong style="font-size:14px; color:var(--color-text-900);">${b.clientName}</strong>
                    <span style="font-size:12px; color:var(--color-text-500);">${b.clientPhone || ''}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span class="badge ${statusClass}">${b.status}</span>
                    <span class="badge ${isHome ? 'badge-warning' : 'badge-brand'}">${isHome ? 'A Domicílio' : 'Studio'}</span>
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; font-size:12.5px;">
                  <div style="color:var(--color-text-700);">
                    <strong>${b.serviceNames}</strong> <span style="color:var(--color-text-500);">(${b.durationMinutes || 60} min)</span>
                    ${isHome && b.clientAddress ? `<div style="font-size:11.5px; color:var(--color-text-500); margin-top:2px;">📍 ${b.clientAddress}</div>` : ''}
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px; font-weight:800; color:var(--color-brand-900);">R$ ${(b.totalPrice || 0).toFixed(2)}</div>
                    <div style="font-size:11px; color:var(--color-text-500);">${payText}</div>
                  </div>
                </div>
              </div>
            `;
          }
        });
      } else {
        if (!isFullyBlocked && !isClosedDay) {
          html += `
            <div class="cal-day-free-slot" onclick="window.adminManager.openManualBookingModal('${dateKey}', '${hourStr}')">
              <span>Horário Livre</span>
              <span style="font-size:11px; color:var(--color-brand-700); font-weight:600;">+ Agendar às ${hourStr}</span>
            </div>
          `;
        } else {
          html += `
            <div style="font-size:12px; color:var(--color-text-400); padding:6px 12px; font-style:italic;">
              ${isFullyBlocked ? 'Data bloqueada para atendimentos' : 'Studio fechado'}
            </div>
          `;
        }
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  // --- Visualização em Lista (Agenda / Cronológico) ---
  setListFilter(filter) {
    this.listFilter = filter;
    this.renderListView('#calListContainer', '.month-display-title');
  }

  onListSearch(query) {
    this.listSearchQuery = query ? query.toLowerCase().trim() : '';
    this.renderListView('#calListContainer', '.month-display-title');
  }

  renderListView(containerSelector = '#calListContainer', titleSelector = '.month-display-title') {
    const container = document.querySelector(containerSelector);
    const titleEl = document.querySelector(titleSelector);
    if (!container) return;

    const currentYear = this.currentDate.getFullYear();
    const currentMonth = this.currentDate.getMonth();

    if (titleEl) {
      titleEl.textContent = `Agenda e Atendimentos — ${this.months[currentMonth]} de ${currentYear}`;
    }

    let allBookings = window.dataManager.getBookings();

    // Ordenação cronológica: data asc, hora asc
    allBookings.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

    const todayKey = this.formatDateKey(new Date());

    // Filtros de visualização
    let filtered = allBookings.filter(b => {
      // 1. Filtro de abas
      if (this.listFilter === 'upcoming') {
        if (b.date < todayKey || b.status === 'CONCLUÍDO' || b.status === 'CANCELADO') return false;
      } else if (this.listFilter === 'completed') {
        if (b.status !== 'CONCLUÍDO') return false;
      } else if (this.listFilter === 'cancelled') {
        if (b.status !== 'CANCELADO' && b.status !== 'BLOQUEADO' && !b.isBlock) return false;
      }

      // 2. Filtro de texto de busca
      if (this.listSearchQuery) {
        const q = this.listSearchQuery;
        const matchesName = (b.clientName || '').toLowerCase().includes(q);
        const matchesService = (b.serviceNames || '').toLowerCase().includes(q);
        const matchesPhone = (b.clientPhone || '').includes(q);
        const matchesId = (b.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesService && !matchesPhone && !matchesId) return false;
      }

      return true;
    });

    // Barra de ferramentas superior
    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--color-border-100);">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn-pill ${this.listFilter === 'all' ? 'active' : ''}" style="${this.listFilter === 'all' ? 'background:var(--color-brand-700); color:#fff;' : ''}" onclick="window.calendarEngine.setListFilter('all')">Todos (${allBookings.length})</button>
          <button type="button" class="btn-pill ${this.listFilter === 'upcoming' ? 'active' : ''}" style="${this.listFilter === 'upcoming' ? 'background:var(--color-brand-700); color:#fff;' : ''}" onclick="window.calendarEngine.setListFilter('upcoming')">Próximos</button>
          <button type="button" class="btn-pill ${this.listFilter === 'completed' ? 'active' : ''}" style="${this.listFilter === 'completed' ? 'background:var(--color-brand-700); color:#fff;' : ''}" onclick="window.calendarEngine.setListFilter('completed')">Concluídos</button>
          <button type="button" class="btn-pill ${this.listFilter === 'cancelled' ? 'active' : ''}" style="${this.listFilter === 'cancelled' ? 'background:var(--color-brand-700); color:#fff;' : ''}" onclick="window.calendarEngine.setListFilter('cancelled')">Cancelados / Bloqueios</button>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="calListSearchInput" class="form-control" placeholder="Buscar por cliente, serviço..." value="${this.listSearchQuery || ''}" style="height:34px; font-size:12.5px; width:220px;" oninput="window.calendarEngine.onListSearch(this.value)">
          <button type="button" class="btn-primary" style="height:34px; font-size:12.5px; padding:0 12px;" onclick="window.adminManager.openManualBookingModal()">+ Novo Agendamento</button>
        </div>
      </div>
    `;

    if (filtered.length === 0) {
      html += `
        <div style="text-align:center; padding:48px 20px; background:var(--color-surface-50); border-radius:var(--radius-md); border:1px dashed var(--color-border-200);">
          <div style="font-size:32px; margin-bottom:8px;">📅</div>
          <h4 style="font-size:16px; font-weight:700; color:var(--color-text-900); margin-bottom:6px;">Nenhum agendamento encontrado</h4>
          <p style="font-size:13px; color:var(--color-text-600); margin-bottom:16px;">Tente alterar o filtro ou faça um novo agendamento manual.</p>
          <button type="button" class="btn-primary" onclick="window.adminManager.openManualBookingModal()">Agendar Atendimento</button>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    // Agrupar por data
    const groupsByDate = {};
    filtered.forEach(b => {
      if (!groupsByDate[b.date]) groupsByDate[b.date] = [];
      groupsByDate[b.date].push(b);
    });

    Object.keys(groupsByDate).forEach(dateKey => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = this.weekdaysLong[dateObj.getDay()];
      const dayBookings = groupsByDate[dateKey];
      const isToday = dateKey === todayKey;

      const dayRevenue = dayBookings
        .filter(b => b.status !== 'BLOQUEADO' && !b.isBlock && b.status !== 'CANCELADO')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      html += `
        <div class="cal-list-date-group">
          <div class="cal-list-date-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${dayName}, ${d} de ${this.months[m - 1]} de ${y}</span>
              ${isToday ? '<span class="badge badge-brand">Hoje</span>' : ''}
              <span class="badge badge-neutral">${dayBookings.length} ${dayBookings.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            <div style="font-size:12.5px; font-weight:700; color:var(--color-brand-900);">
              Faturamento: <span style="color:var(--color-success-base);">R$ ${dayRevenue.toFixed(2)}</span>
            </div>
          </div>
      `;

      dayBookings.forEach(b => {
        const isBlocked = b.status === 'BLOQUEADO' || b.isBlock;
        const endTime = this.calculateEndTime(b.time, b.durationMinutes || 60);

        if (isBlocked) {
          html += `
            <div class="cal-list-item-row" style="background:#fff5f5;" onclick="if(confirm('Deseja liberar o horário ${b.time}?')) window.adminManager.removeBlockSlot('${b.id}')">
              <div style="font-weight:800; color:var(--color-error-base);">${b.time}</div>
              <div style="font-weight:700; color:var(--color-error-base);">Horário Bloqueado</div>
              <div style="color:#7f1d1d;">${b.serviceNames || 'Imprevisto / Folga'}</div>
              <div><span class="badge badge-danger">Bloqueio</span></div>
              <div style="color:var(--color-text-500);">-</div>
              <div style="text-align:right;"><button type="button" class="btn-pill" style="color:var(--color-error-base); border-color:var(--color-error-base); font-size:11px; height:26px;">Liberar</button></div>
            </div>
          `;
        } else {
          const isHome = b.serviceLocation === 'home';
          const statusClass = b.status === 'CONFIRMADO' ? 'badge-success' : (b.status === 'CONCLUÍDO' ? 'badge-brand' : 'badge-warning');

          html += `
            <div class="cal-list-item-row" onclick="window.app.showBookingDetails('${b.id}')">
              <div style="font-weight:800; color:var(--color-brand-900); font-size:13px;">${b.time}</div>
              <div>
                <strong style="color:var(--color-text-900);">${b.clientName}</strong>
                <div style="font-size:11px; color:var(--color-text-500);">${b.clientPhone || ''}</div>
              </div>
              <div>
                <div style="font-weight:600; color:var(--color-text-900);">${b.serviceNames}</div>
                <div style="font-size:11px; color:var(--color-text-500);">${b.durationMinutes || 60} min</div>
              </div>
              <div>
                <span class="badge ${isHome ? 'badge-warning' : 'badge-brand'}">${isHome ? 'A Domicílio' : 'Studio'}</span>
              </div>
              <div>
                <strong style="color:var(--color-brand-900); font-size:13.5px;">R$ ${(b.totalPrice || 0).toFixed(2)}</strong>
                <div style="font-size:10.5px; color:var(--color-text-500);">${b.paymentMethod === 'PIX' ? 'Pix' : 'Cartão'}</div>
              </div>
              <div style="text-align:right; display:flex; justify-content:flex-end; align-items:center; gap:6px;">
                <span class="badge ${statusClass}">${b.status}</span>
                <span style="color:var(--color-brand-700); font-size:12px;">›</span>
              </div>
            </div>
          `;
        }
      });

      html += `</div>`;
    });

    container.innerHTML = html;
  }

  // --- Cálculo Dinâmico de Slots Livres para o Agendamento do Cliente ---
  getAvailableSlots(dateStr, requestedDurationMinutes = 60) {
    const settings = window.dataManager.getSettings();

    // 0. Se a data estiver totalmente bloqueada ou em período de férias
    if (window.dataManager.isDateFullyBlocked(dateStr)) {
      return [];
    }

    // 1. Verificar se o Studio abre neste dia da semana
    const [yearVal, monthVal, dayVal] = dateStr.split('-').map(Number);
    const dateObj = new Date(yearVal, monthVal - 1, dayVal);
    const dayOfWeek = dateObj.getDay();

    if (settings.workDays && !settings.workDays.includes(dayOfWeek)) {
      return []; // Studio fechado neste dia da semana
    }

    const existingBookings = window.dataManager.getBookingsByDate(dateStr);

    const [openH, openM] = (settings.openingTime || '09:00').split(':').map(Number);
    const [closeH, closeM] = (settings.closingTime || '19:00').split(':').map(Number);

    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;
    const step = settings.slotInterval || 30;
    const buffer = parseInt(settings.cleaningBufferMinutes) || 0;

    // Converter agendamentos e bloqueios existentes em intervalos ocupados [inicio, fim]
    // Acrescenta tempo de higienização da bancada após cada cliente
    const busyIntervals = existingBookings.map(b => {
      const [h, m] = b.time.split(':').map(Number);
      const start = h * 60 + m;
      const end = start + (b.duration || 60) + (b.isBlock ? 0 : buffer);
      return { start, end };
    });

    // 2. Adicionar pausa de almoço automática se ativada nas configurações
    if (settings.hasLunchBreak && settings.lunchStartTime && settings.lunchEndTime) {
      const [lh1, lm1] = settings.lunchStartTime.split(':').map(Number);
      const [lh2, lm2] = settings.lunchEndTime.split(':').map(Number);
      busyIntervals.push({
        start: lh1 * 60 + lm1,
        end: lh2 * 60 + lm2
      });
    }

    const slots = [];
    const now = new Date();
    const isToday = this.formatDateKey(now) === dateStr;
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
    const minNoticeMinutes = (settings.minNoticeHours || 2) * 60;

    for (let time = startMinutes; time + requestedDurationMinutes <= endMinutes; time += step) {
      const slotStart = time;
      const slotEnd = time + requestedDurationMinutes;

      // Se for hoje, respeitar a antecedência mínima para agendamento
      if (isToday && slotStart <= currentMinutesNow + minNoticeMinutes) {
        continue;
      }

      // Checar se há sobreposição com algum agendamento, bloqueio ou almoço
      const hasConflict = busyIntervals.some(busy => {
        return (slotStart < busy.end && slotEnd > busy.start);
      });

      const hours = String(Math.floor(slotStart / 60)).padStart(2, '0');
      const mins = String(slotStart % 60).padStart(2, '0');
      const timeFormatted = `${hours}:${mins}`;

      slots.push({
        time: timeFormatted,
        available: !hasConflict
      });
    }

    return slots;
  }
}

// Instância global disponível
window.calendarEngine = new CalendarEngine();
