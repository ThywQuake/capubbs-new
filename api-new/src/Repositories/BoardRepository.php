<?php

class ApiNew_BoardRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function all() {
        $today = date('Y-m-d');
        $sql = "select b.bid, b.name, b.bbstitle, b.hide, b.m1, b.m2, b.m3, b.m4, b.need,
            (select count(1) from threads t where t.bid=b.bid) as topics,
            (select count(1) from threads t where t.bid=b.bid and t.postdate='$today') as today_topics,
            (select count(1) from posts p where p.bid=b.bid and p.replytime>=unix_timestamp(curdate()) and p.replytime<unix_timestamp(date_add(curdate(), interval 1 day))) as today_replies
            from boardinfo b
            where b.bid!=0
            order by b.bid";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }

    public function find($bid) {
        $bid = intval($bid);
        $today = date('Y-m-d');
        $sql = "select b.bid, b.name, b.bbstitle, b.hide, b.m1, b.m2, b.m3, b.m4, b.need,
            (select count(1) from threads t where t.bid=b.bid) as topics,
            (select count(1) from threads t where t.bid=b.bid and t.postdate='$today') as today_topics,
            (select count(1) from posts p where p.bid=b.bid and p.replytime>=unix_timestamp(curdate()) and p.replytime<unix_timestamp(date_add(curdate(), interval 1 day))) as today_replies
            from boardinfo b
            where b.bid=$bid
            limit 1";
        return ApiNew_Database::row(mysqli_query($this->con, $sql));
    }
}

