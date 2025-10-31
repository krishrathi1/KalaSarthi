# PowerShell script to remove TTS/STT features

Write-Host "🗑️  Removing TTS/STT Features..." -ForegroundColor Yellow

# Phase 1: Delete Voice API Routes
Write-Host "`n📁 Phase 1: Deleting Voice API Routes..." -ForegroundColor Cyan
$apiDirs = @(
    "src/app/api/speech-to-text",
    "src/app/api/text-to-speech",
    "src/app/api/google-cloud-stt",
    "src/app/api/google-cloud-tts",
    "src/app/api/tts",
    "src/app/api/voice-command",
    "src/app/api/voice-enrollment",
    "src/app/api/voices"
)

foreach ($dir in $apiDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "  ✅ Deleted: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Skipped (not found): $dir" -ForegroundColor Gray
    }
}

# Phase 2: Delete Voice Services
Write-Host "`n📁 Phase 2: Deleting Voice Services..." -ForegroundColor Cyan
$serviceFiles = @(
    "src/lib/services/STTProcessor.ts",
    "src/lib/services/TTSProcessor.ts",
    "src/lib/service/ConversationalVoiceProcessor.ts",
    "src/lib/service/IntelligentVoiceAssistant.ts"
)

foreach ($file in $serviceFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "  ✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Skipped (not found): $file" -ForegroundColor Gray
    }
}

# Phase 3: Delete Voice Pages
Write-Host "`n📁 Phase 3: Deleting Voice Pages..." -ForegroundColor Cyan
$pageDirs = @(
    "src/app/voice-demo",
    "src/app/voice-assistant-demo",
    "src/app/voice-enrollment",
    "src/app/voice-example",
    "src/app/test-audio"
)

foreach ($dir in $pageDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "  ✅ Deleted: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Skipped (not found): $dir" -ForegroundColor Gray
    }
}

# Phase 4: Delete Voice Components
Write-Host "`n📁 Phase 4: Deleting Voice Components..." -ForegroundColor Cyan
if (Test-Path "src/components/voice") {
    Remove-Item -Path "src/components/voice" -Recurse -Force
    Write-Host "  ✅ Deleted: src/components/voice" -ForegroundColor Green
} else {
    Write-Host "  ⏭️  Skipped (not found): src/components/voice" -ForegroundColor Gray
}

# Phase 5: Delete Voice Documentation
Write-Host "`n📁 Phase 5: Deleting Voice Documentation..." -ForegroundColor Cyan
$docFiles = @(
    "docs/voice-assistant-workflow.md",
    "multilingual_tts.ts"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "  ✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Skipped (not found): $file" -ForegroundColor Gray
    }
}

Write-Host "`n✅ Voice feature deletion complete!" -ForegroundColor Green
Write-Host "`n⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update src/app/enhanced-chat/page.tsx (remove voice UI)" -ForegroundColor White
Write-Host "  2. Update src/components/header.tsx (remove voice nav)" -ForegroundColor White
Write-Host "  3. Update src/components/sidebar-nav.tsx (remove voice menu)" -ForegroundColor White
Write-Host "  4. Update src/lib/i18n.ts (remove voice translations)" -ForegroundColor White
Write-Host "  5. Update .env (remove MURF_API_KEY, MURF_API_URL)" -ForegroundColor White
Write-Host "  6. Run npm run build to verify" -ForegroundColor White
