#!/usr/bin/env bash
# Creates or updates the single preview-status comment on a pull request.
# Usage: preview-comment.sh <deploying|deployed|failed|destroyed>
# Needs GH_TOKEN, APP_NAME, PR_NUMBER and HEAD_SHA in the environment.
set -euo pipefail

marker="<!-- fly-preview-status -->"
url="https://${APP_NAME}.fly.dev"
run_url="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
sha="${HEAD_SHA:0:7}"

case "$1" in
   deploying) status="🟡 Deploying \`${sha}\`" ;;
   deployed) status="🟢 Deployed \`${sha}\`" ;;
   failed) status="🔴 Deploy of \`${sha}\` failed" ;;
   destroyed) status="⚫ Destroyed, the PR is closed" ;;
   *)
      echo "Unknown state: $1" >&2
      exit 1
      ;;
esac

body="${marker}
### Preview environment

| | |
| --- | --- |
| **URL** | ${url} |
| **Status** | ${status} |
| **Updated** | $(date -u '+%Y-%m-%d %H:%M UTC') |
| **Logs** | [Workflow run](${run_url}) |"

existing=$(
   gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
      --jq ".[] | select(.user.login == \"github-actions[bot]\")
         | select(.body | startswith(\"${marker}\")) | .id" |
      head -n 1
)

if [ -n "$existing" ]; then
   gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${existing}" \
      -f body="$body" > /dev/null
elif [ "$1" != "destroyed" ]; then
   gh api --method POST "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
      -f body="$body" > /dev/null
fi
