<?php

class ApiNew_BoardController {
    private $boards;
    private $threads;

    public function __construct($boards, $threads) {
        $this->boards = $boards;
        $this->threads = $threads;
    }

    public function listThreads($request, $params, $meta) {
        $bid = intval($params['bid']);
        $board = $this->boards->find($bid);
        if (!$board) {
            return ApiNew_Response::notFound('Board not found', $meta);
        }

        $pageSize = ApiNew_Validation::intParam($request->input('pageSize', 30), 30, 1, 30);
        $sort = ApiNew_Validation::oneOf($request->input('sort', 'lastReply'), 'lastReply', array('lastReply', 'latest', 'popular'));
        $type = ApiNew_Validation::oneOf($request->input('type', 'all'), 'all', array('all', 'activity', 'digest'));
        $keyword = ApiNew_Validation::stringParam($request->input('keyword', ''), '', 40);
        $cursor = ApiNew_Validation::stringParam($request->input('cursor', ''), '', 300);

        $result = $this->threads->listByBoard($bid, array(
            'pageSize' => $pageSize,
            'sort' => $sort,
            'type' => $type,
            'keyword' => $keyword,
            'cursor' => $cursor,
        ));

        $items = array_map(array('ApiNew_ThreadPresenter', 'threadItem'), $result['items']);
        return ApiNew_Response::ok(array(
            'board' => ApiNew_BoardPresenter::summary($board),
            'items' => $items,
            'nextCursor' => $result['nextCursor'],
            'hasMore' => $result['hasMore'],
            'pageSize' => $result['pageSize'],
        ), $meta);
    }
}

