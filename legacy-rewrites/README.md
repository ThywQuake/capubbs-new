# 旧论坛服务器转发规则

这些规则用于在不修改 `bbs/` 源码的情况下，把旧论坛浏览型入口送进新版 SPA。规则需要放在站点根目录或虚拟主机配置中，且必须位于旧 PHP 文件处理之前。

## 原则

```text
浏览型入口 → /capubbs-new/?legacyPath=...
写入 / 上传 / 下载 / 导出 / 后台工具 / 静态资源 → 保持旧后端
```

`bbs-new/` 不提供 PHP 包装文件。服务器只负责把旧地址交给 SPA；具体归一化在 `bbs-new/app/src/utils/legacyRouteCompat.ts` 中完成。

## 需要服务器层接管的入口

权威清单位于 `routes.json`；Apache/Nginx 片段和验证脚本都应该与它保持一致。

```text
/bbs/register/
/bbs/register/index.php
/bbs/home/
/bbs/home/index.php
/bbs/home/information.php
/bbs/home/message.php
/bbs/home/security.php
/bbs/favorite/
/bbs/favorite/index.php
/bbs/editpid/
/bbs/editpid/index.php
/bbs/manage/post_activity/
/bbs/manage/post_activity/index.php
/bbs/online/
/bbs/online/index.php
/bbs/sign/
/bbs/sign/index.php
/cgi-bin/main.pl
/cgi-bin/bbs.pl
/bbs-new/index.php
/bbs-new/board.php
/bbs-new/thread.php
/bbs-new/profile.php
/bbs-new/search.php
/bbs-new/login/
/bbs-new/register/
/bbs-new/user-center.php
/bbs-new/stats.php
/bbs-new/editpid.php
/bbs-new/activity-post.php
```

`/bbs-new/*.php` 是旧 PHP 已经写死跳转过来的历史目标；它们不是新版源码文件，需要由服务器 rewrite 接住。

## Apache

使用 `apache-vhost.conf` 中的 `RewriteRule` 片段。建议放在站点 vhost 或根 `.htaccess`，不要放在 `bbs-new/` 子目录内，否则无法拦截 `/bbs/...`。

## Nginx

使用 `nginx-location.conf` 中的 `location` 片段。建议放在站点 `server {}` 块里，并确保这些 location 的优先级高于旧 PHP 的通用处理规则。

## 更新规则

```bash
npm --prefix bbs-new/app run generate:legacy-rewrites
```

不要手工分别维护 Apache 与 Nginx 片段。需要增删服务器接管入口时，先改 `routes.json`，再运行生成命令。

## 验证

```bash
npm --prefix bbs-new/app run verify:legacy-routes
npm --prefix bbs-new/app run build
```

`verify:legacy-routes` 会检查这些 rewrite 交付件是否覆盖当前列出的服务器层接管入口，并确认 `bbs-new/` 下没有 PHP 文件。它还会模拟浏览型旧 URL 经服务器规则转入 SPA 后的结果，确保查询参数追加和 `favorite?action=...` 这类旧后端保留规则没有漂移；同时扫描旧 PHP/JS/CGI 中实际出现的 `/bbs/...`、`/cgi-bin/...` 导航字面量，防止旧页面新增链接后没有纳入兼容设计。
