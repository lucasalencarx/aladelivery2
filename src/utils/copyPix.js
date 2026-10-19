// Use the visible field: controls outside a modal dialog cannot receive focus.
export async function copyPix(code, field) {
  const value = String(code || '').trim();
  if (!value || !field || field.value !== value) return false;
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return true; } catch { /* Try selection below. */ }
  }
  const previous = document.activeElement;
  const select = () => {
    field.focus({preventScroll:true});
    field.select();
    field.setSelectionRange(0, value.length);
  };
  select();
  try {
    if (document.execCommand?.('copy')) {
      if (previous && previous !== field) previous.focus({preventScroll:true});
      return true;
    }
  } catch { /* Keep the field selected for manual copying. */ }
  select();
  return false;
}
