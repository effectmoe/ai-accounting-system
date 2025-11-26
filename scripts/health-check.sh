#!/bin/bash

# ヘルスチェックスクリプト for AAM会計システム・契約システム
# 使用方法: ./scripts/health-check.sh [OPTIONS]

set -e

# カラーコード定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# デフォルト設定
BASE_URL="http://localhost:3000"
VERBOSE=false
JSON_OUTPUT=false
CHECK_ENDPOINTS=false
SAVE_REPORT=false

# ヘルプ表示
show_help() {
    echo "AAM会計システム・契約システム ヘルスチェックスクリプト"
    echo ""
    echo "使用方法: $0 [OPTIONS]"
    echo ""
    echo "オプション:"
    echo "  -u, --url URL          ベースURL (デフォルト: $BASE_URL)"
    echo "  -v, --verbose          詳細出力"
    echo "  -j, --json            JSON形式で出力"
    echo "  -e, --endpoints       エンドポイントもチェック"
    echo "  -s, --save            レポートをファイルに保存"
    echo "  -h, --help            このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                           # 基本ヘルスチェック"
    echo "  $0 -v                        # 詳細出力"
    echo "  $0 -u https://your-app.com   # 本番環境チェック"
    echo "  $0 -e -s                     # 全チェック + レポート保存"
}

# パラメータ解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -j|--json)
            JSON_OUTPUT=true
            shift
            ;;
        -e|--endpoints)
            CHECK_ENDPOINTS=true
            shift
            ;;
        -s|--save)
            SAVE_REPORT=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# ログ関数
log_info() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

log_verbose() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1"
    fi
}

# JSON結果格納用（連想配列の代わりに通常の変数を使用）
results_health_api=""
results_env_check_api=""
results_accounts_api=""
results_customers_api=""
results_invoices_api=""
results_deals_api=""
results_documents_api=""
results_activities_api=""

# APIエンドポイントチェック
check_endpoint() {
    local endpoint="$1"
    local name="$2"
    local url="${BASE_URL}${endpoint}"
    
    log_verbose "チェック中: $name ($url)"
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/response.tmp "$url" 2>/dev/null); then
        http_code="${response: -3}"
        if [ "$http_code" = "200" ]; then
            log_success "$name: OK (HTTP $http_code)"
            eval "results_$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')_api=\"OK\""
            return 0
        else
            log_warning "$name: HTTP $http_code"
            eval "results_$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')_api=\"WARNING\""
            return 1
        fi
    else
        log_error "$name: 接続失敗"
        eval "results_$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')_api=\"ERROR\""
        return 1
    fi
}

# ヘルスチェック実行
run_health_check() {
    local health_url="${BASE_URL}/api/health"
    local env_url="${BASE_URL}/api/env-check"
    
    log_info "ヘルスチェック開始: $BASE_URL"
    echo ""
    
    # ヘルスチェック API
    log_info "=== システムヘルスチェック ==="
    if health_response=$(curl -s "$health_url" 2>/dev/null); then
        if echo "$health_response" | jq empty 2>/dev/null; then
            system_name=$(echo "$health_response" | jq -r '.system // "Unknown"')
            version=$(echo "$health_response" | jq -r '.version // "Unknown"')
            environment=$(echo "$health_response" | jq -r '.environment // "Unknown"')
            timestamp=$(echo "$health_response" | jq -r '.timestamp // "Unknown"')
            
            log_success "システム: $system_name"
            log_success "バージョン: $version"
            log_success "環境: $environment"
            log_verbose "チェック時刻: $timestamp"
            
            # サービス状態チェック
            echo ""
            log_info "=== サービス状態 ==="
            services=$(echo "$health_response" | jq -r '.services | to_entries[] | "\(.key):\(.value)"')
            while IFS=':' read -r service status; do
                case $status in
                    "healthy")
                        log_success "$service: 正常"
                        ;;
                    "configured")
                        log_success "$service: 設定済み"
                        ;;
                    "unhealthy"|"error")
                        log_error "$service: $status"
                        ;;
                    *)
                        log_warning "$service: $status"
                        ;;
                esac
            done <<< "$services"
            
            results_health_api="OK"
        else
            log_error "ヘルスチェックAPI: 無効なJSONレスポンス"
            results_health_api="ERROR"
        fi
    else
        log_error "ヘルスチェックAPI: 接続失敗"
        results_health_api="ERROR"
    fi
    
    # 環境変数チェック API
    echo ""
    log_info "=== 環境変数チェック ==="
    if env_response=$(curl -s "$env_url" 2>/dev/null); then
        if echo "$env_response" | jq empty 2>/dev/null; then
            completeness=$(echo "$env_response" | jq -r '.completeness // "0%"')
            configured_count=$(echo "$env_response" | jq -r '.configuredCount // 0')
            total_count=$(echo "$env_response" | jq -r '.totalCount // 0')
            critical_missing=$(echo "$env_response" | jq -r '.criticalMissing[]? // empty')
            
            log_success "設定完了率: $completeness ($configured_count/$total_count)"
            
            if [ -n "$critical_missing" ]; then
                log_error "必須項目未設定: $critical_missing"
            else
                log_success "すべての必須項目が設定済み"
            fi
            
            # カテゴリ別設定状況
            if [ "$VERBOSE" = true ]; then
                echo ""
                log_info "=== カテゴリ別設定状況 ==="
                categories=$(echo "$env_response" | jq -r '.categoryCompleteness | to_entries[] | "\(.key):\(.value.percentage)"')
                while IFS=':' read -r category percentage; do
                    if [ "$percentage" -ge 80 ]; then
                        log_success "$category: ${percentage}%"
                    elif [ "$percentage" -ge 50 ]; then
                        log_warning "$category: ${percentage}%"
                    else
                        log_error "$category: ${percentage}%"
                    fi
                done <<< "$categories"
            fi
            
            results_env_check_api="OK"
        else
            log_error "環境変数チェックAPI: 無効なJSONレスポンス"
            results_env_check_api="ERROR"
        fi
    else
        log_error "環境変数チェックAPI: 接続失敗"
        results_env_check_api="ERROR"
    fi
    
    # エンドポイントチェック（オプション）
    if [ "$CHECK_ENDPOINTS" = true ]; then
        echo ""
        log_info "=== APIエンドポイントチェック ==="
        check_endpoint "/api/accounts" "Accounts API"
        check_endpoint "/api/customers" "Customers API"
        check_endpoint "/api/invoices" "Invoices API"
        check_endpoint "/api/deals" "Deals API"
        check_endpoint "/api/documents" "Documents API"
        check_endpoint "/api/activities" "Activities API"
    fi
}

# レポート保存
save_report() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="health_check_report_${timestamp}.json"
    
    # 結果をJSON形式で保存
    {
        echo "{"
        echo "  \"timestamp\": \"$(date -Iseconds)\","
        echo "  \"base_url\": \"$BASE_URL\","
        echo "  \"results\": {"
        local first=true
        for key in "${!results[@]}"; do
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            echo -n "    \"$key\": \"${results[$key]}\""
        done
        echo ""
        echo "  }"
        echo "}"
    } > "$report_file"
    
    log_info "レポートを保存しました: $report_file"
}

# メイン処理
main() {
    if [ "$JSON_OUTPUT" = true ]; then
        # JSON出力モード
        health_response=$(curl -s "${BASE_URL}/api/health" 2>/dev/null || echo '{}')
        env_response=$(curl -s "${BASE_URL}/api/env-check" 2>/dev/null || echo '{}')
        
        jq -n \
            --argjson health "$health_response" \
            --argjson env "$env_response" \
            --arg timestamp "$(date -Iseconds)" \
            --arg base_url "$BASE_URL" \
            '{
                timestamp: $timestamp,
                base_url: $base_url,
                health: $health,
                environment: $env
            }'
    else
        # 通常出力モード
        echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
        echo -e "${PURPLE}║   AAM会計・契約システム ヘルスチェック    ║${NC}"
        echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
        echo ""
        
        run_health_check
        
        echo ""
        echo -e "${PURPLE}===========================================${NC}"
        echo -e "${PURPLE}チェック完了: $(date)${NC}"
        echo -e "${PURPLE}===========================================${NC}"
        
        # 結果サマリー
        total=0
        success=0
        for result in "${results[@]}"; do
            ((total++))
            if [ "$result" = "OK" ]; then
                ((success++))
            fi
        done
        
        if [ $total -gt 0 ]; then
            echo -e "${BLUE}総合結果: $success/$total テスト成功${NC}"
            if [ $success -eq $total ]; then
                echo -e "${GREEN}✅ すべてのチェックに合格しました${NC}"
            else
                echo -e "${YELLOW}⚠️  一部のチェックで問題が検出されました${NC}"
            fi
        fi
        
        if [ "$SAVE_REPORT" = true ]; then
            echo ""
            save_report
        fi
    fi
}

# スクリプト実行
main "$@"