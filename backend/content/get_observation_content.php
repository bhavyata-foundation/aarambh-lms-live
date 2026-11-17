<?php
// =========================================================================
// backend/content/get_observation_content.php — every observation theme (superadmin)
// GET → { status, themes: [ {id, level, month, name, order, retired, items: [ {id, cg_code, order, retired} ] } ] }
// Both classes, all months, retired ones included — for the Content & Activities editor.
// =========================================================================
require_once __DIR__ . '/content_common.php';
content_require_superadmin();
$conn = get_db_connection();
$themes = [];
$res = $conn->query("SELECT id, level, month_scheduled, name, display_order, retired FROM observation_themes
  ORDER BY level, FIELD(month_scheduled, 'June','July','August','September','October','November','December','January','February','March','April'), display_order, id");
while($r = $res->fetch_assoc()) $themes[(int) $r['id']] = ['id' => (int) $r['id'], 'level' => $r['level'], 'month' => $r['month_scheduled'], 'name' => $r['name'], 'order' => (int) $r['display_order'], 'retired' => (bool) $r['retired'], 'items' => []];
$res = $conn->query('SELECT id, theme_id, cg_code, item_order, retired FROM observation_items ORDER BY theme_id, item_order, id');
while($r = $res->fetch_assoc()) if(isset($themes[(int) $r['theme_id']])) $themes[(int) $r['theme_id']]['items'][] = ['id' => (int) $r['id'], 'cg_code' => $r['cg_code'], 'order' => (int) $r['item_order'], 'retired' => (bool) $r['retired']];
content_ok(['themes' => array_values($themes)]);
