# shellcheck shell=sh
# Select a working, supported Node for this repo — even when the default `node`
# cannot start at all.
#
# WHY THIS EXISTS (the gap the JS preinstall guard cannot cover)
# `scripts/check-node-version.mjs` runs via `node`, so it only catches a Node
# that STARTS but is the wrong version. On a real macOS failure the default
# `node` is dyld-broken and aborts before it runs anything — e.g. Homebrew's
# `node` linked against a `libsimdjson.NN.dylib` that a later `brew upgrade`
# removed:
#     dyld: Library not loaded: .../libsimdjson.29.dylib  (node exits 134)
# When that happens `npm install`, `npm run dev`, and the whole `electron:dev`
# chain die instantly and the JS guard never executes. This is pure POSIX sh:
# it works with a dead `node`, and it prepends an already-installed supported
# Node to PATH so the documented launch commands resolve a Node that runs.
#
# SOURCE OF TRUTH for the required major: .nvmrc (never duplicated here).
#
# Usage:
#   source scripts/use-supported-node.sh   # fix PATH for the current shell
#   sh     scripts/use-supported-node.sh    # print the export line + diagnose
#
# Honest scope: this only SELECTS an already-installed supported Node. It never
# installs Node and never repairs a broken Homebrew keg. If no supported Node is
# found it prints the exact install command and returns non-zero.

_uns_repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
_uns_want_major=$(tr -dc '0-9' <"$_uns_repo_root/.nvmrc" 2>/dev/null | cut -c1-2)
[ -n "$_uns_want_major" ] || _uns_want_major=22

# Does the Node currently on PATH both START and report a supported major?
# better-sqlite3 ^11 has no prebuilt for Node 23+, so the supported floor is the
# .nvmrc major and the ceiling is < 23 (matches package.json engines.node).
_uns_node_ok() {
  _v=$(node --version 2>/dev/null) || return 1   # crash (e.g. dyld) => not ok
  _maj=$(printf '%s' "$_v" | tr -dc '0-9.' | cut -d. -f1)
  [ -n "$_maj" ] && [ "$_maj" -ge "$_uns_want_major" ] && [ "$_maj" -lt 23 ]
}

# Print the bin dir of the first working supported Node we can find, else nothing.
_uns_find_bin() {
  # 1) Homebrew keg-only node@<major> (Apple Silicon then Intel prefix).
  for _p in "/opt/homebrew/opt/node@${_uns_want_major}/bin" \
            "/usr/local/opt/node@${_uns_want_major}/bin"; do
    if [ -x "$_p/node" ] && "$_p/node" --version >/dev/null 2>&1; then
      printf '%s\n' "$_p"; return 0
    fi
  done
  # 2) A version manager's installed copy (fnm / nvm), if present and supported.
  for _mgr_node in \
    "$HOME/.local/state/fnm_multishells"/*/bin/node \
    "$HOME/Library/Application Support/fnm/node-versions/v${_uns_want_major}".*/installation/bin/node \
    "$HOME/.nvm/versions/node/v${_uns_want_major}".*/bin/node; do
    if [ -x "$_mgr_node" ] && "$_mgr_node" --version >/dev/null 2>&1; then
      dirname -- "$_mgr_node"; return 0
    fi
  done
  return 1
}

if _uns_node_ok; then
  printf '[use-supported-node] node %s already supported — no change.\n' \
    "$(node --version)" >&2
else
  _uns_bin=$(_uns_find_bin) || _uns_bin=''
  if [ -n "$_uns_bin" ]; then
    PATH="$_uns_bin:$PATH"
    export PATH
    printf '[use-supported-node] using node %s (%s)\n' \
      "$("$_uns_bin/node" --version)" "$_uns_bin" >&2
    # When run (not sourced), echo the line so `eval "$(...)"` also works.
    case "$0" in *use-supported-node.sh) printf 'export PATH="%s:$PATH"\n' "$_uns_bin" ;; esac
  else
    printf '[use-supported-node] no working Node %s+ (<23) found.\n' "$_uns_want_major" >&2
    printf '  Install it, then re-run:\n' >&2
    printf '    brew install node@%s   # macOS\n' "$_uns_want_major" >&2
    printf '    source scripts/use-supported-node.sh\n' >&2
    case "$0" in *use-supported-node.sh) exit 1 ;; esac
  fi
fi

unset _uns_repo_root _uns_want_major _uns_bin _uns_node_ok _uns_find_bin _v _maj _p _mgr_node 2>/dev/null || true
