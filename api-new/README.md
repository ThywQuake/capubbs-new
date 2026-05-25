# CAPUBBS api-new

Independent JSON API for `bbs-new`.

This layer keeps the existing MySQL schema as the source of truth while exposing stable page-oriented JSON responses for the React frontend.

Fallback URL style is supported when rewrite rules are unavailable:

```text
/api-new/index.php/bootstrap
```

## Minimum landed surface

Read endpoints:

```text
GET /api-new/health
GET /api-new/bootstrap
GET /api-new/boards/:bid/threads
GET /api-new/threads/:bid/:tid
GET /api-new/threads/:bid/:tid/floors
GET /api-new/auth/me
```

Write endpoints:

```text
POST  /api-new/auth/login
POST  /api-new/auth/logout
POST  /api-new/threads
POST  /api-new/threads/:bid/:tid/replies
PATCH /api-new/threads/:bid/:tid/floors/:pid
POST  /api-new/uploads/editor-images
```

Auth accepts the existing `token` cookie and `Authorization: Bearer <token>`.
Login follows the legacy BBS password contract: the browser sends a 32-character MD5 hash as `passwordHash`/`password1`; `api-new` does not accept plaintext passwords.

The API keeps the old tables as the write target: `userinfo`, `boardinfo`, `threads`, `posts`, `lzl`, `attachments`, `messages`, `sign`, `calendar`, `thread_global_top`, and the `season_*` activity tables.

Current minimum version does not require new tables. Like relations, activity covers/settings, rate limits, and audit logs remain next-step additions described in `../api-new.md`.

`/uploads/editor-images` stores editor-inline images under `api-new/images`. It is separate from old attachment downloads and does not create rows in `attachments`.

Because current core forum tables are MyISAM and thread/post ids are board-local, the MVP protects create/reply id allocation with short MySQL named locks scoped to the board or thread. Later migrations should replace this with a dedicated id allocator or InnoDB transaction strategy.
