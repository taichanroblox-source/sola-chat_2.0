"""One-time persistent administrator setup. Run from terminal, not from browser."""
import getpass
import json
import os
from pathlib import Path
from werkzeug.security import generate_password_hash

storage = Path(os.getenv('SOLA_DATA_DIR', str(Path.home() / 'SOLA-DATA'))).expanduser()
storage.mkdir(parents=True, exist_ok=True)
path = storage / 'admin_settings.json'
if path.exists():
    print('管理者設定がすでに存在するよ。変更する場合は現在の管理者パスワードが必要です。')
    from werkzeug.security import check_password_hash
    try:
        existing = json.loads(path.read_text(encoding='utf-8'))
        previous = getpass.getpass('現在の管理者パスワード: ')
        if not check_password_hash(existing['password_hash'], previous):
            raise SystemExit('パスワードが違うため変更しませんでした。')
    except (OSError, ValueError, KeyError):
        raise SystemExit('設定ファイルが壊れている可能性があります。安全のため上書きしません。')
print('先にSOLA CHATで通常のユーザーアカウントを登録しておいてね。')
username = input('管理者にする既存ユーザー名: ').strip()
if not username or len(username) > 80:
    raise SystemExit('ユーザー名が正しくないよ。')
password = getpass.getpass('新しい管理者専用パスワード（12文字以上）: ')
confirm = getpass.getpass('もう一度入力: ')
if len(password) < 12 or password != confirm:
    raise SystemExit('12文字以上で同じパスワードを2回入力してね。')
data = {'username': username, 'password_hash': generate_password_hash(password)}
tmp = path.with_name(path.name + '.tmp')
fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
try:
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
    os.chmod(path, 0o600)
finally:
    if tmp.exists():
        tmp.unlink()
print('設定完了！ アプリを再起動して、管理者ログインを試してね。')
