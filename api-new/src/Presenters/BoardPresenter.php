<?php

class ApiNew_BoardPresenter {
    public static function summary($board) {
        return array(
            'bid' => intval($board['bid']),
            'name' => isset($board['name']) ? $board['name'] : '',
            'title' => isset($board['bbstitle']) ? $board['bbstitle'] : '',
            'hidden' => isset($board['hide']) ? intval($board['hide']) === 1 : false,
            'moderators' => array_values(array_filter(array(
                isset($board['m1']) ? $board['m1'] : '',
                isset($board['m2']) ? $board['m2'] : '',
                isset($board['m3']) ? $board['m3'] : '',
                isset($board['m4']) ? $board['m4'] : '',
            ))),
            'requiredStar' => isset($board['need']) ? intval($board['need']) : 0,
            'stats' => array(
                'topics' => isset($board['topics']) ? intval($board['topics']) : 0,
                'todayTopics' => isset($board['today_topics']) ? intval($board['today_topics']) : 0,
                'todayReplies' => isset($board['today_replies']) ? intval($board['today_replies']) : 0,
            ),
        );
    }
}

