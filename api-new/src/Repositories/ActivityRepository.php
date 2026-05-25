<?php

class ApiNew_ActivityRepository {
    private $con;

    public function __construct($con) {
        $this->con = $con;
    }

    public function findByThread($bid, $tid) {
        $bid = intval($bid);
        $tid = intval($tid);
        $hasSettings = ApiNew_Database::tableExists($this->con, 'activity_settings');
        $coverSelect = $hasSettings ? "s.cover_image, s.opens_at, s.closes_at, s.is_open" : "null as cover_image, null as opens_at, null as closes_at, 1 as is_open";
        $settingsJoin = $hasSettings ? "left join activity_settings s on s.activity_id=a.activity_id" : "";
        $sql = "select a.activity_id, a.bid, a.tid, a.season_id, a.name, a.leader_username, $coverSelect
            from season_threads_activity a
            $settingsJoin
            where a.bid=$bid and a.tid=$tid
            limit 1";
        $activity = ApiNew_Database::row(mysqli_query($this->con, $sql));
        if (!$activity) {
            return null;
        }
        $activityId = intval($activity['activity_id']);
        $activity['questions'] = $this->questions($activityId);
        $activity['signupCount'] = $this->signupCount($activityId);
        return $activity;
    }

    private function questions($activityId) {
        $activityId = intval($activityId);
        $rows = ApiNew_Database::rows(mysqli_query($this->con, "select id, activity_id, type_id, option_name, required, hiden, comment from season_activity_option where activity_id=$activityId order by id"));
        if (count($rows) === 0) {
            return array();
        }
        $ids = array();
        foreach ($rows as $row) {
            $ids[] = intval($row['id']);
        }
        $casesByOption = array();
        $caseRows = ApiNew_Database::rows(mysqli_query($this->con, "select option_id, case_id, case_name, comment, need_value from season_option_case where option_id in (" . implode(',', $ids) . ") order by case_id"));
        foreach ($caseRows as $caseRow) {
            $optionId = intval($caseRow['option_id']);
            if (!isset($casesByOption[$optionId])) {
                $casesByOption[$optionId] = array();
            }
            $casesByOption[$optionId][] = array(
                'id' => intval($caseRow['case_id']),
                'name' => $caseRow['case_name'],
                'comment' => $caseRow['comment'],
                'needsValue' => intval($caseRow['need_value']) === 1,
            );
        }
        $questions = array();
        foreach ($rows as $row) {
            $id = intval($row['id']);
            $questions[] = array(
                'id' => $id,
                'typeId' => intval($row['type_id']),
                'label' => $row['option_name'],
                'required' => intval($row['required']) === 1,
                'hidden' => intval($row['hiden']) === 1,
                'comment' => $row['comment'],
                'options' => isset($casesByOption[$id]) ? $casesByOption[$id] : array(),
            );
        }
        return $questions;
    }

    private function signupCount($activityId) {
        $activityId = intval($activityId);
        $row = ApiNew_Database::row(mysqli_query($this->con, "select count(1) as c from season_activity_join where activity_id=$activityId and cancel=0"));
        return $row ? intval($row['c']) : 0;
    }
}
