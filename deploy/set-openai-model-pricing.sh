#!/bin/bash
# Write OpenAI/Codex model pricing to the MySQL options table.
#
# Purpose:
#   Configure pricing for gpt-5.5, gpt-5.4, gpt-5.4-mini, and codex-auto-review.
#   The script merges JSON values and keeps existing prices for other models.
#
# It writes:
#   1. ModelRatio / CompletionRatio / CacheRatio as token-billing fallback.
#   2. billing_setting.billing_mode / billing_setting.billing_expr for exact expression billing.
#   3. Removes these models from ModelPrice so fixed per-request pricing does not override token billing.
#
# Usage:
#   bash set-openai-model-pricing.sh <MySQL password>
# Example:
#   bash set-openai-model-pricing.sh 'YourMySQLPassword'
#
# Requirements:
#   1. Run this from /www/wwwroot/new-api where docker-compose.yml exists.
#   2. The password must match MYSQL_ROOT_PASSWORD in docker-compose.yml.
#   3. Defaults: DB_NAME=new-api, MYSQL_CONTAINER=mysql, NEW_API_SERVICE=new-api.
set -e

MYSQL_PASSWORD="$1"
DB_NAME="${DB_NAME:-new-api}"
MYSQL_CONTAINER="${MYSQL_CONTAINER:-mysql}"
NEW_API_SERVICE="${NEW_API_SERVICE:-new-api}"

if [ -z "$MYSQL_PASSWORD" ]; then
  echo "Usage: bash set-openai-model-pricing.sh <MySQL password>"
  echo "Optional env: DB_NAME=new-api MYSQL_CONTAINER=mysql NEW_API_SERVICE=new-api"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "ERROR: MySQL container is not running: $MYSQL_CONTAINER"
  echo "       Set MYSQL_CONTAINER=your-container-name if needed."
  exit 1
fi

BACKUP_TABLE="options_pricing_backup_$(date +%Y%m%d_%H%M%S)"

MODEL_RATIO_PATCH='{
  "gpt-5.5": 2.5,
  "gpt-5.4": 1.25,
  "gpt-5.4-mini": 0.375,
  "codex-auto-review": 0.875
}'

COMPLETION_RATIO_PATCH='{
  "gpt-5.5": 6,
  "gpt-5.4": 6,
  "gpt-5.4-mini": 6,
  "codex-auto-review": 8
}'

CACHE_RATIO_PATCH='{
  "gpt-5.5": 0.1,
  "gpt-5.4": 0.1,
  "gpt-5.4-mini": 0.1,
  "codex-auto-review": 0.1
}'

BILLING_MODE_PATCH='{
  "gpt-5.5": "tiered_expr",
  "gpt-5.4": "tiered_expr",
  "gpt-5.4-mini": "tiered_expr",
  "codex-auto-review": "tiered_expr"
}'

BILLING_EXPR_PATCH='{
  "gpt-5.5": "len < 270000 ? tier(\"standard\", p * 5 + c * 30 + cr * 0.5) : tier(\"long_context\", p * 10 + c * 45 + cr * 1)",
  "gpt-5.4": "len < 270000 ? tier(\"standard\", p * 2.5 + c * 15 + cr * 0.25) : tier(\"long_context\", p * 5 + c * 22.5 + cr * 0.5)",
  "gpt-5.4-mini": "tier(\"standard\", p * 0.75 + c * 4.5 + cr * 0.075)",
  "codex-auto-review": "tier(\"standard\", p * 1.75 + c * 14 + cr * 0.175)"
}'

echo "==> [1/4] Backing up pricing options to ${BACKUP_TABLE}..."
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_PASSWORD}" "$DB_NAME" <<SQL
CREATE TABLE \`${BACKUP_TABLE}\` AS
SELECT * FROM options
WHERE \`key\` IN (
  'ModelPrice',
  'ModelRatio',
  'CompletionRatio',
  'CacheRatio',
  'billing_setting.billing_mode',
  'billing_setting.billing_expr'
);
SQL

echo "==> [2/4] Merging model pricing..."
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_PASSWORD}" "$DB_NAME" <<SQL
SET SESSION sql_mode = CONCAT_WS(',', @@sql_mode, 'NO_BACKSLASH_ESCAPES');

INSERT INTO options (\`key\`, \`value\`) VALUES ('ModelPrice', '{}')
ON DUPLICATE KEY UPDATE \`value\` = IFNULL(\`value\`, '{}');

UPDATE options
SET \`value\` = JSON_REMOVE(
  CASE
    WHEN \`value\` IS NULL OR TRIM(\`value\`) = '' OR JSON_VALID(\`value\`) = 0 THEN '{}'
    ELSE \`value\`
  END,
  '$."gpt-5.5"',
  '$."gpt-5.4"',
  '$."gpt-5.4-mini"',
  '$."codex-auto-review"'
)
WHERE \`key\` = 'ModelPrice';

INSERT INTO options (\`key\`, \`value\`) VALUES
  ('ModelRatio', '${MODEL_RATIO_PATCH}'),
  ('CompletionRatio', '${COMPLETION_RATIO_PATCH}'),
  ('CacheRatio', '${CACHE_RATIO_PATCH}'),
  ('billing_setting.billing_mode', '${BILLING_MODE_PATCH}'),
  ('billing_setting.billing_expr', '${BILLING_EXPR_PATCH}')
ON DUPLICATE KEY UPDATE
  \`value\` = JSON_MERGE_PATCH(
    CASE
      WHEN \`value\` IS NULL OR TRIM(\`value\`) = '' OR JSON_VALID(\`value\`) = 0 THEN '{}'
      ELSE \`value\`
    END,
    VALUES(\`value\`)
  );
SQL

echo "==> [3/4] Verifying written values..."
docker exec "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_PASSWORD}" "$DB_NAME" -e "
SELECT \`key\`, JSON_EXTRACT(\`value\`, '$.\"gpt-5.5\"') AS gpt_55,
              JSON_EXTRACT(\`value\`, '$.\"gpt-5.4\"') AS gpt_54,
              JSON_EXTRACT(\`value\`, '$.\"gpt-5.4-mini\"') AS gpt_54_mini,
              JSON_EXTRACT(\`value\`, '$.\"codex-auto-review\"') AS codex_auto_review
FROM options
WHERE \`key\` IN ('ModelPrice','ModelRatio','CompletionRatio','CacheRatio','billing_setting.billing_mode','billing_setting.billing_expr');
"

echo "==> [4/4] Restarting new-api so in-memory options reload immediately..."
if [ -f docker-compose.yml ]; then
  docker-compose restart "$NEW_API_SERVICE"
else
  docker restart "$NEW_API_SERVICE"
fi

echo ""
echo "Done. Backup table: ${BACKUP_TABLE}"
echo "If codex-auto-review is an alias, make sure the channel model mapping contains:"
echo '   {"codex-auto-review":"gpt-5.3-codex"}'
echo "Logs: docker-compose logs -f ${NEW_API_SERVICE}"
