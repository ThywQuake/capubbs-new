<?php

class ApiNew_AuthController {
    private $con;
    private $session;

    public function __construct($con, $session) {
        $this->con = $con;
        $this->session = $session;
    }

    public function me($request, $params, $meta) {
        return ApiNew_Response::ok(array(
            'viewer' => ApiNew_UserPresenter::viewer($this->session->user()),
        ), $meta);
    }

    public function login($request, $params, $meta) {
        $username = ApiNew_Validation::stringParam($request->input('username', $request->input('account', '')), '', 30);
        $passwordHash = $this->readPasswordHash($request);
        if ($username === '' || $passwordHash === '') {
            return ApiNew_Response::badRequest('Missing username or password hash', $meta);
        }

        if (!preg_match('/^[a-f0-9]{32}$/i', $passwordHash)) {
            return ApiNew_Response::badRequest('Invalid password hash', $meta);
        }

        $safeUsername = ApiNew_Database::escape($this->con, $username);
        $result = mysqli_query($this->con, "select password, token from userinfo where username='$safeUsername' limit 1");
        $row = ApiNew_Database::row($result);
        if (!$row) {
            return ApiNew_Response::unauthorized('用户不存在。', $meta);
        }

        if (strtoupper($row['password']) !== strtoupper($passwordHash)) {
            return ApiNew_Response::unauthorized('密码错误。', $meta);
        }

        $now = time();
        $token = md5($username . $now);
        if (isset($row['token']) && $row['token'] !== '') {
            $activeToken = ApiNew_Database::escape($this->con, $row['token']);
            $activeRow = ApiNew_Database::row(mysqli_query($this->con, "select token from userinfo where username='$safeUsername' and token='$activeToken' and $now<=tokentime+604800 limit 1"));
            if ($activeRow) {
                $token = $row['token'];
            }
        }

        $safeToken = ApiNew_Database::escape($this->con, $token);
        $safeIp = ApiNew_Database::escape($this->con, $request->ip);
        $today = date('Y-m-d');
        $browser = ApiNew_Database::escape($this->con, isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '');
        mysqli_query($this->con, "update userinfo set tokentime=$now, token='$safeToken', nowboard=null, lastip='$safeIp', lastdate='$today', onlinetype='web', logininfo='$browser' where username='$safeUsername'");
        $this->autoSign($username);
        $this->session->setTokenCookie($token);
        $user = $this->loadUserByUsername($username);
        return ApiNew_Response::ok(array(
            'viewer' => ApiNew_UserPresenter::viewer($user),
            'token' => $token,
        ), $meta);
    }

    public function logout($request, $params, $meta) {
        $token = ApiNew_Database::escape($this->con, $this->session->token());
        $ip = ApiNew_Database::escape($this->con, $request->ip);
        $today = date('Y-m-d');
        if ($token !== '') {
            mysqli_query($this->con, "update userinfo set nowboard=null, lastip='$ip', lastdate='$today' where token='$token'");
        }
        $this->session->clearTokenCookie();
        return ApiNew_Response::ok(array('ok' => true), $meta);
    }

    private function loadUserByUsername($username) {
        $username = ApiNew_Database::escape($this->con, $username);
        $sql = "select username, userid, rights, star, score, icon, intro, sig1, sig2, sig3, mail, regdate, lastdate, lastip, newmsg, post, reply, water, sign, lastpost from userinfo where username='$username' limit 1";
        return ApiNew_Database::row(mysqli_query($this->con, $sql));
    }

    private function readPasswordHash($request) {
        $passwordHash = strval($request->input('passwordHash', $request->input('passwordMd5', $request->input('password1', ''))));

        if ($passwordHash !== '') {
            return $passwordHash;
        }

        $legacyPassword = strval($request->input('password', ''));
        if (preg_match('/^[a-f0-9]{32}$/i', $legacyPassword)) {
            return $legacyPassword;
        }

        return '';
    }

    private function autoSign($username) {
        $safeUsername = ApiNew_Database::escape($this->con, $username);
        $time = time();
        $year = intval(date('Y', $time));
        $month = intval(date('m', $time));
        $day = intval(date('d', $time));
        $exists = ApiNew_Database::row(mysqli_query($this->con, "select username from sign where year=$year and month=$month and day=$day and username='$safeUsername' limit 1"));
        if ($exists) {
            return;
        }

        $hour = intval(date('H', $time));
        $minute = intval(date('i', $time));
        $second = intval(date('s', $time));
        $week = intval(date('N', $time));
        mysqli_query($this->con, "insert into sign values ($year,$month,$day,$hour,$minute,$second,$week,'$safeUsername')");
        mysqli_query($this->con, "update userinfo set sign=sign+1 where username='$safeUsername'");
    }
}
