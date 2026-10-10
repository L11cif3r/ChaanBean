$b = "http://localhost:3000"
$h = @{ "Content-Type" = "application/json" }
function post($p, $o) { Invoke-RestMethod -Method Post -Uri "$b$p" -Headers $h -Body ($o | ConvertTo-Json) }
function patch($p, $o) { Invoke-RestMethod -Method Patch -Uri "$b$p" -Headers $h -Body ($o | ConvertTo-Json) }

$rows = @(
  @{ n = "Sharma Textiles";   p = "9876543210"; a = 1250000;  d = "2026-08-20" },
  @{ n = "Patel Hardware";    p = "9812345675"; a = 4875050;  d = "2026-09-05" },
  @{ n = "Gupta Foods";       p = "9898989897"; a = 320000;   d = "2026-09-28" }
)
foreach ($r in $rows) {
  $c = (post "/api/collect/cases" @{ debtor_name = $r.n; debtor_phone = $r.p; amount_due_paise = $r.a; due_date = $r.d; language = "en" }).case
  post "/api/collect/cases/$($c.id)/actions" @{ action = "CONFIRM_CONTACT_AUTHORITY" } | Out-Null
  post "/api/collect/cases/$($c.id)/automation" @{ frequency = "DAILY"; max_attempts = 3 } | Out-Null
  "$($r.n) -> $($c.id)"
}
