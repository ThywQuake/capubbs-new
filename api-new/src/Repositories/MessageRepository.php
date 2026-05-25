<?php

class ApiNew_MessageRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function unreadSummary($username) {
        if (!$username) {
            return array('total' => 0, 'replies' => 0, 'mentions' => 0, 'likes' => 0, 'direct' => 0);
        }
        $username = ApiNew_Database::escape($this->con, $username);
        $system = ApiNew_Database::row(mysqli_query($this->con, "select count(1) as c from messages where receiver='$username' and sender='system' and hasread=0"));
        $direct = ApiNew_Database::row(mysqli_query($this->con, "select count(1) as c from messages where receiver='$username' and sender!='system' and hasread=0"));
        $replies = ApiNew_Database::row(mysqli_query($this->con, "select count(1) as c from messages where receiver='$username' and sender='system' and text in ('reply','replylzl','replylzlreply','quote') and hasread=0"));
        $mentions = ApiNew_Database::row(mysqli_query($this->con, "select count(1) as c from messages where receiver='$username' and sender='system' and text='at' and hasread=0"));
        $repliesCount = $replies ? intval($replies['c']) : 0;
        $mentionsCount = $mentions ? intval($mentions['c']) : 0;
        $directCount = $direct ? intval($direct['c']) : 0;
        $systemCount = $system ? intval($system['c']) : 0;
        return array(
            'total' => $systemCount + $directCount,
            'replies' => $repliesCount,
            'mentions' => $mentionsCount,
            'likes' => 0,
            'direct' => $directCount,
        );
    }
}

