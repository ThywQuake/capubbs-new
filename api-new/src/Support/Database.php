<?php

class ApiNew_Database {
    private static $lastError = '';

    public static function connect() {
        $configPath = __DIR__ . '/../../../config.php';
        if (!file_exists($configPath)) {
            self::$lastError = 'Missing config.php';
            return null;
        }
        if (!function_exists('mysqli_connect')) {
            self::$lastError = 'mysqli extension is unavailable';
            return null;
        }

        require_once $configPath;
        if (!defined('CAPUBBS_DB_HOSTNAME') || !defined('CAPUBBS_DB_USERNAME') || !defined('CAPUBBS_DB_PASSWORD')) {
            self::$lastError = 'Database constants are incomplete';
            return null;
        }

        $con = @mysqli_connect(CAPUBBS_DB_HOSTNAME, CAPUBBS_DB_USERNAME, CAPUBBS_DB_PASSWORD, 'capubbs');
        if (!$con) {
            self::$lastError = mysqli_connect_error();
            return null;
        }

        mysqli_query($con, "SET NAMES 'utf8mb4'");
        mysqli_query($con, "SET sql_mode = ''");
        return $con;
    }

    public static function lastError() {
        return self::$lastError;
    }

    public static function escape($con, $value) {
        return mysqli_real_escape_string($con, strval($value));
    }

    public static function rows($result) {
        $rows = array();
        if (!$result) {
            return $rows;
        }
        while ($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
            $rows[] = $row;
        }
        return $rows;
    }

    public static function row($result) {
        if (!$result) {
            return null;
        }
        $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
        return $row ? $row : null;
    }

    public static function tableExists($con, $tableName) {
        static $cache = array();
        if (isset($cache[$tableName])) {
            return $cache[$tableName];
        }
        $tableName = self::escape($con, $tableName);
        $result = mysqli_query($con, "show tables like '$tableName'");
        $cache[$tableName] = $result && mysqli_num_rows($result) > 0;
        return $cache[$tableName];
    }
}
