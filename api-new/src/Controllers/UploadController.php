<?php

class ApiNew_UploadController {
    private $session;

    public function __construct($session) {
        $this->session = $session;
    }

    public function editorImage($request, $params, $meta) {
        $user = $this->session->user();
        if (!$user) {
            return ApiNew_Response::unauthorized('Please login before uploading images', $meta);
        }

        $md5 = strtolower(ApiNew_Validation::stringParam($request->input('md5', ''), '', 32));
        $dataUrl = strval($request->input('dataUrl', ''));
        if (!preg_match('/^[a-f0-9]{32}$/', $md5)) {
            return ApiNew_Response::badRequest('Invalid md5', $meta);
        }
        if (!preg_match('/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/]+={0,2})$/', $dataUrl, $matches)) {
            return ApiNew_Response::badRequest('Invalid image data', $meta);
        }

        $bytes = base64_decode($matches[2], true);
        if ($bytes === false || strlen($bytes) === 0) {
            return ApiNew_Response::badRequest('Invalid image data', $meta);
        }
        if (strlen($bytes) > 2 * 1024 * 1024) {
            return ApiNew_Response::badRequest('Image must be 2MB or smaller', $meta);
        }
        if (md5($bytes) !== $md5) {
            return ApiNew_Response::badRequest('MD5 mismatch', $meta);
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $dir = __DIR__ . '/../../images';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $filename = $md5 . '.' . $extension;
        $path = $dir . '/' . $filename;
        if (!file_exists($path)) {
            file_put_contents($path, $bytes);
        }

        return ApiNew_Response::ok(array(
            'md5' => $md5,
            'url' => '/api-new/images/' . $filename,
        ), $meta);
    }
}

