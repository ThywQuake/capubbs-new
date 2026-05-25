<?php

class ApiNew_PostRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function mainPost($bid, $tid) {
        $bid = intval($bid);
        $tid = intval($tid);
        $sql = "select bid, tid, pid, fid, title, author, text, ishtml, attachs, replytime, updatetime, sig, type, ip, lzl, like_count, favorite_count
            from posts where bid=$bid and tid=$tid and pid=1 limit 1";
        return ApiNew_Database::row(mysqli_query($this->con, $sql));
    }

    public function floors($bid, $tid, $options) {
        $bid = intval($bid);
        $tid = intval($tid);
        $pageSize = isset($options['pageSize']) ? intval($options['pageSize']) : 50;
        $pageSize = max(1, min(50, $pageSize));
        $cursor = isset($options['cursor']) ? intval($options['cursor']) : 0;
        $author = isset($options['author']) ? trim($options['author']) : '';

        $where = array("bid=$bid", "tid=$tid", "pid>1");
        if ($cursor > 0) {
            $where[] = "pid>$cursor";
        }
        if ($author !== '') {
            $safeAuthor = ApiNew_Database::escape($this->con, $author);
            $where[] = "author='$safeAuthor'";
        }

        $limit = $pageSize + 1;
        $sql = "select bid, tid, pid, fid, title, author, text, ishtml, attachs, replytime, updatetime, sig, type, ip, lzl, like_count, favorite_count
            from posts where " . implode(' and ', $where) . " order by pid asc limit $limit";
        $rows = ApiNew_Database::rows(mysqli_query($this->con, $sql));
        $hasMore = count($rows) > $pageSize;
        if ($hasMore) {
            array_pop($rows);
        }
        $nextCursor = count($rows) > 0 ? strval($rows[count($rows) - 1]['pid']) : null;
        return array(
            'items' => $rows,
            'hasMore' => $hasMore,
            'nextCursor' => $hasMore ? $nextCursor : null,
            'pageSize' => $pageSize,
        );
    }

    public function nestedRepliesForFids($fids, $limitPerFloor) {
        $result = array();
        $ids = $this->normalizeIds($fids);
        if (count($ids) === 0) {
            return $result;
        }
        $limitPerFloor = max(1, min(10, intval($limitPerFloor)));
        foreach ($ids as $fid) {
            $result[$fid] = array();
        }
        $rows = ApiNew_Database::rows(mysqli_query($this->con, "select id, fid, author, text, time from lzl where fid in (" . implode(',', $ids) . ") and visible=1 order by fid asc, id desc"));
        $counts = array();
        foreach ($rows as $row) {
            $fid = intval($row['fid']);
            if (!isset($counts[$fid])) {
                $counts[$fid] = 0;
            }
            if ($counts[$fid] >= $limitPerFloor) {
                continue;
            }
            $result[$fid][] = ApiNew_ThreadPresenter::nestedReply($row);
            $counts[$fid]++;
        }
        foreach ($result as $fid => $rowsForFloor) {
            $result[$fid] = array_reverse($rowsForFloor);
        }
        return $result;
    }

    public function attachmentsForFloors($floors) {
        $byFid = array();
        $attachmentIds = array();
        foreach ($floors as $floor) {
            $fid = intval($floor['fid']);
            $byFid[$fid] = array();
            $attachs = isset($floor['attachs']) ? trim($floor['attachs']) : '';
            if ($attachs === '') {
                continue;
            }
            foreach (preg_split('/\s+/', $attachs) as $id) {
                $id = intval($id);
                if ($id > 0) {
                    $byFid[$fid][] = $id;
                    $attachmentIds[$id] = true;
                }
            }
        }
        if (count($attachmentIds) === 0) {
            return array();
        }
        $ids = implode(',', array_keys($attachmentIds));
        $rows = ApiNew_Database::rows(mysqli_query($this->con, "select id, name, path, size, price, auth from attachments where id in ($ids)"));
        $byId = array();
        foreach ($rows as $row) {
            $byId[intval($row['id'])] = ApiNew_ThreadPresenter::attachment($row);
        }
        $result = array();
        foreach ($byFid as $fid => $idsForFloor) {
            $result[$fid] = array();
            foreach ($idsForFloor as $id) {
                if (isset($byId[$id])) {
                    $result[$fid][] = $byId[$id];
                }
            }
        }
        return $result;
    }

    private function normalizeIds($ids) {
        $result = array();
        foreach ($ids as $id) {
            $id = intval($id);
            if ($id > 0) {
                $result[$id] = $id;
            }
        }
        return array_values($result);
    }
}
