#!/bin/bash

# Template testing script
echo "🎨 Testing Invoice Templates"
echo "============================"

BASE_URL="http://localhost:3000/api/v1"
ADMIN_AUTH="admin:supersecret"

# Function to test template preview
test_template_preview() {
    local template_id="$1"
    local template_name="$2"
    local highlight_color="$3"
    
    echo "Testing template preview: $template_name"
    
    local response=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/templates/$template_id/preview" \
        -H "Content-Type: application/json" \
        -d "{
            \"highlightColor\": \"$highlight_color\",
            \"highlightColorLight\": \"${highlight_color}20\"
        }")
    
    if echo "$response" | grep -q "DOCTYPE html"; then
        echo "✅ Template preview generated successfully"
        # Save preview to file for inspection
        echo "$response" > "preview_${template_name// /_}.html"
        echo "💾 Preview saved as preview_${template_name// /_}.html"
    else
        echo "❌ Failed to generate template preview"
        echo "Response: $response"
    fi
}

# Function to create template from file
create_template_from_file() {
    local name="$1"
    local file_path="$2"
    local highlight_color="$3"
    
    echo "Creating template from file: $name"
    
    local response=$(curl -s -u "$ADMIN_AUTH" -X POST "$BASE_URL/templates/load-from-file" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"filePath\": \"$file_path\",
            \"isDefault\": false,
            \"highlightColor\": \"$highlight_color\"
        }")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✅ Template created successfully"
        local template_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "📝 Template ID: $template_id"
        
        # Test the template preview
        test_template_preview "$template_id" "$name" "$highlight_color"
    else
        echo "❌ Failed to create template"
        echo "Response: $response"
    fi
}

echo "📋 Listing existing templates..."
curl -s -u "$ADMIN_AUTH" "$BASE_URL/templates" | head -c 200
echo ""
echo ""

echo "🆕 Creating templates from files..."
create_template_from_file "Professional Modern Blue" "/workspaces/Invio/backend/static/templates/professional-modern.html" "#2563eb"
echo ""
create_template_from_file "Minimalist Clean Green" "/workspaces/Invio/backend/static/templates/minimalist-clean.html" "#059669"
echo ""

echo "🎨 Testing custom highlight colors..."
echo "Creating Professional template with purple theme..."
create_template_from_file "Professional Purple" "/workspaces/Invio/backend/static/templates/professional-modern.html" "#7c3aed"
echo ""

echo "Creating Minimalist template with red theme..."
create_template_from_file "Minimalist Red" "/workspaces/Invio/backend/static/templates/minimalist-clean.html" "#dc2626"
echo ""

echo "✨ Template testing completed!"
echo "💡 Check the generated preview_*.html files in your current directory"
echo "💡 You can open them in a browser to see how the templates look"
