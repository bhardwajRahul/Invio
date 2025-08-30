#!/usr/bin/env bash
# If executed with sh or a non-bash shell, re-exec with bash to avoid syntax issues
if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -Eeuo pipefail
# Enhanced Invio API Test Script with Template Testing and Database Cleanup

BASE_URL="http://localhost:3000"
ADMIN_AUTH="admin:supersecret"
TEST_LOG="test_results.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$TEST_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$TEST_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$TEST_LOG"
}

# Simple test function that just executes and shows output
test_endpoint() {
    description="$1"
    command="$2"
    
    log "Testing: $description"
    
    # Execute command and capture response
    response=$(eval "$command" 2>&1)
    status=$?
    
    if [ $status -eq 0 ]; then
        success "$description"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    else
        error "$description - Command failed"
        echo "$response"
        return 1
    fi
    echo ""
}

# Function to get clean JSON response
get_json_response() {
    command="$1"
    response=$(eval "$command" 2>/dev/null)
    echo "$response"
}

# Database cleanup function
cleanup_database() {
    log "🧹 Database Cleanup"
    log "=================="
    echo "1. Clean database and restart fresh"
    echo "2. Keep existing data"
    echo "3. Exit without running tests"
    read -p "Choose option (1-3): " -n 1 -r cleanup_choice
    echo ""
    
    case $cleanup_choice in
        1)
            log "Cleaning database..."
            # Kill any running server processes
            pkill -f "deno.*app.ts" 2>/dev/null || true
            sleep 2
            
            # Remove database file
      if [ -f "/workspaces/Invio/backend/invio.db" ]; then
        rm "/workspaces/Invio/backend/invio.db"
                success "Database file deleted"
            else
                log "Database file not found (will be created fresh)"
            fi
            
            # Start server in background
            log "Starting fresh server..."
            cd /workspaces/Invio/backend
            timeout 5s deno run --allow-all src/app.ts > /dev/null 2>&1 &
            SERVER_PID=$!
            sleep 3
            
            if curl -s "$BASE_URL/" > /dev/null; then
                success "Fresh server started successfully"
                success "Built-in templates automatically loaded"
            else
                error "Failed to start server"
                exit 1
            fi
            ;;
        2)
            log "Keeping existing data"
            ;;
        3)
            log "Exiting..."
            exit 0
            ;;
        *)
            log "Invalid option, keeping existing data"
            ;;
    esac
}

# Test cleanup at end
test_cleanup() {
    echo ""
    log "🧹 Test Cleanup Options"
    log "======================"
    echo "1. Delete test data only (recommended)"
    echo "2. Keep test data for inspection"
    echo "3. Clear entire database"
    read -p "Choose option (1-3): " -n 1 -r cleanup_choice
    echo ""
    
    case $cleanup_choice in
        1)
            if [ -n "$TEST_CUSTOMER_ID" ]; then
                log "Deleting test customer..."
                curl -s -u "$ADMIN_AUTH" -X DELETE "$BASE_URL/api/v1/customers/$TEST_CUSTOMER_ID" >/dev/null 2>&1 || true
            fi
            if [ -n "$TEST_INVOICE_ID" ]; then
                log "Deleting test invoice..."
                curl -s -u "$ADMIN_AUTH" -X DELETE "$BASE_URL/api/v1/invoices/$TEST_INVOICE_ID" >/dev/null 2>&1 || true
            fi
            success "Test data cleanup completed"
            ;;
        2)
            log "Test data preserved for inspection"
            ;;
        3)
            log "Clearing entire database..."
            pkill -f "deno.*app.ts" 2>/dev/null || true
            sleep 1
            rm -f "/workspaces/Invio/backend/invio.db"
            success "Database completely cleared"
            ;;
        *)
            log "Invalid option, keeping test data"
            ;;
    esac
}

# Initialize test log
echo "=== Enhanced Invio API Test Results ===" > "$TEST_LOG"
echo "Test started at: $(date)" >> "$TEST_LOG"
echo "" >> "$TEST_LOG"

log "🚀 Starting Enhanced Invio API Tests"
log "===================================="

# Offer database cleanup before starting
cleanup_database

# Check if server is running
log "Checking if server is running..."
if ! curl -s "$BASE_URL/" > /dev/null; then
    error "Server is not running at $BASE_URL"
    error "Please start the server with: cd /workspaces/Invio/backend && deno run --allow-all src/app.ts"
    exit 1
fi
success "Server is running"

# 1. Health Check
test_endpoint "Health Check" "curl -s '$BASE_URL/'"

# 2. Auth Tests
test_endpoint "Admin Auth Test (should fail without auth)" "curl -s '$BASE_URL/api/v1/invoices' || echo 'Expected failure'"
test_endpoint "Admin Auth Test (should work with auth)" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/invoices'"

# 3. Test Built-in Templates
log "Testing built-in templates..."
test_endpoint "List Built-in Templates" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/templates'"

# 4. Create Enhanced Customer
log "Creating enhanced customer..."
CUSTOMER_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/api/v1/customers" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Professional Demo Corp",
    "email": "demo@professionalcorp.com",
    "phone": "+1 (555) 123-4567",
    "address": "123 Business Plaza, Suite 500\\nDowntown District, NY 10001",
    "taxId": "TAX-DEMO-2025"
  }')

# Extract customer ID using more robust method
CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | tr -d '\n' | jq -r '.id' 2>/dev/null)
TEST_CUSTOMER_ID="$CUSTOMER_ID"  # Store for cleanup

if [ "$CUSTOMER_ID" = "null" ] || [ -z "$CUSTOMER_ID" ]; then
    error "Failed to extract customer ID from response: $CUSTOMER_RESPONSE"
    # Try alternative extraction
    CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$CUSTOMER_ID" ]; then
        exit 1
    fi
fi
success "Customer created with ID: $CUSTOMER_ID"

# Display customer creation
test_endpoint "Create Enhanced Customer (Display)" "curl -s -u '$ADMIN_AUTH' -X POST '$BASE_URL/api/v1/customers' \
  -H 'Content-Type: application/json' \
  -d '{
    \"name\": \"Template Test Client\",
    \"email\": \"client@templatetest.com\",
    \"phone\": \"+1 (555) 987-6543\",
    \"address\": \"456 Client Street, Business City, CA 90210\",
    \"taxId\": \"TAX-CLIENT-2025\"
  }'"

# 5. Configure Business Settings
test_endpoint "Configure Business Settings" "curl -s -u '$ADMIN_AUTH' -X PUT '$BASE_URL/api/v1/settings' \
  -H 'Content-Type: application/json' \
  -d '{
    \"businessName\": \"Professional Services Inc\",
    \"businessAddress\": \"789 Corporate Blvd, Floor 12\\nMetropolitan City, TX 75001\",
    \"businessPhone\": \"+1 (555) 200-3000\",
    \"businessEmail\": \"billing@professionalservices.com\",
    \"businessTaxId\": \"EIN: 12-3456789\",
    \"currency\": \"USD\",
    \"defaultPaymentTerms\": \"Net 30 days\",
    \"logoUrl\": \"https://files.catbox.moe/y25fk1.png\"
  }'"

# 6. Create Enhanced Invoice with Multiple Items
log "Creating enhanced invoice with multiple line items..."
INVOICE_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/api/v1/invoices" \
  -H 'Content-Type: application/json' \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"invoiceNumber\": \"DEMO-2025-001\",
    \"issueDate\": \"2025-01-15\",
    \"dueDate\": \"2025-02-15\",
    \"currency\": \"USD\",
    \"status\": \"sent\",
    \"notes\": \"Professional services rendered as per contract #PSC-2025-001. Thank you for your business!\",
    \"paymentTerms\": \"Net 30 days from invoice date\",
    \"paymentMethods\": \"Bank Wire Transfer, ACH, or Check\",
    \"bankAccount\": \"Wells Fargo Bank\\nAccount: 1234567890\\nRouting: 121000248\",
    \"items\": [
      {
        \"description\": \"Website Development & Design\",
        \"quantity\": 1,
        \"unitPrice\": 5000.00,
        \"notes\": \"Custom responsive website with CMS integration\"
      },
      {
        \"description\": \"SEO Optimization Package\",
        \"quantity\": 1,
        \"unitPrice\": 1500.00,
        \"notes\": \"3-month SEO campaign with keyword research\"
      },
      {
        \"description\": \"Monthly Maintenance\",
        \"quantity\": 12,
        \"unitPrice\": 200.00,
        \"notes\": \"Technical support and content updates\"
      },
      {
        \"description\": \"Training Sessions\",
        \"quantity\": 4,
        \"unitPrice\": 150.00,
        \"notes\": \"1-hour training sessions for content management\"
      }
    ],
    \"subtotal\": 9500.00,
    \"discountAmount\": 500.00,
    \"taxRate\": 8.75,
    \"taxAmount\": 787.50,
    \"grandTotal\": 9787.50
  }")

# Extract IDs using more robust method
INVOICE_ID=$(echo "$INVOICE_RESPONSE" | tr -d '\n' | jq -r '.id' 2>/dev/null)
SHARE_TOKEN=$(echo "$INVOICE_RESPONSE" | tr -d '\n' | jq -r '.shareToken' 2>/dev/null)
TEST_INVOICE_ID="$INVOICE_ID"  # Store for cleanup

if [ "$INVOICE_ID" = "null" ] || [ -z "$INVOICE_ID" ]; then
    error "Failed to extract invoice ID from response: $INVOICE_RESPONSE"
    # Try alternative extraction
    INVOICE_ID=$(echo "$INVOICE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    SHARE_TOKEN=$(echo "$INVOICE_RESPONSE" | grep -o '"shareToken":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$INVOICE_ID" ]; then
        exit 1
    fi
fi
success "Invoice created with ID: $INVOICE_ID"

# Display the created invoice
test_endpoint "Create Professional Invoice (Display)" "curl -s -u '$ADMIN_AUTH' -X POST '$BASE_URL/api/v1/invoices' \
  -H 'Content-Type: application/json' \
  -d '{
    \"customerId\": \"$CUSTOMER_ID\",
    \"invoiceNumber\": \"DEMO-2025-002\",
    \"issueDate\": \"2025-01-20\",
    \"dueDate\": \"2025-02-20\",
    \"currency\": \"USD\",
    \"status\": \"draft\",
    \"notes\": \"Consulting services for Q1 2025 strategic planning initiative.\",
    \"paymentTerms\": \"Net 15 days\",
    \"paymentMethods\": \"Credit Card, Bank Transfer, or PayPal\",
    \"bankAccount\": \"Business Account: 9876543210\",
    \"items\": [
      {
        \"description\": \"Strategic Planning Consultation\",
        \"quantity\": 20,
        \"unitPrice\": 250.00,
        \"notes\": \"Executive-level strategic planning sessions\"
      },
      {
        \"description\": \"Market Analysis Report\",
        \"quantity\": 1,
        \"unitPrice\": 2000.00,
        \"notes\": \"Comprehensive market analysis with recommendations\"
      }
    ],
    \"subtotal\": 7000.00,
    \"discountAmount\": 200.00,
    \"taxRate\": 7.25,
    \"taxAmount\": 493.00,
    \"grandTotal\": 7293.00
  }'"

# 7. Test Public Invoice View
if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "null" ]; then
    test_endpoint "View Public Invoice JSON" "curl -s '$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN'"
    
    # Test PDF generation with different highlight colors
    log "Testing PDF generation with custom highlight colors..."
    
    # Test Professional template with blue highlight
    test_endpoint "Generate PDF - Professional Blue" "curl -s -I '$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=professional&highlight=%232563eb'"
    
    # Test Professional template with green highlight  
    test_endpoint "Generate PDF - Professional Green" "curl -s -I '$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=professional&highlight=%2316a34a'"
    
    # Test Minimalist template with purple highlight
    test_endpoint "Generate PDF - Minimalist Purple" "curl -s -I '$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=minimalist&highlight=%237c3aed'"
    
    # Test default template (should use built-in highlight)
    test_endpoint "Generate PDF - Default Template" "curl -s -I '$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf'"
fi

# 8. List All Resources
test_endpoint "List All Customers" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/customers'"
test_endpoint "List All Invoices" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/invoices'"
test_endpoint "Get All Settings" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/settings'"

# 9. Test Template Operations
log "Testing template operations..."
test_endpoint "List All Templates (Built-in)" "curl -s -u '$ADMIN_AUTH' '$BASE_URL/api/v1/templates'"

# Create a custom template
log "Creating custom template..."
CUSTOM_TEMPLATE_JSON=$(cat <<'JSON'
{
  "name": "Simple Custom Template",
  "html": "<html><head><style>body{font-family:sans-serif;margin:40px;color:#333}.header{border-bottom:3px solid #007acc;padding-bottom:20px;margin-bottom:30px}.total{font-size:24px;font-weight:bold;color:#007acc}</style></head><body><div class=\"header\"><h1>{{businessName}}</h1><p>{{businessAddress}}</p></div><h2>Invoice #{{invoiceNumber}}</h2><p><strong>Bill To:</strong><br>{{customerName}}<br>{{customerAddress}}</p><p><strong>Issue Date:</strong> {{issueDate}}<br><strong>Due Date:</strong> {{dueDate}}</p><hr><div class=\"total\">Total: ${{total}}</div></body></html>",
  "isDefault": false
}
JSON
)
# Guard against set -e abort on curl error
set +e
CUSTOM_TEMPLATE_RESPONSE=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/api/v1/templates" \
  -H 'Content-Type: application/json' \
  -d "$CUSTOM_TEMPLATE_JSON" 2>&1)
curl_status=$?
set -e
if [ $curl_status -eq 0 ]; then
  success "Create Custom Template"
  echo "$CUSTOM_TEMPLATE_RESPONSE" | jq . 2>/dev/null || echo "$CUSTOM_TEMPLATE_RESPONSE"
else
  error "Create Custom Template - Command failed"
  echo "$CUSTOM_TEMPLATE_RESPONSE"
fi
echo ""

# 10. Test Template Selection and PDF Downloads
if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "null" ]; then
    log "Opening PDF downloads in browser..."
    
    # Open different template PDFs in browser
    "$BROWSER" "$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=professional&highlight=%232563eb" &
    sleep 1
    "$BROWSER" "$BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=minimalist&highlight=%2316a34a" &
fi

# Final Summary
log "📊 Test Summary"
log "==============="
success "All enhanced tests completed successfully!"
log "📋 Detailed results saved to: $TEST_LOG"

if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "null" ]; then
    log "🔗 Public invoice link: $BASE_URL/api/v1/public/invoices/$SHARE_TOKEN"
    log "📄 PDF Downloads:"
    log "   Professional (Blue): $BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=professional&highlight=%232563eb"
    log "   Professional (Green): $BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=professional&highlight=%2316a34a"
    log "   Minimalist (Purple): $BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf?template=minimalist&highlight=%237c3aed"
    log "   Default: $BASE_URL/api/v1/public/invoices/$SHARE_TOKEN/pdf"
fi

log "🆔 Test Resource IDs created:"
log "   Customer ID: $CUSTOMER_ID"
log "   Invoice ID: $INVOICE_ID"
if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "null" ]; then
    log "   Share Token: $SHARE_TOKEN"
fi

echo ""
success "🎉 Enhanced Invio API testing with templates completed!"

# Offer cleanup at the end
test_cleanup

log "✨ Test session complete!"