<?php

require_once __DIR__ . '/src/Support/Json.php';
require_once __DIR__ . '/src/Support/Database.php';
require_once __DIR__ . '/src/Support/Validation.php';
require_once __DIR__ . '/src/Http/Request.php';
require_once __DIR__ . '/src/Http/Response.php';
require_once __DIR__ . '/src/Http/Router.php';
require_once __DIR__ . '/src/Auth/Session.php';
require_once __DIR__ . '/src/Cache/CacheStore.php';
require_once __DIR__ . '/src/Cache/NullCacheStore.php';
require_once __DIR__ . '/src/Presenters/UserPresenter.php';
require_once __DIR__ . '/src/Presenters/BoardPresenter.php';
require_once __DIR__ . '/src/Presenters/ThreadPresenter.php';
require_once __DIR__ . '/src/Repositories/BoardRepository.php';
require_once __DIR__ . '/src/Repositories/ThreadRepository.php';
require_once __DIR__ . '/src/Repositories/PostRepository.php';
require_once __DIR__ . '/src/Repositories/ActivityRepository.php';
require_once __DIR__ . '/src/Repositories/MessageRepository.php';
require_once __DIR__ . '/src/Repositories/CalendarRepository.php';
require_once __DIR__ . '/src/Controllers/BootstrapController.php';
require_once __DIR__ . '/src/Controllers/BoardController.php';
require_once __DIR__ . '/src/Controllers/ThreadController.php';
require_once __DIR__ . '/src/Controllers/AuthController.php';
require_once __DIR__ . '/src/Controllers/UploadController.php';

$GLOBALS['api_new_request_id'] = ApiNew_Json::requestId();
$meta = array('requestId' => $GLOBALS['api_new_request_id']);

try {
    $request = new ApiNew_Request();
    if ($request->path === '/health' || $request->path === '/healthz') {
        ApiNew_Json::send(ApiNew_Response::ok(array(
            'ok' => true,
            'databaseConfigured' => file_exists(__DIR__ . '/../config.php'),
        ), $meta));
        exit;
    }

    $con = ApiNew_Database::connect();
    if (!$con) {
        ApiNew_Json::send(ApiNew_Response::serviceUnavailable('Database unavailable', $meta));
        exit;
    }

    $session = new ApiNew_Session($con);
    $boardRepository = new ApiNew_BoardRepository($con);
    $threadRepository = new ApiNew_ThreadRepository($con);
    $postRepository = new ApiNew_PostRepository($con);
    $activityRepository = new ApiNew_ActivityRepository($con);
    $messageRepository = new ApiNew_MessageRepository($con);
    $calendarRepository = new ApiNew_CalendarRepository($con);

    $bootstrapController = new ApiNew_BootstrapController(
        $boardRepository,
        $threadRepository,
        $messageRepository,
        $calendarRepository,
        $session
    );
    $boardController = new ApiNew_BoardController($boardRepository, $threadRepository);
    $threadController = new ApiNew_ThreadController(
        $con,
        $threadRepository,
        $postRepository,
        $activityRepository,
        $session
    );
    $authController = new ApiNew_AuthController($con, $session);
    $uploadController = new ApiNew_UploadController($session);

    $router = new ApiNew_Router();
    $router->add('GET', '/health', function ($request, $params, $meta) {
        return ApiNew_Response::ok(array('ok' => true, 'databaseConfigured' => true), $meta);
    });
    $router->add('GET', '/healthz', function ($request, $params, $meta) {
        return ApiNew_Response::ok(array('ok' => true, 'databaseConfigured' => true), $meta);
    });
    $router->add('GET', '/bootstrap', array($bootstrapController, 'show'));
    $router->add('GET', '/boards/:bid/threads', array($boardController, 'listThreads'));
    $router->add('GET', '/threads/:bid/:tid', array($threadController, 'show'));
    $router->add('GET', '/threads/:bid/:tid/floors', array($threadController, 'floors'));
    $router->add('POST', '/auth/login', array($authController, 'login'));
    $router->add('POST', '/auth/logout', array($authController, 'logout'));
    $router->add('GET', '/auth/me', array($authController, 'me'));
    $router->add('POST', '/threads', array($threadController, 'create'));
    $router->add('POST', '/threads/:bid/:tid/replies', array($threadController, 'reply'));
    $router->add('PATCH', '/threads/:bid/:tid/floors/:pid', array($threadController, 'editFloor'));
    $router->add('POST', '/uploads/editor-images', array($uploadController, 'editorImage'));

    ApiNew_Json::send($router->dispatch($request, $meta));
} catch (Exception $error) {
    ApiNew_Json::send(ApiNew_Response::serverError($error->getMessage(), $meta));
}
