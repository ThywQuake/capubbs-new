<?php

class ApiNew_Validation {
    public static function intParam($value, $default, $min, $max) {
        if ($value === null || $value === '') {
            return $default;
        }
        $number = intval($value);
        if ($number < $min) {
            return $min;
        }
        if ($number > $max) {
            return $max;
        }
        return $number;
    }

    public static function stringParam($value, $default, $maxLength) {
        if ($value === null) {
            return $default;
        }
        $text = trim(strval($value));
        if (function_exists('mb_strlen') && mb_strlen($text, 'UTF-8') > $maxLength) {
            return mb_substr($text, 0, $maxLength, 'UTF-8');
        }
        if (!function_exists('mb_strlen') && strlen($text) > $maxLength) {
            return substr($text, 0, $maxLength);
        }
        return $text;
    }

    public static function oneOf($value, $default, $allowed) {
        return in_array($value, $allowed, true) ? $value : $default;
    }

    public static function boolParam($value, $default) {
        if ($value === null || $value === '') {
            return $default;
        }
        if ($value === true || $value === 1 || $value === '1') {
            return true;
        }
        if ($value === false || $value === 0 || $value === '0') {
            return false;
        }
        $text = strtolower(strval($value));
        if ($text === 'true' || $text === 'yes' || $text === 'on') {
            return true;
        }
        if ($text === 'false' || $text === 'no' || $text === 'off') {
            return false;
        }
        return $default;
    }
}
