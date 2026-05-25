<?php

class ApiNew_Json {
    public static function ok($data, $status, $meta) {
        if (!is_array($meta)) {
            $meta = array();
        }
        return array(
            'status' => $status,
            'body' => array(
                'code' => 0,
                'data' => $data,
                'meta' => self::meta($meta),
            ),
        );
    }

    public static function error($status, $code, $message, $meta) {
        if (!is_array($meta)) {
            $meta = array();
        }
        return array(
            'status' => $status,
            'body' => array(
                'code' => $code,
                'message' => $message,
                'meta' => self::meta($meta),
            ),
        );
    }

    public static function send($response) {
        $status = isset($response['status']) ? intval($response['status']) : 200;
        $body = isset($response['body']) ? $response['body'] : array();

        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
        }

        echo json_encode($body, JSON_UNESCAPED_UNICODE);
    }

    public static function requestId() {
        if (function_exists('random_bytes')) {
            try {
                return bin2hex(random_bytes(8));
            } catch (Exception $e) {
                return md5(uniqid('', true));
            }
        }
        if (function_exists('openssl_random_pseudo_bytes')) {
            $bytes = openssl_random_pseudo_bytes(8);
            if ($bytes !== false) {
                return bin2hex($bytes);
            }
        }
        return md5(uniqid('', true));
    }

    private static function meta($meta) {
        if (!isset($meta['requestId'])) {
            $meta['requestId'] = isset($GLOBALS['api_new_request_id']) ? $GLOBALS['api_new_request_id'] : self::requestId();
        }
        if (!isset($meta['serverTime'])) {
            date_default_timezone_set('Asia/Shanghai');
            $meta['serverTime'] = date('c');
        }
        return $meta;
    }
}
