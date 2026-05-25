<?php

class ApiNew_Session {
    private $con;
    private $userLoaded = false;
    private $user = null;

    public function __construct($con) {
        $this->con = $con;
    }

    public function token() {
        if (isset($_COOKIE['token']) && $_COOKIE['token'] !== '') {
            return $_COOKIE['token'];
        }
        $authorization = '';
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authorization = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authorization = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (stripos($authorization, 'Bearer ') === 0) {
            return trim(substr($authorization, 7));
        }
        return '';
    }

    public function user() {
        if ($this->userLoaded) {
            return $this->user;
        }
        $this->userLoaded = true;
        $token = $this->token();
        if ($token === '' || strpos($token, "'") !== false) {
            return null;
        }
        $token = ApiNew_Database::escape($this->con, $token);
        $now = time();
        $sql = "select username, userid, rights, star, score, icon, intro, sig1, sig2, sig3, mail, regdate, lastdate, lastip, newmsg, post, reply, water, sign, lastpost from userinfo where token='$token' and $now<=tokentime+604800 limit 1";
        $this->user = ApiNew_Database::row(mysqli_query($this->con, $sql));
        return $this->user;
    }

    public function setTokenCookie($token) {
        if ($token !== '') {
            setcookie('token', $token, time() + 604800, '/');
        }
    }

    public function clearTokenCookie() {
        setcookie('token', 'invalid', time() - 3600, '/');
    }
}
