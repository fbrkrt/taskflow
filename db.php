<?php
/**
 * db.php — JSON File Storage Helper
 * Data task disimpan di tasks_data.json (terpisah dari seed tasks.json).
 */

define('DATA_FILE', __DIR__ . '/tasks_data.json');

/**
 * Baca semua task. Jika belum ada, copy dari tasks.json (seed data).
 */
function db_read(): array {
    if (!file_exists(DATA_FILE)) {
        $seed = __DIR__ . '/tasks.json';
        if (file_exists($seed)) {
            $data = json_decode(file_get_contents($seed), true);
            if (is_array($data)) {
                db_write($data);
                return $data;
            }
        }
        return [];
    }
    $raw  = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Tulis array task ke file JSON.
 */
function db_write(array $tasks): bool {
    return file_put_contents(
        DATA_FILE,
        json_encode(array_values($tasks), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    ) !== false;
}

/**
 * Generate ID unik.
 */
function db_generate_id(): string {
    return uniqid('task_', true);
}
