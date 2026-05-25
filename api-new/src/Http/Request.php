<?php

class ApiNew_Request {
    public $method;
    public $path;
    public $query;
    public $body;
    public $headers;
    public $ip;

    public function __construct() {
        $this->method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
        $this->path = $this->resolvePath();
        $this->query = $_GET;
        $this->headers = $this->readHeaders();
        $this->body = $this->readBody();
        $this->ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    }

    public function input($key, $default) {
        if (is_array($this->body) && array_key_exists($key, $this->body)) {
            return $this->body[$key];
        }
        if (array_key_exists($key, $this->query)) {
            return $this->query[$key];
        }
        return $default;
    }

    private function resolvePath() {
        $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
        $path = parse_url($uri, PHP_URL_PATH);
        if (!$path) {
            $path = '/';
        }

        $marker = '/api-new/index.php';
        $pos = strpos($path, $marker);
        if ($pos !== false) {
            $path = substr($path, $pos + strlen($marker));
            return $path === '' ? '/' : $path;
        }

        $marker = '/api-new';
        $pos = strpos($path, $marker);
        if ($pos !== false) {
            $path = substr($path, $pos + strlen($marker));
            return $path === '' ? '/' : $path;
        }

        if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '') {
            return $_SERVER['PATH_INFO'];
        }

        return '/';
    }

    private function readBody() {
        if ($this->method === 'GET' || $this->method === 'HEAD') {
            return array();
        }

        $raw = file_get_contents('php://input');
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
        if ($raw !== '' && stripos($contentType, 'application/json') !== false) {
            $decoded = json_decode($raw, true);
            return is_array($decoded) ? $decoded : array();
        }

        if (!empty($_POST)) {
            return $_POST;
        }

        return array();
    }

    private function readHeaders() {
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            return is_array($headers) ? $headers : array();
        }
        $headers = array();
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$name] = $value;
            }
        }
        return $headers;
    }
}

