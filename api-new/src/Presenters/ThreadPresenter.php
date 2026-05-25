<?php

class ApiNew_ThreadPresenter {
    public static function threadItem($thread) {
        return array(
            'id' => intval($thread['bid']) . '-' . intval($thread['tid']),
            'bid' => intval($thread['bid']),
            'tid' => intval($thread['tid']),
            'title' => isset($thread['title']) ? $thread['title'] : '',
            'author' => isset($thread['author']) ? $thread['author'] : '',
            'replyer' => isset($thread['replyer']) ? $thread['replyer'] : '',
            'views' => isset($thread['click']) ? intval($thread['click']) : 0,
            'likes' => isset($thread['like_count']) ? intval($thread['like_count']) : 0,
            'favorites' => isset($thread['favorite_count']) ? intval($thread['favorite_count']) : 0,
            'replies' => isset($thread['reply']) ? intval($thread['reply']) : 0,
            'digest' => isset($thread['extr']) ? intval($thread['extr']) === 1 : false,
            'pinned' => isset($thread['top']) ? intval($thread['top']) === 1 : false,
            'locked' => isset($thread['locked']) ? intval($thread['locked']) === 1 : false,
            'globalPinned' => isset($thread['global_top']) ? intval($thread['global_top']) === 1 : false,
            'isActivity' => isset($thread['activity_id']) && intval($thread['activity_id']) > 0,
            'activityId' => isset($thread['activity_id']) ? intval($thread['activity_id']) : null,
            'updatedAt' => isset($thread['timestamp']) ? self::timestamp($thread['timestamp']) : null,
            'postDate' => isset($thread['postdate']) ? $thread['postdate'] : '',
            'board' => array(
                'bid' => isset($thread['bid']) ? intval($thread['bid']) : 0,
                'name' => isset($thread['board_name']) ? $thread['board_name'] : '',
                'title' => isset($thread['board_title']) ? $thread['board_title'] : '',
            ),
        );
    }

    public static function floor($floor, $nestedReplies, $attachments) {
        $fid = isset($floor['fid']) ? intval($floor['fid']) : 0;
        return array(
            'bid' => intval($floor['bid']),
            'tid' => intval($floor['tid']),
            'pid' => intval($floor['pid']),
            'fid' => $fid,
            'title' => isset($floor['title']) ? $floor['title'] : '',
            'author' => isset($floor['author']) ? $floor['author'] : '',
            'contentHtml' => isset($floor['text']) ? $floor['text'] : '',
            'isHtml' => isset($floor['ishtml']) ? $floor['ishtml'] : '',
            'createdAt' => isset($floor['replytime']) ? self::timestamp($floor['replytime']) : null,
            'updatedAt' => isset($floor['updatetime']) ? self::timestamp($floor['updatetime']) : null,
            'signatureEnabled' => isset($floor['sig']) ? intval($floor['sig']) === 1 : false,
            'likes' => isset($floor['like_count']) ? intval($floor['like_count']) : 0,
            'favorites' => isset($floor['favorite_count']) ? intval($floor['favorite_count']) : 0,
            'nestedReplyCount' => isset($floor['lzl']) ? intval($floor['lzl']) : 0,
            'nestedReplies' => isset($nestedReplies[$fid]) ? $nestedReplies[$fid] : array(),
            'attachments' => isset($attachments[$fid]) ? $attachments[$fid] : array(),
        );
    }

    public static function nestedReply($reply) {
        return array(
            'id' => intval($reply['id']),
            'fid' => intval($reply['fid']),
            'author' => isset($reply['author']) ? $reply['author'] : '',
            'content' => isset($reply['text']) ? $reply['text'] : '',
            'createdAt' => isset($reply['time']) ? self::timestamp($reply['time']) : null,
        );
    }

    public static function attachment($attachment) {
        return array(
            'id' => intval($attachment['id']),
            'name' => isset($attachment['name']) ? $attachment['name'] : '',
            'path' => isset($attachment['path']) ? $attachment['path'] : '',
            'size' => isset($attachment['size']) ? intval($attachment['size']) : 0,
            'price' => isset($attachment['price']) ? intval($attachment['price']) : 0,
            'auth' => isset($attachment['auth']) ? intval($attachment['auth']) : 0,
        );
    }

    public static function timestamp($value) {
        $number = intval($value);
        if ($number <= 0) {
            return null;
        }
        date_default_timezone_set('Asia/Shanghai');
        return date('c', $number);
    }
}

