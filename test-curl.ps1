# AURA MCP Server - PowerShell Test Script
# Run this in PowerShell: .\test-curl.ps1

$baseUrl = "http://localhost:3000"
$testWallet = "0x69bfD720Dd188B8BB04C4b4D24442D3c15576D10"

Write-Host "🚀 Testing AURA MCP Server Locally..." -ForegroundColor Green
Write-Host "📡 Server URL: $baseUrl" -ForegroundColor Cyan
Write-Host "💰 Test Wallet: $testWallet" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "🧪 Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health Check - SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White
} catch {
    Write-Host "❌ Health Check - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Portfolio Balance
Write-Host "🧪 Test 2: Portfolio Balance" -ForegroundColor Yellow
try {
    $body = @{
        address = $testWallet
        chain = "ethereum"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/portfolio/balance" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Portfolio Balance - SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White
} catch {
    Write-Host "❌ Portfolio Balance - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: DCA Strategy Proposal
Write-Host "🧪 Test 3: DCA Strategy Proposal" -ForegroundColor Yellow
try {
    $body = @{
        intent = "dca_event_aware"
        params = @{
            asset = "ETH"
            budgetUsd = 200
            cadence = "2x/week"
            eventRules = @{
                pauseOnUnlock = $true
                maxGasGwei = 25
                boostOnDrawdownPct = 3
            }
        }
        address = $testWallet
    } | ConvertTo-Json -Depth 4
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/strategy/propose" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ DCA Strategy - SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White
} catch {
    Write-Host "❌ DCA Strategy - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Transaction Simulation
Write-Host "🧪 Test 4: Transaction Simulation" -ForegroundColor Yellow
try {
    $body = @{
        intentId = "test-intent-123"
        txParams = @{
            to = "0x1234567890123456789012345678901234567890"
            value = "100000000000000000"  # 0.1 ETH
            gasLimit = "150000"
            gasPrice = "20000000000"      # 20 gwei
        }
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/transaction/simulate" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Transaction Simulation - SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor White
} catch {
    Write-Host "❌ Transaction Simulation - ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎉 Local testing completed!" -ForegroundColor Green
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Make sure server is running: npm run dev" -ForegroundColor White
Write-Host "   - Check server logs for detailed information" -ForegroundColor White
Write-Host "   - Open test-browser.html for interactive testing" -ForegroundColor White
