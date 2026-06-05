type GuestUserCenterNoticeProps = {
  onGoHome: () => void;
};

export function GuestUserCenterNotice({ onGoHome }: GuestUserCenterNoticeProps) {
  return (
    <section className="card-surface rounded-lg border border-zinc-200 p-6 shadow-panel dark:border-zinc-800">
      <h1 className="text-xl font-bold text-[#385772] dark:text-white">游客模式无法访问个人中心</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        当前处于只读浏览状态，个人资料、草稿箱和消息入口需要登录后使用。
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-4 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772]"
      >
        返回首页
      </button>
    </section>
  );
}
