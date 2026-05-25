<?php

class ApiNew_Response {
    public static function ok($data, $meta) {
        return ApiNew_Json::ok($data, 200, $meta);
    }

    public static function created($data, $meta) {
        return ApiNew_Json::ok($data, 201, $meta);
    }

    public static function noContent($meta) {
        return ApiNew_Json::ok(array('ok' => true), 200, $meta);
    }

    public static function badRequest($message, $meta) {
        return ApiNew_Json::error(400, 400, $message, $meta);
    }

    public static function unauthorized($message, $meta) {
        return ApiNew_Json::error(401, 401, $message, $meta);
    }

    public static function notFound($message, $meta) {
        return ApiNew_Json::error(404, 404, $message, $meta);
    }

    public static function methodNotAllowed($meta) {
        return ApiNew_Json::error(405, 405, 'Method not allowed', $meta);
    }

    public static function serverError($message, $meta) {
        return ApiNew_Json::error(500, 500, $message, $meta);
    }

    public static function serviceUnavailable($message, $meta) {
        return ApiNew_Json::error(503, 503, $message, $meta);
    }
}
