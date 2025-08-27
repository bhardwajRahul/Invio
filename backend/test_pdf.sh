#!/bin/bash

# Test PDF generation with complete invoice data
echo "Testing PDF generation with complete invoice data..."

# Create a customer first
CUSTOMER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company Inc",
    "email": "contact@testcompany.com",
    "address": "123 Business Street",
    "city": "San Francisco",
    "postalCode": "94105",
    "country": "United States",
    "vatNumber": "US123456789"
  }')

CUSTOMER_ID=$(echo $CUSTOMER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created customer with ID: $CUSTOMER_ID"

# Create business settings
curl -s -X POST http://localhost:3000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "My Invoice Company",
    "companyAddress": "456 Invoice Lane, Business City, 12345",
    "companyEmail": "billing@mycompany.com",
    "companyPhone": "+1-555-123-4567",
    "companyTaxId": "TAX123456",
    "currency": "USD",
    "paymentMethods": "Bank Transfer, Credit Card",
    "bankAccount": "Account: 123-456-789, Routing: 987-654-321",
    "paymentTerms": "Net 30 days",
    "defaultNotes": "Thank you for your business!"
  }' > /dev/null

echo "Created business settings"

# Create an invoice with multiple items
INVOICE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"issueDate\": \"2025-08-26\",
    \"dueDate\": \"2025-09-25\",
    \"currency\": \"USD\",
    \"discountPercentage\": 10,
    \"taxRate\": 8.5,
    \"paymentTerms\": \"Net 30 days\",
    \"notes\": \"Please remit payment within 30 days. Thank you for your business!\",
    \"items\": [
      {
        \"itemCode\": \"WEB-001\",
        \"description\": \"Website Development\",
        \"quantity\": 1,
        \"unitPrice\": 2500.00,
        \"notes\": \"Custom responsive website\"
      },
      {
        \"itemCode\": \"HOST-001\",
        \"description\": \"Web Hosting (12 months)\",
        \"quantity\": 12,
        \"unitPrice\": 25.00,
        \"notes\": \"Monthly hosting service\"
      },
      {
        \"itemCode\": \"MAINT-001\",
        \"description\": \"Maintenance & Support\",
        \"quantity\": 3,
        \"unitPrice\": 150.00,
        \"notes\": \"Quarterly maintenance\"
      }
    ]
  }")

INVOICE_ID=$(echo $INVOICE_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
SHARE_TOKEN=$(echo $INVOICE_RESPONSE | grep -o '"shareToken":"[^"]*"' | cut -d'"' -f4)

echo "Created invoice with ID: $INVOICE_ID"
echo "Share token: $SHARE_TOKEN"

# Test the public invoice endpoint
echo "Testing public invoice access..."
PUBLIC_RESPONSE=$(curl -s http://localhost:3000/api/v1/public/invoices/$SHARE_TOKEN)
echo "Public invoice response: $PUBLIC_RESPONSE" | head -c 200
echo "..."

# Download the PDF
echo "Downloading PDF..."
curl -s http://localhost:3000/api/v1/public/invoices/$SHARE_TOKEN/pdf \
  -o "test_invoice.pdf"

if [ -f "test_invoice.pdf" ]; then
  FILE_SIZE=$(wc -c < "test_invoice.pdf")
  echo "PDF downloaded successfully! Size: $FILE_SIZE bytes"
  
  # Check if it's a valid PDF (starts with %PDF)
  if head -c 4 "test_invoice.pdf" | grep -q "%PDF"; then
    echo "✅ PDF file is valid!"
  else
    echo "❌ Downloaded file is not a valid PDF"
    head -c 100 "test_invoice.pdf"
  fi
else
  echo "❌ PDF download failed"
fi

echo "Test completed!"
