<?php
// =========================================================================
// backend/content/get_pretest_activities.php — the Pre-Test activities
// GET → { status, levels: { "Jr KG": [ {position, type, activity, cg, page, retired} … ], "Sr KG": [ … ] } }
// Any logged-in user (teachers read it to show the Pre-Test). In position order;
// retired ones are included (flagged) so saved marks keep their activity.
// =========================================================================
require_once __DIR__ . '/content_common.php';
content_require_login();
$conn = get_db_connection();
$levels = ['Jr KG' => [], 'Sr KG' => []];
$res = $conn->query('SELECT level, position, type, activity, cg, page, retired FROM content_pretest_activities ORDER BY level, position');
if(!$res) content_fail(500, 'The activities table is missing — run backend/sql/008_content_editing.sql.');
while($r = $res->fetch_assoc()){
    $levels[$r['level']][] = ['position' => (int) $r['position'], 'type' => $r['type'], 'activity' => $r['activity'], 'cg' => $r['cg'], 'page' => $r['page'], 'retired' => (bool) $r['retired']];
}
content_ok(['levels' => $levels]);
