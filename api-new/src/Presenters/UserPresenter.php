<?php

class ApiNew_UserPresenter {
    public static function viewer($user) {
        if (!$user) {
            return null;
        }
        return array(
            'username' => $user['username'],
            'id' => isset($user['userid']) ? intval($user['userid']) : null,
            'rights' => isset($user['rights']) ? intval($user['rights']) : 0,
            'star' => isset($user['star']) ? intval($user['star']) : 0,
            'score' => isset($user['score']) ? intval($user['score']) : 0,
            'avatar' => isset($user['icon']) ? $user['icon'] : '',
            'intro' => isset($user['intro']) ? $user['intro'] : '',
            'registeredAt' => isset($user['regdate']) ? $user['regdate'] : '',
            'lastSeenAt' => isset($user['lastdate']) ? $user['lastdate'] : '',
            'unreadMessages' => isset($user['newmsg']) ? intval($user['newmsg']) : 0,
            'stats' => array(
                'posts' => isset($user['post']) ? intval($user['post']) : 0,
                'replies' => isset($user['reply']) ? intval($user['reply']) : 0,
                'water' => isset($user['water']) ? intval($user['water']) : 0,
                'checkins' => isset($user['sign']) ? intval($user['sign']) : 0,
            ),
        );
    }
}

