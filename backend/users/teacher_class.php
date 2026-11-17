<?php
// =========================================================================
// TEACHER CLASS — which of her classes is the teacher working in?
//
// Most teachers have one class. A teacher who teaches two sections of a
// school (one login, both sections) picks one with the class switch in
// the top bar; schools/select_class.php keeps that choice in her session.
// Every file that used to take "her first class" asks here instead, so
// the two sections' children and records never mix.
//
//   teacher_classes($conn, $teacherId)       all her classes, oldest first
//   teacher_active_class($conn, $teacherId)  the chosen one (or her first),
//                                            ['id', 'school_id', 'name'] or null
// =========================================================================

if (!function_exists('teacher_active_class')) {

    function teacher_classes($conn, $teacherId)
    {
        $stmt = $conn->prepare('SELECT id, school_id, name FROM classes WHERE teacher_user_id = ? ORDER BY id');
        $teacherId = (int) $teacherId;
        $stmt->bind_param('i', $teacherId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $rows;
    }

    function teacher_active_class($conn, $teacherId)
    {
        $classes = teacher_classes($conn, $teacherId);
        if (!$classes) return null;
        $wanted = (int) ($_SESSION['active_class_id'] ?? 0);
        foreach ($classes as $c) {
            if ((int) $c['id'] === $wanted) return $c;
        }
        return $classes[0];
    }
}
