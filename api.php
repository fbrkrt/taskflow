<?php
/**
 * api.php — TaskBoard REST API
 *
 * GET  api.php?action=get_all
 * POST api.php?action=add
 * POST api.php?action=edit
 * POST api.php?action=toggle
 * POST api.php?action=delete
 * POST api.php?action=clear_completed
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';

$body = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true) ?? [];
}

switch ($action) {

    // ── GET ALL ──────────────────────────────────────
    case 'get_all':
        $tasks = db_read();
        echo json_encode(['success' => true, 'tasks' => $tasks]);
        break;

    // ── ADD ──────────────────────────────────────────
    case 'add':
        $title = trim($body['title'] ?? '');
        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Title wajib diisi.']);
            break;
        }
        $tasks   = db_read();
        $newTask = [
            'id'          => db_generate_id(),
            'title'       => $title,
            'description' => trim($body['description'] ?? ''),
            'category'    => in_array($body['category'] ?? '', ['academic','personal','work'])
                                ? $body['category'] : 'personal',
            'priority'    => in_array($body['priority'] ?? '', ['low','medium','high'])
                                ? $body['priority'] : 'medium',
            'deadline'    => $body['deadline'] ?? '',
            'completed'   => false,
            'createdAt'   => date('c'),
        ];
        array_unshift($tasks, $newTask);
        db_write($tasks);
        echo json_encode(['success' => true, 'task' => $newTask]);
        break;

    // ── EDIT ─────────────────────────────────────────
    case 'edit':
        $id    = $body['id'] ?? '';
        $title = trim($body['title'] ?? '');
        if ($id === '' || $title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID dan title wajib diisi.']);
            break;
        }
        $tasks = db_read();
        $found = false;
        foreach ($tasks as &$task) {
            if ($task['id'] === $id) {
                $task['title']       = $title;
                $task['description'] = trim($body['description'] ?? '');
                $task['category']    = in_array($body['category'] ?? '', ['academic','personal','work'])
                                          ? $body['category'] : $task['category'];
                $task['priority']    = in_array($body['priority'] ?? '', ['low','medium','high'])
                                          ? $body['priority'] : $task['priority'];
                $task['deadline']    = $body['deadline'] ?? $task['deadline'];
                $found = true;
                break;
            }
        }
        unset($task);
        if (!$found) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Task tidak ditemukan.']); break; }
        db_write($tasks);
        echo json_encode(['success' => true]);
        break;

    // ── TOGGLE ───────────────────────────────────────
    case 'toggle':
        $id        = $body['id'] ?? '';
        $completed = isset($body['completed']) ? (bool)$body['completed'] : null;
        if ($id === '' || $completed === null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID dan completed wajib diisi.']);
            break;
        }
        $tasks = db_read();
        $found = false;
        foreach ($tasks as &$task) {
            if ($task['id'] === $id) {
                $task['completed'] = $completed;
                $found = true;
                break;
            }
        }
        unset($task);
        if (!$found) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Task tidak ditemukan.']); break; }
        db_write($tasks);
        echo json_encode(['success' => true]);
        break;

    // ── DELETE ────────────────────────────────────────
    case 'delete':
        $id = $body['id'] ?? '';
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID wajib diisi.']);
            break;
        }
        $tasks  = db_read();
        $before = count($tasks);
        $tasks  = array_filter($tasks, fn($t) => $t['id'] !== $id);
        if (count($tasks) === $before) { http_response_code(404); echo json_encode(['success' => false, 'message' => 'Task tidak ditemukan.']); break; }
        db_write($tasks);
        echo json_encode(['success' => true]);
        break;

    // ── CLEAR COMPLETED ───────────────────────────────
    case 'clear_completed':
        $tasks = db_read();
        $tasks = array_filter($tasks, fn($t) => empty($t['completed']));
        db_write($tasks);
        echo json_encode(['success' => true, 'remaining' => count($tasks)]);
        break;

    // ── DEFAULT ───────────────────────────────────────
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action tidak dikenal: ' . htmlspecialchars($action)]);
        break;
}
