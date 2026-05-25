<?php

class ApiNew_ThreadController {
    private $threads;
    private $posts;
    private $activities;
    private $session;
    private $con;

    public function __construct($con, $threads, $posts, $activities, $session) {
        $this->con = $con;
        $this->threads = $threads;
        $this->posts = $posts;
        $this->activities = $activities;
        $this->session = $session;
    }

    public function show($request, $params, $meta) {
        $bid = intval($params['bid']);
        $tid = intval($params['tid']);
        $thread = $this->threads->find($bid, $tid);
        if (!$thread) {
            return ApiNew_Response::notFound('Thread not found', $meta);
        }
        $mainPost = $this->posts->mainPost($bid, $tid);
        if (!$mainPost) {
            return ApiNew_Response::notFound('Main post not found', $meta);
        }

        $nested = $this->posts->nestedRepliesForFids(array($mainPost['fid']), 3);
        $attachments = $this->posts->attachmentsForFloors(array($mainPost));
        $activity = $this->activities->findByThread($bid, $tid);
        $viewer = $this->session->user();
        $rights = $this->viewerRights($bid);

        return ApiNew_Response::ok(array(
            'thread' => ApiNew_ThreadPresenter::threadItem($thread),
            'mainPost' => ApiNew_ThreadPresenter::floor($mainPost, $nested, $attachments),
            'activity' => $activity,
            'viewerState' => array(
                'canReply' => $viewer !== null && intval($thread['locked']) !== 1 && !$activity,
                'canEdit' => $viewer !== null && ($viewer['username'] === $mainPost['author'] || $rights[0] > 0),
                'canModerate' => $rights[0] > 0,
                'liked' => false,
                'bookmarked' => false,
            ),
        ), $meta);
    }

    public function floors($request, $params, $meta) {
        $bid = intval($params['bid']);
        $tid = intval($params['tid']);
        if (!$this->threads->find($bid, $tid)) {
            return ApiNew_Response::notFound('Thread not found', $meta);
        }

        $pageSize = ApiNew_Validation::intParam($request->input('pageSize', 50), 50, 1, 50);
        $cursor = ApiNew_Validation::intParam($request->input('cursor', 0), 0, 0, 1000000000);
        $author = ApiNew_Validation::stringParam($request->input('author', ''), '', 30);
        $result = $this->posts->floors($bid, $tid, array(
            'pageSize' => $pageSize,
            'cursor' => $cursor,
            'author' => $author,
        ));
        $fids = array();
        foreach ($result['items'] as $floor) {
            $fids[] = intval($floor['fid']);
        }
        $nested = $this->posts->nestedRepliesForFids($fids, 3);
        $attachments = $this->posts->attachmentsForFloors($result['items']);
        $items = array();
        foreach ($result['items'] as $floor) {
            $items[] = ApiNew_ThreadPresenter::floor($floor, $nested, $attachments);
        }

        return ApiNew_Response::ok(array(
            'items' => $items,
            'nextCursor' => $result['nextCursor'],
            'hasMore' => $result['hasMore'],
            'pageSize' => $result['pageSize'],
        ), $meta);
    }

    public function create($request, $params, $meta) {
        $body = $this->writePayload($request);
        $bid = intval($body['bid']);
        if ($bid <= 0) {
            return ApiNew_Response::badRequest('Missing board id', $meta);
        }

        $viewer = $this->session->user();
        if (!$viewer) {
            return ApiNew_Response::unauthorized('超时，请重新登录。', $meta);
        }
        $board = $this->board($bid);
        if (!$board) {
            return ApiNew_Response::notFound('Board not found', $meta);
        }
        if (!$this->canWriteBoard($viewer, $board)) {
            return ApiNew_Response::badRequest('在本版发帖或回复至少需要 ' . intval($board['need']) . ' 星', $meta);
        }
        $delay = $this->delayError($viewer);
        if ($delay !== null) {
            return ApiNew_Response::badRequest($delay, $meta);
        }
        if ($body['title'] === '') {
            return ApiNew_Response::badRequest('Missing title', $meta);
        }
        if (trim($body['text']) === '') {
            return ApiNew_Response::badRequest('Missing content', $meta);
        }

        $time = time();
        $title = $this->truncateText(html_entity_decode($body['title']), 43, 40);
        $text = html_entity_decode($body['text']);
        $safeTitle = ApiNew_Database::escape($this->con, $title);
        $safeText = ApiNew_Database::escape($this->con, $text);
        $safeType = ApiNew_Database::escape($this->con, $body['type']);
        $safeAttachs = ApiNew_Database::escape($this->con, $body['attachs']);
        $safeUser = ApiNew_Database::escape($this->con, $viewer['username']);
        $safeIp = ApiNew_Database::escape($this->con, $request->ip);
        $sig = intval($body['sig']);
        $postDate = date('Y-m-d');

        $lockName = 'thread-create:' . $bid;
        if (!$this->acquireLock($lockName, 3)) {
            return ApiNew_Response::serverError('Could not allocate thread id', $meta);
        }
        $tid = $this->nextThreadId($bid);
        $threadOk = mysqli_query($this->con, "insert into threads (bid,tid,title,author,replyer,click,like_count,favorite_count,reply,guesture,extr,top,locked,timestamp,postdate)
            values ($bid,$tid,'$safeTitle','$safeUser',null,0,0,0,0,1,0,0,0,$time,'$postDate')");
        $threadError = mysqli_error($this->con);
        $postOk = false;
        $postError = '';
        if ($threadOk) {
            $postOk = mysqli_query($this->con, "insert into posts (bid,tid,pid,title,author,text,ishtml,attachs,replytime,updatetime,sig,ip,type,lzl,like_count,favorite_count)
                values ($bid,$tid,1,'$safeTitle','$safeUser','$safeText','YES','$safeAttachs',$time,$time,$sig,'$safeIp','$safeType',0,0,0)");
            $postError = mysqli_error($this->con);
        }
        $this->releaseLock($lockName);

        if (!$threadOk) {
            return ApiNew_Response::serverError($threadError, $meta);
        }
        if (!$postOk) {
            mysqli_query($this->con, "delete from threads where bid=$bid and tid=$tid");
            return ApiNew_Response::serverError($postError, $meta);
        }

        $this->afterWriteUserUpdate($viewer['username'], $bid, 'post', $time);
        $this->attachReferences($body['attachs']);

        return $this->writeResponse(array('bid' => $bid, 'tid' => $tid, 'pid' => 1), $meta, true);
    }

    public function reply($request, $params, $meta) {
        $body = $this->writePayload($request);
        $bid = intval($params['bid']);
        $tid = intval($params['tid']);
        $viewer = $this->session->user();
        if (!$viewer) {
            return ApiNew_Response::unauthorized('超时，请重新登录。', $meta);
        }
        $thread = $this->threads->find($bid, $tid);
        if (!$thread) {
            return ApiNew_Response::notFound('Thread not found', $meta);
        }
        $board = $this->board($bid);
        if (!$board) {
            return ApiNew_Response::notFound('Board not found', $meta);
        }
        if (!$this->canWriteBoard($viewer, $board)) {
            return ApiNew_Response::badRequest('在本版发帖或回复至少需要 ' . intval($board['need']) . ' 星', $meta);
        }
        if (intval($thread['locked']) === 1) {
            return ApiNew_Response::badRequest('主题已锁定。', $meta);
        }
        if ($this->activities->findByThread($bid, $tid)) {
            return ApiNew_Response::badRequest('禁止直接回复报名帖！', $meta);
        }
        $delay = $this->delayError($viewer);
        if ($delay !== null) {
            return ApiNew_Response::badRequest($delay, $meta);
        }
        if (trim($body['text']) === '') {
            return ApiNew_Response::badRequest('Missing content', $meta);
        }

        $time = time();
        $title = html_entity_decode($body['title']);
        $text = html_entity_decode($body['text']);
        $safeTitle = ApiNew_Database::escape($this->con, $title);
        $safeText = ApiNew_Database::escape($this->con, $text);
        $safeType = ApiNew_Database::escape($this->con, $body['type']);
        $safeAttachs = ApiNew_Database::escape($this->con, $body['attachs']);
        $safeUser = ApiNew_Database::escape($this->con, $viewer['username']);
        $safeIp = ApiNew_Database::escape($this->con, $request->ip);
        $sig = intval($body['sig']);

        $lockName = 'thread-reply:' . $bid . ':' . $tid;
        if (!$this->acquireLock($lockName, 3)) {
            return ApiNew_Response::serverError('Could not allocate reply id', $meta);
        }
        $pid = $this->nextPostId($bid, $tid);
        $postOk = mysqli_query($this->con, "insert into posts (bid,tid,pid,title,author,text,ishtml,attachs,replytime,updatetime,sig,ip,type,lzl,like_count,favorite_count)
            values ($bid,$tid,$pid,'$safeTitle','$safeUser','$safeText','YES','$safeAttachs',$time,$time,$sig,'$safeIp','$safeType',0,0,0)");
        $postError = mysqli_error($this->con);
        if ($postOk) {
            mysqli_query($this->con, "update threads set reply=reply+1, replyer='$safeUser', timestamp=$time where bid=$bid and tid=$tid");
        }
        $this->releaseLock($lockName);
        if (!$postOk) {
            return ApiNew_Response::serverError($postError, $meta);
        }

        $this->afterWriteUserUpdate($viewer['username'], $bid, 'reply', $time);
        $this->attachReferences($body['attachs']);
        if (isset($thread['author']) && $thread['author'] !== $viewer['username']) {
            $this->insertMessage('system', $thread['author'], 'reply', $bid, $tid, $pid, $viewer['username'], $thread['title']);
        }

        return $this->writeResponse(array('bid' => $bid, 'tid' => $tid, 'pid' => $pid), $meta, true);
    }

    public function editFloor($request, $params, $meta) {
        $body = $this->writePayload($request);
        $bid = intval($params['bid']);
        $tid = intval($params['tid']);
        $pid = intval($params['pid']);
        $viewer = $this->session->user();
        if (!$viewer) {
            return ApiNew_Response::unauthorized('超时，请重新登录。', $meta);
        }
        $thread = $this->threads->find($bid, $tid);
        if (!$thread) {
            return ApiNew_Response::notFound('Thread not found', $meta);
        }
        if (intval($thread['locked']) === 1) {
            return ApiNew_Response::badRequest('主题已锁定。', $meta);
        }
        $floor = $this->floor($bid, $tid, $pid);
        if (!$floor) {
            return ApiNew_Response::notFound('Floor not found', $meta);
        }
        $rights = $this->viewerRights($bid);
        if ($rights[0] === 0 && $viewer['username'] !== $floor['author']) {
            return ApiNew_Response::badRequest('权限不足！', $meta);
        }
        $activity = $this->activities->findByThread($bid, $tid);
        if ($activity && ($activity['leader_username'] !== $viewer['username'] || $pid !== 1)) {
            return ApiNew_Response::badRequest('禁止编辑报名帖！', $meta);
        }

        $time = time();
        $title = html_entity_decode($body['title']);
        $text = html_entity_decode($body['text']);
        $safeTitle = ApiNew_Database::escape($this->con, $title);
        $safeText = ApiNew_Database::escape($this->con, $text);
        $safeType = ApiNew_Database::escape($this->con, $body['type']);
        $safeAttachs = ApiNew_Database::escape($this->con, $body['attachs']);
        $safeUser = ApiNew_Database::escape($this->con, $viewer['username']);
        $safeIp = ApiNew_Database::escape($this->con, $request->ip);
        $sig = intval($body['sig']);

        $sql = "update posts set title='$safeTitle', author='$safeUser', text='$safeText', ishtml='YES', sig=$sig, ip='$safeIp', type='$safeType', attachs='$safeAttachs', updatetime=$time where bid=$bid and tid=$tid and pid=$pid";
        if (!mysqli_query($this->con, $sql)) {
            return ApiNew_Response::serverError(mysqli_error($this->con), $meta);
        }
        if ($pid === 1) {
            mysqli_query($this->con, "update threads set title='$safeTitle', author='$safeUser' where bid=$bid and tid=$tid");
        }

        $this->attachReferences($body['attachs']);
        return $this->writeResponse(array('bid' => $bid, 'tid' => $tid, 'pid' => $pid), $meta, false);
    }

    private function writePayload($request) {
        $content = $request->input('content', '');
        if (is_array($content)) {
            if (isset($content['html'])) {
                $content = $content['html'];
            } elseif (isset($content['content'])) {
                $content = $content['content'];
            } else {
                $content = '';
            }
        }
        $attachments = $request->input('attachments', array());
        $attachIds = array();
        if (is_array($attachments)) {
            foreach ($attachments as $attachment) {
                if (is_array($attachment) && isset($attachment['id'])) {
                    $attachIds[] = intval($attachment['id']);
                } else {
                    $attachIds[] = intval($attachment);
                }
            }
        }
        return array(
            'bid' => intval($request->input('bid', 0)),
            'title' => ApiNew_Validation::stringParam($request->input('title', ''), '', 120),
            'text' => strval($content),
            'type' => ApiNew_Validation::stringParam($request->input('contentMode', 'web'), 'web', 20),
            'sig' => ApiNew_Validation::boolParam($request->input('signatureEnabled', false), false) ? 1 : 0,
            'attachs' => trim(implode(' ', array_filter($attachIds))),
        );
    }

    private function writeResponse($data, $meta, $created) {
        $data = array(
            'bid' => isset($data['bid']) ? intval($data['bid']) : null,
            'tid' => isset($data['tid']) ? intval($data['tid']) : null,
            'pid' => isset($data['pid']) ? intval($data['pid']) : null,
        );
        $data['url'] = $data['bid'] && $data['tid'] ? '/bbs-new/threads/' . $data['bid'] . '-' . $data['tid'] : null;
        return $created ? ApiNew_Response::created($data, $meta) : ApiNew_Response::ok($data, $meta);
    }

    private function viewerRights($bid) {
        $viewer = $this->session->user();
        if (!$viewer) {
            return array(-1, '', '', 0);
        }
        $rights = isset($viewer['rights']) ? intval($viewer['rights']) : 0;
        if ($rights >= 3) {
            return array(2, $viewer['username'], isset($viewer['lastip']) ? $viewer['lastip'] : '', $rights);
        }

        $board = $this->board($bid);
        $able = 0;
        if ($board) {
            for ($i = 1; $i <= 4; $i++) {
                $key = 'm' . $i;
                if (isset($board[$key]) && $board[$key] === $viewer['username']) {
                    $able = 1;
                }
            }
        }
        return array($able, $viewer['username'], isset($viewer['lastip']) ? $viewer['lastip'] : '', $rights);
    }

    private function board($bid) {
        $bid = intval($bid);
        return ApiNew_Database::row(mysqli_query($this->con, "select bid, name, bbstitle, hide, m1, m2, m3, m4, need from boardinfo where bid=$bid limit 1"));
    }

    private function floor($bid, $tid, $pid) {
        $bid = intval($bid);
        $tid = intval($tid);
        $pid = intval($pid);
        return ApiNew_Database::row(mysqli_query($this->con, "select bid, tid, pid, fid, author, title, attachs from posts where bid=$bid and tid=$tid and pid=$pid limit 1"));
    }

    private function canWriteBoard($viewer, $board) {
        if (!$viewer) {
            return false;
        }
        $rights = isset($viewer['rights']) ? intval($viewer['rights']) : 0;
        $star = isset($viewer['star']) ? intval($viewer['star']) : 0;
        $need = isset($board['need']) ? intval($board['need']) : 0;
        return $rights > 1 || $star >= $need;
    }

    private function delayError($viewer) {
        $lastPost = isset($viewer['lastpost']) ? intval($viewer['lastpost']) : 0;
        $rights = isset($viewer['rights']) ? intval($viewer['rights']) : 0;
        $star = isset($viewer['star']) ? intval($viewer['star']) : 0;
        $delta = ($rights >= 1 || $star >= 3) ? 15 : 15;
        if (time() - $lastPost >= 0 && time() - $lastPost <= $delta) {
            return '两次发表/回复的时间间隔不能少于15秒！';
        }
        return null;
    }

    private function nextThreadId($bid) {
        $bid = intval($bid);
        $row = ApiNew_Database::row(mysqli_query($this->con, "select max(tid) as max_tid from threads where bid=$bid"));
        return $row ? intval($row['max_tid']) + 1 : 1;
    }

    private function nextPostId($bid, $tid) {
        $bid = intval($bid);
        $tid = intval($tid);
        $row = ApiNew_Database::row(mysqli_query($this->con, "select max(pid) as max_pid from posts where bid=$bid and tid=$tid"));
        return $row ? intval($row['max_pid']) + 1 : 1;
    }

    private function acquireLock($name, $timeout) {
        $name = ApiNew_Database::escape($this->con, 'api-new:' . $name);
        $timeout = intval($timeout);
        $row = ApiNew_Database::row(mysqli_query($this->con, "select get_lock('$name', $timeout) as acquired"));
        return $row && intval($row['acquired']) === 1;
    }

    private function releaseLock($name) {
        $name = ApiNew_Database::escape($this->con, 'api-new:' . $name);
        mysqli_query($this->con, "select release_lock('$name')");
    }

    private function afterWriteUserUpdate($username, $bid, $type, $time) {
        $safeUser = ApiNew_Database::escape($this->con, $username);
        if (intval($bid) === 4) {
            mysqli_query($this->con, "update userinfo set water=water+1, lastpost=$time, tokentime=$time where username='$safeUser'");
        } elseif ($type === 'post') {
            mysqli_query($this->con, "update userinfo set post=post+1, lastpost=$time, tokentime=$time where username='$safeUser'");
        } else {
            mysqli_query($this->con, "update userinfo set reply=reply+1, lastpost=$time, tokentime=$time where username='$safeUser'");
        }
        $this->updateStar($username);
    }

    private function updateStar($username) {
        $safeUser = ApiNew_Database::escape($this->con, $username);
        $row = ApiNew_Database::row(mysqli_query($this->con, "select post, reply, other2 from userinfo where username='$safeUser' limit 1"));
        if (!$row) {
            return;
        }
        $total = intval($row['post']) + intval($row['reply']);
        $star = 1;
        if ($total < 20) {
            $star = 1;
        } elseif ($total < 109) {
            $star = 2;
        } elseif ($total < 317) {
            $star = 3;
        } elseif ($total < 675) {
            $star = 4;
        } elseif ($total < 1278) {
            $star = 5;
        } elseif ($total < 2303) {
            $star = 6;
        } elseif ($total < 3550) {
            $star = 7;
        } elseif ($total < 4885) {
            $star = 8;
        } else {
            $star = 9;
        }
        $override = isset($row['other2']) ? intval($row['other2']) : 0;
        if ($override >= 1 && $override <= 9) {
            $star = $override;
        }
        mysqli_query($this->con, "update userinfo set star=$star where username='$safeUser'");
    }

    private function attachReferences($attachs) {
        $ids = $this->attachmentIds($attachs);
        if (count($ids) === 0) {
            return;
        }
        mysqli_query($this->con, "update attachments set ref=ref+1 where id in (" . implode(',', $ids) . ")");
    }

    private function attachmentIds($attachs) {
        $ids = array();
        foreach (preg_split('/\s+/', trim($attachs)) as $id) {
            $id = intval($id);
            if ($id > 0) {
                $ids[$id] = $id;
            }
        }
        return array_values($ids);
    }

    private function insertMessage($from, $to, $text, $bid, $tid, $pid, $ruser, $rmsg) {
        $bid = intval($bid);
        $tid = intval($tid);
        $pid = intval($pid);
        $from = ApiNew_Database::escape($this->con, $from);
        $to = ApiNew_Database::escape($this->con, $to);
        $text = ApiNew_Database::escape($this->con, $text);
        $ruser = ApiNew_Database::escape($this->con, $ruser);
        $rmsg = ApiNew_Database::escape($this->con, $rmsg);
        $time = time();
        mysqli_query($this->con, "insert into messages (sender,receiver,text,time,hasread,rbid,rtid,rpid,ruser,rmsg) values('$from','$to','$text',$time,0,$bid,$tid,$pid,'$ruser','$rmsg')");
        mysqli_query($this->con, "update userinfo set newmsg=newmsg+1 where username='$to' limit 1");
    }

    private function truncateText($text, $threshold, $max) {
        if (function_exists('mb_strlen') && mb_strlen($text, 'UTF-8') >= $threshold) {
            return mb_substr($text, 0, $max, 'UTF-8') . '...';
        }
        if (!function_exists('mb_strlen') && strlen($text) >= $threshold) {
            return substr($text, 0, $max) . '...';
        }
        return $text;
    }
}
