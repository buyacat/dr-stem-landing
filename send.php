<?php
declare(strict_types=1);

/**
 * Обробник заявки з лендінгу Dr.STEM.
 * Відправка через Mandrill HTTP API (curl/HTTPS) — без системного MTA.
 * Безпека: тільки POST, ліміт розміру, honeypot, валідація, rate-limit по IP,
 * захист від header-injection. API-ключ читається ПОЗА webroot (не в git).
 */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

// --- Налаштування ---
$TO_EMAIL   = 'office@llcise.com';                    // отримувач заявок (прод)
$FROM_EMAIL = 'no-reply@eddy.org.ua';                 // має бути верифікованим доменом у Mandrill
$FROM_NAME  = 'Dr.STEM';
// Ключ: спочатку env, потім файл поза webroot (../mandrill.key поряд із теками dist/)
$API_KEY    = getenv('MANDRILL_KEY')
            ?: trim((string) @file_get_contents(__DIR__ . '/../mandrill.key'));

function fail(int $code, string $error): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}
function ok(): never {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 1. Лише POST ---
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'method_not_allowed');
}

// --- 2. Ліміт розміру тіла ---
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    fail(413, 'payload_too_large');
}

// --- 3. Rate-limit: не частіше ніж раз на 10с з однієї IP ---
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$throttleFile = sys_get_temp_dir() . '/drstem_rl_' . md5($ip);
$now = time();
if (is_file($throttleFile) && ($now - (int) @file_get_contents($throttleFile)) < 10) {
    fail(429, 'too_many_requests');
}
@file_put_contents($throttleFile, (string) $now);

/** Прибирає переноси рядків і обрізає до ліміту — захист від header-injection. */
function clean(string $v, int $max): string {
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return mb_substr(trim(strip_tags($v)), 0, $max);
}

// --- 4. Honeypot ---
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    ok(); // вдаємо успіх, щоб не підказувати боту
}

// --- 5. Валідація ---
$name    = clean((string) ($_POST['name'] ?? ''), 120);
$org     = clean((string) ($_POST['org'] ?? ''), 200);
$phone   = clean((string) ($_POST['phone'] ?? ''), 40);
$email   = clean((string) ($_POST['email'] ?? ''), 200);
$comment = mb_substr(trim(strip_tags((string) ($_POST['comment'] ?? ''))), 0, 2000);
$product = clean((string) ($_POST['product'] ?? 'sensors'), 20);

if ($name === '') {
    fail(422, 'name_required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(422, 'invalid_email');
}
if ($API_KEY === '') {
    fail(500, 'mail_not_configured');
}

// --- 6. Лист ---
$subject = $product === 'robotics'
    ? 'Нова заявка на Робототехніку Dr.STEM'
    : 'Нова заявка на ЦВКК Dr.STEM';
$body  = "Ім'я: {$name}\n";
$body .= "Організація: {$org}\n";
$body .= "Телефон: {$phone}\n";
$body .= "Email: {$email}\n";
$body .= "Коментар: {$comment}\n";

$payload = [
    'key'     => $API_KEY,
    'message' => [
        'from_email' => $FROM_EMAIL,
        'from_name'  => $FROM_NAME,
        'subject'    => $subject,
        'text'       => $body,
        'to'         => [['email' => $TO_EMAIL, 'type' => 'to']],
        'headers'    => ['Reply-To' => $email],
    ],
];

// --- 7. Відправка через Mandrill HTTP API ---
$ch = curl_init('https://mandrillapp.com/api/1.0/messages/send.json');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
]);
$resp     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resp === false) {
    fail(502, 'mail_transport_error');
}

$data = json_decode((string) $resp, true);

// Помилка рівня API (невірний ключ, не верифікований домен тощо)
if ($httpCode !== 200 || (isset($data['status']) && $data['status'] === 'error')) {
    fail(502, 'mail_rejected');
}

// Успіх: Mandrill повертає масив отримувачів зі статусом
$status = $data[0]['status'] ?? '';
if (in_array($status, ['sent', 'queued', 'scheduled'], true)) {
    ok();
}

fail(502, 'mail_rejected');
