# Accessible Backrooms: uploads the App Store screenshots and the Portuguese store page
# through the App Store Connect API. Runs on your own computer; your key never leaves it.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundleId = 'com.accessible.backrooms'
$Api = 'https://api.appstoreconnect.apple.com'

function Say($t) { Write-Host $t }
function Stop-With($t) { Say ''; Say "PROBLEM: $t"; Say 'Nothing else was changed. You can run this again after fixing it.'; exit 1 }

# ---------- the key ----------
$p8 = Get-ChildItem -Path $Here -Filter 'AuthKey_*.p8' | Select-Object -First 1
if (-not $p8) { Stop-With 'I could not find your key file. Put the file that starts with AuthKey_ and ends with .p8 in this same folder.' }
$KeyId = $p8.BaseName -replace '^AuthKey_', ''
Say "Found your key file. Key ID: $KeyId"
Say ''
Say 'Paste your Issuer ID and press Enter.'
Say 'It is on App Store Connect, Users and Access, Integrations, App Store Connect API, near the top.'
$IssuerId = (Read-Host 'Issuer ID').Trim()
if ($IssuerId -notmatch '^[0-9a-fA-F-]{36}$') { Stop-With 'That does not look like an Issuer ID. It has 36 characters with dashes, like 69a6de70-1234-...' }

$pem = Get-Content -Raw -Path $p8.FullName
$b64 = ($pem -replace '-----[^-]+-----', '' -replace '\s', '')
$keyBytes = [Convert]::FromBase64String($b64)
try {
  $cng = [System.Security.Cryptography.CngKey]::Import($keyBytes, [System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
  $ecdsa = New-Object System.Security.Cryptography.ECDsaCng($cng)
} catch {
  $ecdsa = [System.Security.Cryptography.ECDsa]::Create()
  $read = 0; $ecdsa.ImportPkcs8PrivateKey($keyBytes, [ref]$read)
}

function B64Url([byte[]]$b) { [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_') }
function New-Token {
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $h = '{"alg":"ES256","kid":"' + $KeyId + '","typ":"JWT"}'
  $p = '{"iss":"' + $IssuerId + '","iat":' + $now + ',"exp":' + ($now + 1100) + ',"aud":"appstoreconnect-v1"}'
  $unsigned = (B64Url ([Text.Encoding]::UTF8.GetBytes($h))) + '.' + (B64Url ([Text.Encoding]::UTF8.GetBytes($p)))
  $sig = $ecdsa.SignData([Text.Encoding]::UTF8.GetBytes($unsigned), [System.Security.Cryptography.HashAlgorithmName]::SHA256)
  return $unsigned + '.' + (B64Url $sig)
}
$script:Token = New-Token
$script:TokenTime = Get-Date

function Call($Method, $Path, $Body) {
  if (((Get-Date) - $script:TokenTime).TotalMinutes -gt 15) { $script:Token = New-Token; $script:TokenTime = Get-Date }
  $url = if ($Path.StartsWith('http')) { $Path } else { $Api + $Path }
  $req = @{ Method = $Method; Uri = $url; Headers = @{ Authorization = "Bearer $($script:Token)" } }
  if ($Body) { $req.ContentType = 'application/json; charset=utf-8'; $req.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10)) }
  try { return Invoke-RestMethod @req }
  catch {
    $msg = $_.Exception.Message
    try { $r = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $msg = $r.ReadToEnd() } catch {}
    throw "Apple said: $msg"
  }
}

# ---------- find the app and the 1.0 version ----------
Say ''
Say 'Connecting to App Store Connect...'
try { $apps = Call GET "/v1/apps?filter[bundleId]=$BundleId" } catch { Stop-With "$_ . Check the Issuer ID, and that the key file is the one you downloaded for Codemagic." }
if (-not $apps.data) { Stop-With "No app with bundle ID $BundleId was found on this account." }
$AppId = $apps.data[0].id
Say "Found Accessible Backrooms."

$versions = Call GET "/v1/apps/$AppId/appStoreVersions?filter[platform]=IOS&limit=20"
$editable = 'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'WAITING_FOR_REVIEW'
$ver = $versions.data | Where-Object { $editable -contains $_.attributes.appStoreState -or $editable -contains $_.attributes.appVersionState } | Select-Object -First 1
if (-not $ver) { Stop-With 'I could not find a version that is waiting to be filled in (Prepare for Submission).' }
$VersionId = $ver.id
Say "Found version $($ver.attributes.versionString)."

$texts = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $Here 'store-text.json') | ConvertFrom-Json

# ---------- Portuguese store page ----------
function Ensure-VersionLocalization($Locale, $T) {
  $locs = Call GET "/v1/appStoreVersions/$VersionId/appStoreVersionLocalizations"
  $loc = $locs.data | Where-Object { $_.attributes.locale -eq $Locale } | Select-Object -First 1
  $attrs = @{ description = $T.description; keywords = $T.keywords; promotionalText = $T.promo; supportUrl = $T.supportUrl; marketingUrl = $T.marketingUrl }
  if ($loc) {
    if ($Locale -ne 'en-US') { Call PATCH "/v1/appStoreVersionLocalizations/$($loc.id)" @{ data = @{ type = 'appStoreVersionLocalizations'; id = $loc.id; attributes = $attrs } } | Out-Null; Say "Updated the $Locale text." }
    return $loc.id
  }
  $attrs.locale = $Locale
  $new = Call POST '/v1/appStoreVersionLocalizations' @{ data = @{ type = 'appStoreVersionLocalizations'; attributes = $attrs; relationships = @{ appStoreVersion = @{ data = @{ type = 'appStoreVersions'; id = $VersionId } } } } }
  Say "Added the $Locale store page text."
  return $new.data.id
}
function Ensure-AppInfoLocalization($Locale, $T) {
  try {
    $infos = Call GET "/v1/apps/$AppId/appInfos"
    $info = $infos.data | Where-Object { $_.attributes.appStoreState -ne 'READY_FOR_SALE' -and $_.attributes.state -ne 'READY_FOR_DISTRIBUTION' } | Select-Object -First 1
    if (-not $info) { $info = $infos.data[0] }
    $ls = Call GET "/v1/appInfos/$($info.id)/appInfoLocalizations"
    $l = $ls.data | Where-Object { $_.attributes.locale -eq $Locale } | Select-Object -First 1
    $attrs = @{ name = $T.name; subtitle = $T.subtitle; privacyPolicyUrl = $T.privacyUrl }
    if ($l) { Call PATCH "/v1/appInfoLocalizations/$($l.id)" @{ data = @{ type = 'appInfoLocalizations'; id = $l.id; attributes = $attrs } } | Out-Null }
    else { $attrs.locale = $Locale; Call POST '/v1/appInfoLocalizations' @{ data = @{ type = 'appInfoLocalizations'; attributes = $attrs; relationships = @{ appInfo = @{ data = @{ type = 'appInfos'; id = $info.id } } } } } | Out-Null }
    Say "Set the $Locale name and subtitle: $($T.name)."
  } catch { Say "Note: could not set the $Locale name and subtitle ($_). You can type them on the website later." }
}

Say ''
Say 'Setting up the Portuguese (Brazil) page...'
Ensure-AppInfoLocalization 'pt-BR' $texts.pt
$Loc = @{ 'en-US' = (Ensure-VersionLocalization 'en-US' $texts.en); 'pt-BR' = (Ensure-VersionLocalization 'pt-BR' $texts.pt) }

# ---------- screenshots ----------
function Upload-Set($LocId, $Types, $Folder, $Label) {
  $files = Get-ChildItem -Path (Join-Path $Here $Folder) -Filter '*.png' | Sort-Object Name
  if (-not $files) { Say "No screenshots found in $Folder, skipping."; return }
  $sets = Call GET "/v1/appStoreVersionLocalizations/$LocId/appScreenshotSets"
  $set = $null
  foreach ($t in $Types) {
    $set = $sets.data | Where-Object { $_.attributes.screenshotDisplayType -eq $t } | Select-Object -First 1
    if ($set) { break }
  }
  if (-not $set) {
    foreach ($t in $Types) {
      try { $set = (Call POST '/v1/appScreenshotSets' @{ data = @{ type = 'appScreenshotSets'; attributes = @{ screenshotDisplayType = $t }; relationships = @{ appStoreVersionLocalization = @{ data = @{ type = 'appStoreVersionLocalizations'; id = $LocId } } } } }).data; break } catch { $set = $null }
    }
  }
  if (-not $set) { Say "Could not create the $Label screenshot slot."; return }
  $old = Call GET "/v1/appScreenshotSets/$($set.id)/appScreenshots"
  foreach ($o in $old.data) { Call DELETE "/v1/appScreenshots/$($o.id)" | Out-Null }
  $n = 0
  foreach ($f in $files) {
    $n++
    $bytes = [IO.File]::ReadAllBytes($f.FullName)
    $shot = (Call POST '/v1/appScreenshots' @{ data = @{ type = 'appScreenshots'; attributes = @{ fileName = $f.Name; fileSize = $bytes.Length }; relationships = @{ appScreenshotSet = @{ data = @{ type = 'appScreenshotSets'; id = $set.id } } } } }).data
    foreach ($op in $shot.attributes.uploadOperations) {
      $chunk = New-Object byte[] $op.length
      [Array]::Copy($bytes, $op.offset, $chunk, 0, $op.length)
      $h = @{}; $ct = 'image/png'
      foreach ($rh in $op.requestHeaders) { if ($rh.name -eq 'Content-Type') { $ct = $rh.value } else { $h[$rh.name] = $rh.value } }
      Invoke-WebRequest -Method $op.method -Uri $op.url -Headers $h -ContentType $ct -Body $chunk -UseBasicParsing | Out-Null
    }
    $md5 = -join ([Security.Cryptography.MD5]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })
    Call PATCH "/v1/appScreenshots/$($shot.id)" @{ data = @{ type = 'appScreenshots'; id = $shot.id; attributes = @{ uploaded = $true; sourceFileChecksum = $md5 } } } | Out-Null
    Say "  $Label $n of $($files.Count) uploaded."
  }
}

Say ''
Say 'Uploading screenshots. This takes a few minutes...'
$iphone = @('APP_IPHONE_67', 'APP_IPHONE_69')
$ipad = @('APP_IPAD_PRO_3GEN_129', 'APP_IPAD_PRO_129')
Upload-Set $Loc['en-US'] $iphone 'screenshots\iphone-english' 'English iPhone'
Upload-Set $Loc['en-US'] $ipad 'screenshots\ipad-english' 'English iPad'
Upload-Set $Loc['pt-BR'] $iphone 'screenshots\iphone-portuguese' 'Portuguese iPhone'
Upload-Set $Loc['pt-BR'] $ipad 'screenshots\ipad-portuguese' 'Portuguese iPad'

Say ''
Say 'ALL DONE! Open App Store Connect and refresh the page. Your screenshots and the Portuguese page are there.'
Say 'Apple may take a minute to finish processing the pictures.'
