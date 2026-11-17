<?php
// =========================================================================
// TEACHER AUTH — the one place that decides "which teacher is this?"
//
//   • Logged in (any address, including ngrok) → her own user ID.
//   • Not logged in, on the server computer itself (localhost) with
//     ?dev_role=teacher → test teacher 49. Testing only.
//   • Not logged in, anywhere else → refused: "Please log in again."
//     Never guesses a teacher, so one class's data can't be read or
//     saved under another teacher's account.
//
// Used by: schools/get_my_class.php, assessment/observation/*,
// assessment/workbook/*, materials/*, google_oauth_start.php.
// =========================================================================

if (!function_exists('teacher_auth_is_local')) {

    function teacher_auth_is_local()
    {
        $host = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
        return in_array($host, ['localhost', '127.0.0.1'], true);
    }

    // The logged-in teacher's ID, or stop the request with 401.
    // $asText = true for pages a person opens directly (not JSON).
    function current_teacher_id($asText = false)
    {
        if (isset($_SESSION['user_id']) && (int) $_SESSION['user_id'] > 0) {
            return (int) $_SESSION['user_id'];
        }

        if (teacher_auth_is_local() && isset($_GET['dev_role'])) {
            return 49; // test teacher — localhost testing only
        }

        http_response_code(401);
        if ($asText) {
            echo 'Please log in again.';
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Please log in again.']);
        }
        exit;
    }
}
