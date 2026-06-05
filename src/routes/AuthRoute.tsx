import { ArrowRight, Check, Moon, RefreshCw, Sun } from 'lucide-react';
import { useEffect, useMemo, useState, type FocusEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import {
  type LegacyBbsAuthResponse,
  type LegacyBbsRegisterDraft,
  type LegacyBbsViewer,
} from '../api/legacyBbsClient';
import { getBbsNewApiUrl, getCapubbsRemoteUrl } from '../api/bbsNewApiRoutes';
import { TopBarLogo } from '../components/layout/TopBarLogo';
import { getAuthPathWithReturnTo, getAuthReturnToFromSearch, shouldHardRedirectAfterAuth } from '../utils/authRoutes';
import { md5LegacyStringHex } from '../utils/md5';

export type AuthMode = 'login' | 'register';

type AuthRouteProps = {
  isDark: boolean;
  mode: AuthMode;
  onLogin: (username: string, passwordHash: string) => Promise<LegacyBbsAuthResponse>;
  onRegister: (draft: LegacyBbsRegisterDraft) => Promise<LegacyBbsAuthResponse>;
  onToggleDark: () => void;
  viewer: LegacyBbsViewer;
};

type AuthFieldProps = {
  autoComplete?: string;
  label: string;
  name: string;
  maxLength?: number;
  minLength?: number;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
};

type AuthStatusTone = 'error' | 'success';
type StoredLoginAccount = {
  account: string;
  passwordHash: string | null;
};

const LOGIN_ACCOUNT_HISTORY_STORAGE_KEY = 'capubbs-login-account-history:v1';
const MAX_LOGIN_ACCOUNT_HISTORY = 8;
const STORED_PASSWORD_MASK = '********';
const MD5_HASH_PATTERN = /^[a-f0-9]{32}$/;
const CAPTCHA_IMAGE_PATH = 'captcha/';
const REGISTER_AVATAR_OPTIONS = [
  'lotus.jpeg',
  'yellow daisy.jpeg',
  'chalk.jpeg',
  'parrot.jpeg',
  'red rose.jpeg',
  'turntable.jpeg',
  'golf.jpeg',
  'soccer.jpeg',
  'dandelion.jpeg',
  'guitar.jpeg',
  'bowling.jpeg',
  'hockey.jpeg',
  'piano.jpeg',
  'owl.jpeg',
  'flower.jpeg',
].map((filename) => ({
  filename,
  label: filename.replace(/\.[^.]+$/, ''),
  src: getCapubbsRemoteUrl(`/bbsimg/icons/${filename}`),
}));

export function AuthRoute({ isDark, mode, onLogin, onRegister, onToggleDark, viewer }: AuthRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = getAuthReturnToFromSearch(location.search);

  useEffect(() => {
    if (mode === 'login' && viewer) {
      redirectAfterAuth(navigate, returnTo);
    }
  }, [mode, navigate, returnTo, viewer]);

  return (
    <div className="min-h-screen">
      <AuthTopBar isDark={isDark} onToggleDark={onToggleDark} />
      <main className="mx-auto flex min-h-screen w-full max-w-[1480px] items-center justify-center px-4 py-24">
        <section className="w-full max-w-[30rem]">
          <div className="mb-7 text-center">
            <Link
              to="/"
              className="inline-flex rounded-sm text-3xl font-black tracking-[0.18em] text-[#385772] outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white sm:text-4xl"
            >
              CAPUBBS
            </Link>
            <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-white">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h1>
          </div>

          {mode === 'login' ? (
            <LoginForm returnTo={returnTo} onLogin={onLogin} />
          ) : (
            <RegisterForm returnTo={returnTo} onRegister={onRegister} />
          )}
        </section>
      </main>
    </div>
  );
}

function AuthTopBar({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  return (
    <header className="topbar-surface fixed inset-x-0 top-0 z-30 border-b shadow-sm">
      <div className="mx-auto flex h-[var(--capubbs-topbar-height)] max-w-[1480px] items-center justify-between px-[var(--capubbs-topbar-x)]">
        <TopBarLogo onClick={() => undefined} />
        <button
          type="button"
          aria-label={isDark ? '切换到亮色模式' : '切换到暗黑模式'}
          onClick={onToggleDark}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.28] bg-[rgb(164_193_172_/_0.36)] px-3 text-sm font-semibold text-[#385772] transition hover:bg-[rgb(164_193_172_/_0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:border-white/[0.16] dark:bg-zinc-200/10 dark:text-white dark:hover:bg-zinc-200/[0.16]"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          <span>暗黑模式</span>
        </button>
      </div>
    </header>
  );
}

function LoginForm({
  onLogin,
  returnTo,
}: {
  onLogin: (username: string, passwordHash: string) => Promise<LegacyBbsAuthResponse>;
  returnTo: string;
}) {
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [rememberedPasswordHash, setRememberedPasswordHash] = useState<string | null>(null);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState(readStoredLoginAccounts);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<AuthStatusTone>('success');
  const matchedAccounts = useMemo(
    () => getMatchedLoginAccounts(storedAccounts, account),
    [account, storedAccounts],
  );
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = account; // 用户名可以包含空格，因此不进行 trim 处理
    const passwordValue = password;
    const passwordHash =
      rememberedPasswordHash && passwordValue === STORED_PASSWORD_MASK
        ? rememberedPasswordHash
        : md5LegacyStringHex(passwordValue);

    if (!username || !passwordValue) {
      setStatusTone("error");
      setStatus("请输入 ID 和密码。");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      await onLogin(username, passwordHash);
      if (rememberAccount) {
        setStoredAccounts(saveStoredLoginAccount(username, passwordHash));
      } else {
        setStoredAccounts(removeStoredLoginAccount(username));
      }
      setIsAccountMenuOpen(false);
      setStatusTone("success");
      setStatus("登录成功，正在进入论坛。");
      redirectAfterAuth(navigate, returnTo);
    } catch (error) {
      setStatusTone("error");
      setStatus(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="card-surface rounded-xl border border-zinc-200 p-5 shadow-panel dark:border-zinc-800 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4">
          <AccountHistoryField
            accounts={matchedAccounts}
            isOpen={isAccountMenuOpen}
            value={account}
            onChange={(nextAccount) => {
              setAccount(nextAccount);
              setStatus('');
              if (rememberedPasswordHash) {
                setPassword('');
                setRememberedPasswordHash(null);
              }
            }}
            onClose={() => setIsAccountMenuOpen(false)}
            onOpen={() => setIsAccountMenuOpen(true)}
            onSelect={(nextAccount) => {
              setAccount(nextAccount.account);
              setRememberAccount(true);
              setRememberedPasswordHash(nextAccount.passwordHash);
              setPassword(nextAccount.passwordHash ? STORED_PASSWORD_MASK : '');
              setIsAccountMenuOpen(false);
            }}
          />
          <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            密码
            <input
              autoComplete="current-password"
              name="password"
              placeholder="输入密码"
              type="password"
              value={password}
              onChange={(event) => {
                const nextPassword = event.currentTarget.value;
                setPassword(nextPassword);
                if (rememberedPasswordHash && nextPassword !== STORED_PASSWORD_MASK) {
                  setRememberedPasswordHash(null);
                }
              }}
              className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white/85 px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900/85 dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                name="remember"
                checked={rememberAccount}
                onChange={(event) => setRememberAccount(event.currentTarget.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] dark:border-white/20 dark:bg-zinc-900"
              />
              记住我
            </label>
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="rounded-sm font-semibold text-[#385772] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-emerald-100"
            >
              忘记密码？
            </button>
          </div>
        </div>

        <AuthFormFooter
          status={status}
          statusTone={statusTone}
          primaryDisabled={isSubmitting}
          primaryLabel={isSubmitting ? '登录中' : '登录'}
          secondaryLabel="注册"
          secondaryTo={getAuthPathWithReturnTo('/register', returnTo)}
        />
      </form>
      {isForgotPasswordOpen ? (
        <ForgotPasswordDialog onClose={() => setIsForgotPasswordOpen(false)} />
      ) : null}
    </>
  );
}

function AccountHistoryField({
  accounts,
  isOpen,
  onChange,
  onClose,
  onOpen,
  onSelect,
  value,
}: {
  accounts: StoredLoginAccount[];
  isOpen: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onOpen: () => void;
  onSelect: (value: StoredLoginAccount) => void;
  value: string;
}) {
  const showMenu = isOpen && accounts.length > 0;
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    onClose();
  };

  return (
    <div className="relative block text-sm font-semibold text-zinc-600 dark:text-zinc-300" onBlur={handleBlur}>
      <label htmlFor="login-account">ID</label>
      <input
        id="login-account"
        autoComplete="username"
        name="account"
        placeholder="输入 ID"
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          onOpen();
        }}
        onClick={onOpen}
        onFocus={onOpen}
        className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white/85 px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900/85 dark:text-white dark:placeholder:text-zinc-500"
      />
      {showMenu ? (
        <div
          role="listbox"
          aria-label="历史登录账号"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white/95 p-1 shadow-panel backdrop-blur dark:border-white/10 dark:bg-zinc-950/95"
        >
          {accounts.map((storedAccount) => (
            <button
              key={storedAccount.account}
              type="button"
              role="option"
              aria-selected={storedAccount.account === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(storedAccount)}
              className="flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-zinc-700 transition hover:bg-emerald-50 hover:text-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-zinc-200 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              {storedAccount.account}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RegisterForm({
  onRegister,
  returnTo,
}: {
  onRegister: (draft: LegacyBbsRegisterDraft) => Promise<LegacyBbsAuthResponse>;
  returnTo: string;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(() => getInitialRegisterAvatarSrc());
  const [captcha, setCaptcha] = useState('');
  const [captchaNonce, setCaptchaNonce] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<AuthStatusTone>('success');
  const captchaSrc = getBbsNewApiUrl(`${CAPTCHA_IMAGE_PATH}?${captchaNonce}`);
  const refreshCaptcha = () => {
    setCaptcha('');
    setCaptchaNonce(Date.now());
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const normalizedCaptcha = captcha.trim();
    const normalizedIcon = selectedIcon.trim();

    if (!normalizedUsername || !normalizedEmail || !password || !normalizedIcon || !normalizedCaptcha) {
      setStatusTone('error');
      setStatus('请填写 ID、邮箱、密码、头像和验证码。');
      return;
    }

    if (password.length < 6) {
      setStatusTone('error');
      setStatus('密码至少需要 6 位。');
      return;
    }

    if (password !== confirmPassword) {
      setStatusTone('error');
      setStatus('两次输入的密码不一致。');
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    try {
      await onRegister({
        captcha: normalizedCaptcha,
        icon: normalizedIcon,
        mail: normalizedEmail,
        passwordHash: md5LegacyStringHex(password),
        username: normalizedUsername,
      });
      setStatusTone('success');
      setStatus('注册成功，正在进入论坛。');
      redirectAfterAuth(navigate, returnTo);
    } catch (error) {
      setStatusTone('error');
      setStatus(getRegisterErrorMessage(error));
      refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="card-surface rounded-xl border border-zinc-200 p-5 shadow-panel dark:border-zinc-800 sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4">
          <AuthField
            autoComplete="username"
            label="ID"
            maxLength={30}
            name="username"
            onChange={(value) => {
              setUsername(value);
              setStatus('');
            }}
            placeholder="设置你的 ID"
            required
            value={username}
          />
          <AuthField
            autoComplete="email"
            label="邮箱"
            maxLength={50}
            name="email"
            onChange={(value) => {
              setEmail(value);
              setStatus('');
            }}
            placeholder="输入邮箱"
            required
            type="email"
            value={email}
          />
          <AuthField
            autoComplete="new-password"
            label="密码"
            maxLength={18}
            minLength={6}
            name="password"
            onChange={(value) => {
              setPassword(value);
              setStatus('');
            }}
            placeholder="设置密码"
            required
            type="password"
            value={password}
          />
          <AuthField
            autoComplete="new-password"
            label="确认密码"
            maxLength={18}
            minLength={6}
            name="confirmPassword"
            onChange={(value) => {
              setConfirmPassword(value);
              setStatus('');
            }}
            placeholder="再次输入密码"
            required
            type="password"
            value={confirmPassword}
          />
          <AvatarSelectField
            disabled={isSubmitting}
            onChange={(value) => {
              setSelectedIcon(value);
              setStatus('');
            }}
            options={REGISTER_AVATAR_OPTIONS}
            value={selectedIcon}
          />
          <CaptchaField
            disabled={isSubmitting}
            onChange={(value) => {
              setCaptcha(value);
              setStatus('');
            }}
            onRefresh={refreshCaptcha}
            src={captchaSrc}
            value={captcha}
          />
        </div>

        <AuthFormFooter
          status={status}
          statusTone={statusTone}
          primaryDisabled={isSubmitting}
          primaryLabel={isSubmitting ? '注册中' : '注册'}
          secondaryLabel="登录"
          secondaryTo={getAuthPathWithReturnTo('/login', returnTo)}
        />
      </form>
    </>
  );
}

function AuthField({
  autoComplete,
  label,
  maxLength,
  minLength,
  name,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  value,
}: AuthFieldProps) {
  return (
    <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
      {label}
      <input
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white/85 px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900/85 dark:text-white dark:placeholder:text-zinc-500"
      />
    </label>
  );
}

function AvatarSelectField({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  options: typeof REGISTER_AVATAR_OPTIONS;
  value: string;
}) {
  return (
    <div className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
      <span>头像</span>
      <input type="hidden" name="icon" value={value} readOnly />
      <div className="mt-2 flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900">
          <img src={value} alt="已选头像" className="h-full w-full object-cover" />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {options.map((option) => {
            const selected = option.src === value;

            return (
              <button
                key={option.filename}
                type="button"
                aria-label={`选择头像 ${option.label}`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange(option.src)}
                title={option.label}
                className={
                  selected
                    ? 'relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-[#385772] bg-white shadow-sm ring-2 ring-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-200 dark:bg-zinc-900 dark:ring-emerald-200'
                    : 'relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm transition hover:border-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-200'
                }
              >
                <img src={option.src} alt="" className="h-full w-full object-cover" />
                {selected ? (
                  <span className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm bg-[#385772] text-white dark:bg-emerald-200 dark:text-zinc-950">
                    <Check size={12} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CaptchaField({
  disabled,
  onChange,
  onRefresh,
  src,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  onRefresh: () => void;
  src: string;
  value: string;
}) {
  return (
    <div className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300">
      <span>图片验证码</span>
      <div className="mt-2 flex gap-3">
        <input
          aria-label="图片验证码"
          autoComplete="off"
          disabled={disabled}
          name="captcha"
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="输入计算结果"
          required
          value={value}
          className="h-11 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white/85 px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#385772] focus:ring-2 focus:ring-[#385772] dark:border-white/10 dark:bg-zinc-900/85 dark:text-white dark:placeholder:text-zinc-500"
        />
        <button
          type="button"
          aria-label="刷新验证码"
          disabled={disabled}
          onClick={onRefresh}
          title="刷新验证码"
          className="group relative h-11 w-28 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-white transition hover:border-[#385772] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900"
        >
          <img src={src} alt="验证码" className="h-full w-full object-cover" />
          <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded bg-white/90 text-[#385772] shadow-sm opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-zinc-950/90 dark:text-emerald-100">
            <RefreshCw size={13} />
          </span>
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-dialog-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-3 dark:bg-black/80"
      onClick={onClose}
    >
      <section
        className="w-[min(calc(100vw-1.5rem),24rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
          <h2 id="forgot-password-dialog-title" className="text-base font-semibold text-[#385772] dark:text-white">
            忘记密码
          </h2>
        </header>
        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            请联系管理员，邮箱：pkuzhd@pku.edu.cn
          </p>
        </div>
        <footer className="flex justify-end border-t border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md bg-[#385772] px-3 text-sm font-bold text-white transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100"
          >
            知道了
          </button>
        </footer>
      </section>
    </div>
  );
}

function AuthFormFooter({
  primaryDisabled = false,
  primaryLabel,
  secondaryLabel,
  secondaryTo,
  status,
  statusTone = 'success',
}: {
  primaryDisabled?: boolean;
  primaryLabel: string;
  secondaryLabel: string;
  secondaryTo: string;
  status: string;
  statusTone?: AuthStatusTone;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={primaryDisabled}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#385772] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#28465f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-55 dark:bg-emerald-200 dark:text-zinc-950 dark:hover:bg-emerald-100 dark:focus-visible:ring-emerald-200 dark:focus-visible:ring-offset-zinc-950"
        >
          {primaryLabel}
        </button>
        <Link
          to={secondaryTo}
          className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[#385772] transition hover:bg-emerald-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#385772] dark:text-white dark:hover:bg-white/[0.08]"
        >
          {secondaryLabel}
          <ArrowRight size={15} />
        </Link>
      </div>
      {status ? (
        <p
          className={
            statusTone === 'error'
              ? 'mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-100/15 dark:bg-rose-300/10 dark:text-rose-100'
              : 'mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-100/15 dark:bg-emerald-300/10 dark:text-emerald-100'
          }
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}

function getMatchedLoginAccounts(accounts: StoredLoginAccount[], keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();

  if (!normalizedKeyword) {
    return accounts;
  }

  return accounts.filter((account) => account.account.toLowerCase().includes(normalizedKeyword));
}

function getLoginErrorMessage(_error: unknown) {
  return '账号或密码错误';
}

function getRegisterErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '注册失败，请刷新验证码后重试。';
}

function redirectAfterAuth(navigate: NavigateFunction, returnTo: string) {
  if (shouldHardRedirectAfterAuth(returnTo)) {
    window.location.assign(returnTo);
    return;
  }

  navigate(returnTo, { replace: true });
}

function getInitialRegisterAvatarSrc() {
  const selectedOption = REGISTER_AVATAR_OPTIONS[Math.floor(Math.random() * REGISTER_AVATAR_OPTIONS.length)];

  return selectedOption?.src ?? '';
}

function readStoredLoginAccounts() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawAccounts = window.localStorage.getItem(LOGIN_ACCOUNT_HISTORY_STORAGE_KEY);

    if (!rawAccounts) {
      return [];
    }

    const parsedAccounts: unknown = JSON.parse(rawAccounts);

    if (!Array.isArray(parsedAccounts)) {
      return [];
    }

    return uniqueStoredLoginAccounts(parsedAccounts.map(normalizeStoredLoginAccount).filter(Boolean));
  } catch {
    return [];
  }
}

function saveStoredLoginAccount(account: string, passwordHash: string) {
  const normalizedAccount = account;
  const nextEntry = {
    account: normalizedAccount,
    passwordHash,
  };
  const nextAccounts = normalizedAccount
    ? [nextEntry, ...readStoredLoginAccounts().filter((storedAccount) => storedAccount.account !== normalizedAccount)]
        .slice(0, MAX_LOGIN_ACCOUNT_HISTORY)
    : readStoredLoginAccounts();

  if (typeof window === 'undefined') {
    return nextAccounts;
  }

  try {
    window.localStorage.setItem(LOGIN_ACCOUNT_HISTORY_STORAGE_KEY, JSON.stringify(nextAccounts));
  } catch {
    return nextAccounts;
  }

  return nextAccounts;
}

function removeStoredLoginAccount(account: string) {
  const normalizedAccount = account;
  const nextAccounts = readStoredLoginAccounts().filter((storedAccount) => storedAccount.account !== normalizedAccount);

  if (typeof window === 'undefined') {
    return nextAccounts;
  }

  try {
    window.localStorage.setItem(LOGIN_ACCOUNT_HISTORY_STORAGE_KEY, JSON.stringify(nextAccounts));
  } catch {
    return nextAccounts;
  }

  return nextAccounts;
}

function normalizeStoredLoginAccount(entry: unknown): StoredLoginAccount | null {
  if (typeof entry === 'string') {
    const account = entry;
    return account ? { account, passwordHash: null } : null;
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const account = 'account' in entry && typeof entry.account === 'string' ? entry.account : '';
  const passwordHash =
    'passwordHash' in entry && typeof entry.passwordHash === 'string' && MD5_HASH_PATTERN.test(entry.passwordHash)
      ? entry.passwordHash
      : null;

  return account ? { account, passwordHash } : null;
}

function uniqueStoredLoginAccounts(accounts: Array<StoredLoginAccount | null>) {
  return accounts.reduce<StoredLoginAccount[]>((uniqueAccounts, account) => {
    if (!account) {
      return uniqueAccounts;
    }

    if (!uniqueAccounts.some((storedAccount) => storedAccount.account === account.account)) {
      uniqueAccounts.push(account);
    }

    return uniqueAccounts;
  }, []).slice(0, MAX_LOGIN_ACCOUNT_HISTORY);
}
