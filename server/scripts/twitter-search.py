#!/usr/bin/env python3
"""twitter-cli のラッパ。ClientTransaction の初期化に Cookie を付与する。

twitter-cli 0.8.5 は x-client-transaction-id を組み立てるために x.com のトップを
取得するが、このリクエストにだけ Cookie を付けていない (client.py の
_ensure_client_transaction)。その結果ログアウト状態のHTMLが返り、必要な
ondemand.s の JS が含まれないため ClientTransaction の初期化に失敗し、
以降の検索が HTTP 404 になる。

Cookie 付きで取得すれば ondemand.s の URL は取得できるため、
_gen_ct_headers に Cookie を足すだけで解消する。
上流が修正されたらこのラッパは不要になる。

使い方: server/.env の TWITTER_CLI_BIN にこのファイルの絶対パスを指定する。
引数はそのまま twitter-cli へ渡される。

twitter_cli が import できない場合は TWITTER_CLI_PYTHON
(既定: ~/.agent-reach-venv/bin/python3) で再実行する。
"""
import os
import sys


def _reexec_with_venv():
    """twitter_cli を持つインタプリタで自分自身を実行し直す"""
    interpreter = os.environ.get(
        "TWITTER_CLI_PYTHON",
        os.path.expanduser("~/.agent-reach-venv/bin/python3"),
    )
    if not os.path.exists(interpreter):
        sys.stderr.write(
            "twitter_cli を import できず、%s も見つかりません。\n"
            "TWITTER_CLI_PYTHON に twitter-cli を導入した python を指定してください。\n"
            % interpreter
        )
        raise SystemExit(1)
    # 無限ループ防止
    if os.environ.get("_TWITTER_WRAPPER_REEXEC") == "1":
        sys.stderr.write("%s でも twitter_cli を import できませんでした。\n" % interpreter)
        raise SystemExit(1)
    os.environ["_TWITTER_WRAPPER_REEXEC"] = "1"
    os.execv(interpreter, [interpreter, os.path.abspath(__file__)] + sys.argv[1:])


try:
    import twitter_cli.client as client
except ImportError:
    _reexec_with_venv()


_original_gen_ct_headers = client._gen_ct_headers


def _gen_ct_headers_with_cookie():
    headers = _original_gen_ct_headers()
    auth_token = os.environ.get("TWITTER_AUTH_TOKEN")
    ct0 = os.environ.get("TWITTER_CT0")
    if auth_token and ct0:
        headers["Cookie"] = "auth_token=%s; ct0=%s" % (auth_token, ct0)
    return headers


client._gen_ct_headers = _gen_ct_headers_with_cookie


if __name__ == "__main__":
    from twitter_cli.cli import cli

    cli()
