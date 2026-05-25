<?php

class ApiNew_BootstrapController {
    private $boards;
    private $threads;
    private $messages;
    private $calendar;
    private $session;

    public function __construct($boards, $threads, $messages, $calendar, $session) {
        $this->boards = $boards;
        $this->threads = $threads;
        $this->messages = $messages;
        $this->calendar = $calendar;
        $this->session = $session;
    }

    public function show($request, $params, $meta) {
        $user = $this->session->user();
        $viewer = ApiNew_UserPresenter::viewer($user);
        $username = $user ? $user['username'] : '';

        $boards = array();
        foreach ($this->boards->all() as $board) {
            $boards[] = ApiNew_BoardPresenter::summary($board);
        }

        $hotThreads = array_map(array('ApiNew_ThreadPresenter', 'threadItem'), $this->threads->hot(10));
        $latestTopics = array_map(array('ApiNew_ThreadPresenter', 'threadItem'), $this->threads->latestTopics(10));
        $globalPinned = array_map(array('ApiNew_ThreadPresenter', 'threadItem'), $this->threads->globalPinned(10));

        $activityBanners = array();
        foreach ($this->threads->activityBanners(6) as $activity) {
            $activityBanners[] = array(
                'activityId' => intval($activity['activity_id']),
                'bid' => intval($activity['bid']),
                'tid' => intval($activity['tid']),
                'title' => isset($activity['title']) ? $activity['title'] : $activity['name'],
                'leader' => $activity['leader_username'],
                'coverImage' => isset($activity['cover_image']) ? $activity['cover_image'] : null,
                'opensAt' => isset($activity['opens_at']) ? $activity['opens_at'] : null,
                'closesAt' => isset($activity['closes_at']) ? $activity['closes_at'] : null,
                'isOpen' => isset($activity['is_open']) ? intval($activity['is_open']) === 1 : true,
                'board' => array(
                    'bid' => intval($activity['bid']),
                    'name' => isset($activity['board_name']) ? $activity['board_name'] : '',
                    'title' => isset($activity['board_title']) ? $activity['board_title'] : '',
                ),
            );
        }

        $calendarEvents = array();
        foreach ($this->calendar->upcoming(12) as $event) {
            $calendarEvents[] = array(
                'year' => intval($event['year']),
                'month' => intval($event['month']),
                'day' => intval($event['day']),
                'time' => $event['time'],
                'title' => $event['title'],
                'content' => $event['content'],
            );
        }

        $data = array(
            'viewer' => $viewer,
            'boards' => $boards,
            'home' => array(
                'hotThreads' => $hotThreads,
                'latestTopics' => $latestTopics,
                'latestReplies' => array(),
                'activityBanners' => $activityBanners,
                'globalPinnedThreads' => $globalPinned,
                'calendarEvents' => $calendarEvents,
            ),
            'unread' => $this->messages->unreadSummary($username),
        );

        $meta['cache'] = array('hit' => false, 'ttl' => 0);
        return ApiNew_Response::ok($data, $meta);
    }
}

