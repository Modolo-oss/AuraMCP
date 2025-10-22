# Test Railway Deployment Script
# Usage: .\test-railway-deployment.ps1 -RailwayUrl "https://your-app.up.railway.app"

param(
    [Parameter(Mandatory=$true)]
    [string]$RailwayUrl
)

Write-Host "🚀 Testing Railway Deployment: $RailwayUrl" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$RailwayUrl/api/health" -Method GET
    if ($healthResponse.success -eq $true) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Status: $($healthResponse.data.status)" -ForegroundColor Cyan
        Write-Host "   Uptime: $($healthResponse.data.uptime) seconds" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Health check failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: MCP Tools List
Write-Host "2️⃣ Testing MCP Tools Endpoint..." -ForegroundColor Yellow
try {
    $mcpBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "tools/list"
    } | ConvertTo-Json

    $mcpResponse = Invoke-RestMethod -Uri "$RailwayUrl/mcp" -Method POST -Body $mcpBody -ContentType "application/json"
    
    if ($mcpResponse.result -and $mcpResponse.result.tools) {
        $toolCount = $mcpResponse.result.tools.Count
        Write-Host "✅ MCP endpoint working!" -ForegroundColor Green
        Write-Host "   Found $toolCount tools" -ForegroundColor Cyan
        
        # List some tools
        Write-Host "   Sample tools:" -ForegroundColor Cyan
        $mcpResponse.result.tools[0..4] | ForEach-Object {
            Write-Host "   - $($_.name): $($_.description)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ MCP endpoint failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ MCP endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Web Interfaces
Write-Host "3️⃣ Testing Web Interfaces..." -ForegroundColor Yellow

# Landing Page
try {
    $landingResponse = Invoke-WebRequest -Uri "$RailwayUrl/" -Method GET
    if ($landingResponse.StatusCode -eq 200) {
        Write-Host "✅ Landing page accessible!" -ForegroundColor Green
    } else {
        Write-Host "❌ Landing page failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Landing page error: $($_.Exception.Message)" -ForegroundColor Red
}

# Chat Interface
try {
    $chatResponse = Invoke-WebRequest -Uri "$RailwayUrl/chat" -Method GET
    if ($chatResponse.StatusCode -eq 200) {
        Write-Host "✅ Chat interface accessible!" -ForegroundColor Green
    } else {
        Write-Host "❌ Chat interface failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Chat interface error: $($_.Exception.Message)" -ForegroundColor Red
}

# Swap Interface
try {
    $swapResponse = Invoke-WebRequest -Uri "$RailwayUrl/swap" -Method GET
    if ($swapResponse.StatusCode -eq 200) {
        Write-Host "✅ Swap interface accessible!" -ForegroundColor Green
    } else {
        Write-Host "❌ Swap interface failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Swap interface error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Portfolio API (with sample address)
Write-Host "4️⃣ Testing Portfolio API..." -ForegroundColor Yellow
try {
    $portfolioBody = @{
        address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    } | ConvertTo-Json

    $portfolioResponse = Invoke-RestMethod -Uri "$RailwayUrl/api/portfolio/balance" -Method POST -Body $portfolioBody -ContentType "application/json"
    
    if ($portfolioResponse.success -eq $true) {
        Write-Host "✅ Portfolio API working!" -ForegroundColor Green
        Write-Host "   Sample address balance retrieved" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Portfolio API failed!" -ForegroundColor Red
        Write-Host "   Error: $($portfolioResponse.error.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Portfolio API error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "🎯 DEPLOYMENT SUMMARY" -ForegroundColor Magenta
Write-Host "====================" -ForegroundColor Magenta
Write-Host "Railway URL: $RailwayUrl" -ForegroundColor White
Write-Host ""
Write-Host "📱 Available Interfaces:" -ForegroundColor Cyan
Write-Host "   • Landing Page: $RailwayUrl/" -ForegroundColor White
Write-Host "   • Chat Interface: $RailwayUrl/chat" -ForegroundColor White
Write-Host "   • Swap Interface: $RailwayUrl/swap" -ForegroundColor White
Write-Host ""
Write-Host "🔧 API Endpoints:" -ForegroundColor Cyan
Write-Host "   • Health Check: $RailwayUrl/api/health" -ForegroundColor White
Write-Host "   • MCP Server: $RailwayUrl/mcp" -ForegroundColor White
Write-Host "   • Portfolio API: $RailwayUrl/api/portfolio/balance" -ForegroundColor White
Write-Host ""
Write-Host "✅ Deployment test completed!" -ForegroundColor Green
