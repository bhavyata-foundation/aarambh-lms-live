/* =========================================================================
   js/duration-picker.js — the "Period" picker of the superadmin dashboards
   -------------------------------------------------------------------------
   superadmin-dashboards.js draws its period choice with
       durationPickerHtml(id, currentLabel, groups)
   where groups = [{ label: 'Monthly', options: [{ value, label, selected }] }, …]
   and registers what to redraw in
       durationPickerRerenderers[id]            (redraw)
       durationPickerRerenderers[id + ':select'](value)   (a period was chosen)
   Neither existed on the server, so the dashboards stopped at the Period bar.
   Load BEFORE js/superadmin-dashboards.js.
   ========================================================================= */
window.durationPickerRerenderers = window.durationPickerRerenderers || {};
var durationPickerRerenderers = window.durationPickerRerenderers;
function durationPickerHtml(id, label, groups){
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<select class="duration-picker" data-duration-picker="${e(id)}" aria-label="Period: ${e(label)}" onchange="durationPickerChoose('${e(id)}', this.value)"
      style="padding:7px 10px; border:1px solid var(--border, #D6DCD7); border-radius:8px; font:inherit; font-size:13.5px; margin-left:6px; background:#fff;">`
    + (groups || []).map(g => `<optgroup label="${e(g.label)}">` + (g.options || []).map(o => `<option value="${e(o.value)}" ${o.selected ? 'selected' : ''}>${e(o.label)}</option>`).join('') + '</optgroup>').join('')
    + '</select>';
}
function durationPickerChoose(id, value){
  const r = window.durationPickerRerenderers;
  if(typeof r[id + ':select'] === 'function') r[id + ':select'](value);
  else if(typeof r[id] === 'function') r[id](value);
}
