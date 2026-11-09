# Sourced (NOT executed) by the nginx image entrypoint before 20-envsubst-on-templates.sh,
# so the exported API_ORIGIN is visible to the nginx config template. Keep this file non-executable.
API_BASE_URL="${API_BASE_URL:-https://api.tashkino.ir/api/v1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
printf '{ "apiBaseUrl": "%s", "environment": "%s" }\n' "$API_BASE_URL" "$ENVIRONMENT" > /usr/share/nginx/html/config.json
API_ORIGIN=$(printf '%s' "$API_BASE_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
export API_ORIGIN
