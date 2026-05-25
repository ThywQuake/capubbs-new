<?php

class ApiNew_ThreadRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function listByBoard($bid, $options) {
        $bid = intval($bid);
        $pageSize = isset($options['pageSize']) ? intval($options['pageSize']) : 30;
        $pageSize = max(1, min(30, $pageSize));
        $cursor = isset($options['cursor']) ? $options['cursor'] : '';
        $sort = isset($options['sort']) ? $options['sort'] : 'lastReply';
        $type = isset($options['type']) ? $options['type'] : 'all';
        $keyword = isset($options['keyword']) ? trim($options['keyword']) : '';

        $where = array("t.bid=$bid");
        if ($type === 'digest') {
            $where[] = "t.extr=1";
        } elseif ($type === 'activity') {
            $where[] = "a.activity_id is not null";
        }

        if ($keyword !== '') {
            $kw = ApiNew_Database::escape($this->con, $keyword);
            $where[] = "t.title like '%$kw%'";
        }

        if ($cursor !== '') {
            $decoded = $this->decodeCursor($cursor);
            if ($decoded) {
                $value = intval($decoded['value']);
                $tid = intval($decoded['tid']);
                if ($sort === 'latest') {
                    $where[] = "(unix_timestamp(t.postdate) < $value or (unix_timestamp(t.postdate) = $value and t.tid < $tid))";
                } else {
                    $where[] = "(t.timestamp < $value or (t.timestamp = $value and t.tid < $tid))";
                }
            }
        }

        $order = $sort === 'latest' ? "unix_timestamp(t.postdate) desc, t.tid desc" : "t.timestamp desc, t.tid desc";
        if ($sort === 'popular') {
            $order = "(coalesce(t.reply,0) * 3 + coalesce(t.click,0) + coalesce(t.like_count,0) * 5) desc, t.timestamp desc, t.tid desc";
        }

        $limit = $pageSize + 1;
        $sql = "select t.bid, t.tid, t.title, t.author, t.replyer, t.click, t.like_count, t.favorite_count,
            t.reply, t.extr, t.top, t.locked, t.timestamp, t.postdate,
            b.name as board_name, b.bbstitle as board_title,
            case when gt.bid is null then 0 else 1 end as global_top,
            a.activity_id
            from threads t
            left join boardinfo b on b.bid=t.bid
            left join thread_global_top gt on gt.bid=t.bid and gt.tid=t.tid
            left join season_threads_activity a on a.bid=t.bid and a.tid=t.tid
            where " . implode(' and ', $where) . "
            order by $order
            limit $limit";
        $rows = ApiNew_Database::rows(mysqli_query($this->con, $sql));
        $hasMore = count($rows) > $pageSize;
        if ($hasMore) {
            array_pop($rows);
        }
        return array(
            'items' => $rows,
            'hasMore' => $hasMore,
            'nextCursor' => $this->nextCursor($rows, $sort),
            'pageSize' => $pageSize,
        );
    }

    public function hot($limit) {
        $limit = max(1, min(20, intval($limit)));
        $sql = "select t.bid, t.tid, t.title, t.author, t.replyer, t.click, t.like_count, t.favorite_count,
            t.reply, t.extr, t.top, t.locked, t.timestamp, t.postdate,
            b.name as board_name, b.bbstitle as board_title,
            case when gt.bid is null then 0 else 1 end as global_top,
            a.activity_id
            from threads t
            left join boardinfo b on b.bid=t.bid
            left join thread_global_top gt on gt.bid=t.bid and gt.tid=t.tid
            left join season_threads_activity a on a.bid=t.bid and a.tid=t.tid
            where t.bid!=0
            order by (coalesce(t.reply,0) * 3 + coalesce(t.click,0) + coalesce(t.like_count,0) * 5) desc, t.timestamp desc
            limit $limit";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }

    public function latestTopics($limit) {
        $limit = max(1, min(20, intval($limit)));
        $sql = "select t.bid, t.tid, t.title, t.author, t.replyer, t.click, t.like_count, t.favorite_count,
            t.reply, t.extr, t.top, t.locked, t.timestamp, t.postdate,
            b.name as board_name, b.bbstitle as board_title,
            case when gt.bid is null then 0 else 1 end as global_top,
            a.activity_id
            from threads t
            left join boardinfo b on b.bid=t.bid
            left join thread_global_top gt on gt.bid=t.bid and gt.tid=t.tid
            left join season_threads_activity a on a.bid=t.bid and a.tid=t.tid
            where t.bid!=0
            order by unix_timestamp(t.postdate) desc, t.tid desc
            limit $limit";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }

    public function globalPinned($limit) {
        $limit = max(1, min(20, intval($limit)));
        $sql = "select t.bid, t.tid, t.title, t.author, t.replyer, t.click, t.like_count, t.favorite_count,
            t.reply, t.extr, t.top, t.locked, t.timestamp, t.postdate,
            b.name as board_name, b.bbstitle as board_title,
            1 as global_top,
            a.activity_id
            from thread_global_top gt
            inner join threads t on t.bid=gt.bid and t.tid=gt.tid
            left join boardinfo b on b.bid=t.bid
            left join season_threads_activity a on a.bid=t.bid and a.tid=t.tid
            order by t.timestamp desc
            limit $limit";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }

    public function activityBanners($limit) {
        $limit = max(1, min(10, intval($limit)));
        $hasSettings = ApiNew_Database::tableExists($this->con, 'activity_settings');
        $coverSelect = $hasSettings ? "s.cover_image, s.opens_at, s.closes_at, s.is_open" : "null as cover_image, null as opens_at, null as closes_at, 1 as is_open";
        $settingsJoin = $hasSettings ? "left join activity_settings s on s.activity_id=a.activity_id" : "";
        $sql = "select a.activity_id, a.bid, a.tid, a.name, a.leader_username,
            t.title, t.timestamp, $coverSelect,
            b.name as board_name, b.bbstitle as board_title
            from season_threads_activity a
            inner join threads t on t.bid=a.bid and t.tid=a.tid
            left join boardinfo b on b.bid=a.bid
            $settingsJoin
            order by t.timestamp desc
            limit $limit";
        return ApiNew_Database::rows(mysqli_query($this->con, $sql));
    }

    public function find($bid, $tid) {
        $bid = intval($bid);
        $tid = intval($tid);
        $sql = "select t.bid, t.tid, t.title, t.author, t.replyer, t.click, t.like_count, t.favorite_count,
            t.reply, t.extr, t.top, t.locked, t.timestamp, t.postdate,
            b.name as board_name, b.bbstitle as board_title,
            case when gt.bid is null then 0 else 1 end as global_top,
            a.activity_id
            from threads t
            left join boardinfo b on b.bid=t.bid
            left join thread_global_top gt on gt.bid=t.bid and gt.tid=t.tid
            left join season_threads_activity a on a.bid=t.bid and a.tid=t.tid
            where t.bid=$bid and t.tid=$tid
            limit 1";
        return ApiNew_Database::row(mysqli_query($this->con, $sql));
    }

    private function nextCursor($rows, $sort) {
        if (count($rows) === 0) {
            return null;
        }
        $last = $rows[count($rows) - 1];
        $value = $sort === 'latest' ? strtotime($last['postdate']) : intval($last['timestamp']);
        return base64_encode(json_encode(array('value' => $value, 'tid' => intval($last['tid']))));
    }

    private function decodeCursor($cursor) {
        $decoded = json_decode(base64_decode($cursor), true);
        if (!is_array($decoded) || !isset($decoded['value']) || !isset($decoded['tid'])) {
            return null;
        }
        return $decoded;
    }
}

