<?php

class ApiNew_CalendarRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function upcoming($limit) {
        $limit = max(1, min(30, intval($limit)));
        $year = intval(date('Y'));
        $month = intval(date('m'));
        $day = intval(date('d'));
        $sql = "select year, month, day, time, title, content from calendar
            where cast(year as unsigned)>$year
                or (cast(year as unsigned)=$year and cast(month as unsigned)>$month)
                or (cast(year as unsigned)=$year and cast(month as unsigned)=$month and cast(day as unsigned)>=$day)
            order by cast(year as unsigned), cast(month as unsigned), cast(day as unsigned), time
            limit $limit";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }
}

