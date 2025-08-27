#!/bin/bash

# Template installer script
echo "🎨 Installing Invoice Templates"
echo "==============================="

# Base URL for API
BASE_URL="http://localhost:3000/api/v1"
ADMIN_AUTH="admin:supersecret"

# Function to install a template
install_template() {
    local name="$1"
    local file="$2"
    local is_default="$3"
    local highlight_color="$4"
    
    echo "Installing template: $name"
    
    if [ ! -f "$file" ]; then
        echo "❌ Template file not found: $file"
        return 1
    fi
    
    # Read the HTML content and escape it for JSON
    local html_content=$(cat "$file" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
    
    # Create the template via API
    local response=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/templates" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"html\": \"$html_content\",
            \"isDefault\": $is_default,
            \"highlightColor\": \"$highlight_color\"
        }")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Template installed successfully"
    else
        echo "❌ Failed to install template: $response"
    fi
}

# Install templates
install_template "Professional Modern" "/workspaces/Invio/backend/static/templates/professional-modern.html" false "#2563eb"
install_template "Minimalist Clean" "/workspaces/Invio/backend/static/templates/minimalist-clean.html" false "#059669"

echo ""
echo "🎨 Template installation completed!"
echo "💡 You can now select these templates when generating invoices."
