<?php

class ApiNew_Router {
    private $routes = array();

    public function add($method, $pattern, $handler) {
        $this->routes[] = array(
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        );
    }

    public function dispatch($request, $meta) {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }
            $params = $this->match($route['pattern'], $request->path);
            if ($params === null) {
                continue;
            }
            return call_user_func($route['handler'], $request, $params, $meta);
        }

        return ApiNew_Response::notFound('Endpoint not found', $meta);
    }

    private function match($pattern, $path) {
        $paramNames = array();
        $regex = preg_replace_callback('/\:([A-Za-z_][A-Za-z0-9_]*)/', function ($matches) use (&$paramNames) {
            $paramNames[] = $matches[1];
            return '([^/]+)';
        }, $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $path, $matches)) {
            return null;
        }

        $params = array();
        for ($i = 0; $i < count($paramNames); $i++) {
            $params[$paramNames[$i]] = urldecode($matches[$i + 1]);
        }
        return $params;
    }
}

