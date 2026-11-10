import { dueDate } from './deadline';

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Convert a shopper-confirmed date using civil days, independent of DST hours. */
export function windowDaysFromDeadline(start: string, deadline: string): number {
  if (!validDate(start)) throw new Error('Enter a valid purchase date or confirmed clock start first.');
  if (!validDate(deadline) || deadline >= '9999-12-31') throw new Error('Choose a real return-by date before 9999-12-31.');
  const days = (Date.parse(deadline + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86_400_000;
  if (!Number.isSafeInteger(days) || days < 1) throw new Error('The return-by date must be after the clock start. Check both dates.');
  if (dueDate(start, days) !== deadline) throw new Error('This date could not be represented in the saved return window. Check the dates.');
  return days;
}

/** Use the existing reviewed day-window model; no inferred retailer policy. */
export function bindKnownDeadlines(): void {
  for (const id of ['manual-form', 'edit-form']) {
    const form = document.querySelector<HTMLFormElement>('form#' + id);
    if (!form) continue;
    const days = form.elements.namedItem('windowDays') as HTMLInputElement;
    const fixed = form.elements.namedItem('fixedDeadline') as HTMLInputElement;
    const purchase = form.elements.namedItem('orderDate') as HTMLInputElement;
    const start = form.elements.namedItem('windowStartDate') as HTMLInputElement;
    const section = document.createElement('details');
    section.className = 'known-deadline';
    section.innerHTML = '<summary>Know the exact return-by date?</summary><p>Use the deadline you checked on your receipt or with the store. ReturnBy calculates the day window for you.</p><label for="' + id + '-known-date">Confirmed return-by date<input id="' + id + '-known-date" type="date" min="1000-01-02" max="9999-12-30"></label><button type="button" class="button button-link">Use this return-by date</button><p role="status" aria-live="polite"></p>';
    days.closest('label')!.after(section);
    const date = section.querySelector('input')!;
    const apply = section.querySelector('button')!;
    const message = section.querySelector('p[role]')!;
    let active = Boolean(fixed.value);
    const sync = () => { active=Boolean(fixed.value); date.value=fixed.value; section.open=active; if(active) calculate(); };
    function calculate(): boolean {
      try {
        const clock = start.value || purchase.value;
        const value = windowDaysFromDeadline(clock, date.value);
        days.value = String(value);
        fixed.value = date.value;
        date.removeAttribute('aria-invalid');
        message.textContent = 'Return by ' + date.value + ': ' + value + ' days from ' + clock + '. This exact date stays fixed after saving and reopening. Changing the clock keeps it; entering days switches to a duration rule.';
        return true;
      } catch (error) {
        date.setAttribute('aria-invalid', 'true');
        message.textContent = error instanceof Error ? error.message : 'Check both dates.';
        return false;
      }
    }
    apply.addEventListener('click', () => {
      active = calculate();
      if (active) days.dispatchEvent(new Event('input', { bubbles: true }));
      else { days.value = ''; days.dispatchEvent(new Event('input', {bubbles:true})); date.focus(); }
    });
    // Capture runs before the existing form preview listeners.
    form.addEventListener('input', event => {
      if (event.target === days && event.isTrusted) {
        active = false; fixed.value = '';
        message.textContent = 'Using the day window you entered. Choose Use this return-by date to apply the date again.';
      } else if (active && (event.target === purchase || event.target === start || event.target === date)) {
        if (!calculate()) days.value = '';
      }
    }, true);
    const clear = () => { active = false; date.value = ''; message.textContent = ''; date.removeAttribute('aria-invalid'); section.open = false; };
    form.addEventListener('reset', clear);
    form.addEventListener('returnby:purchase-replaced', () => { fixed.value = ''; clear(); });
    form.addEventListener('returnby-edit-loaded', sync);
    sync();
    form.closest('dialog')?.addEventListener('close', () => { if(id==='edit-form') clear(); });
  }
}
