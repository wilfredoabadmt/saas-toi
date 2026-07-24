# Fix backgroundcolor -> backgroundColor casing issue using .NET methods
$srcDir = "d:\Documentos\GitHub\saas-toi\src"
$files = Get-ChildItem -Path $srcDir -Recurse -Filter "*.tsx"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Case-sensitive replace: lowercase 'backgroundcolor' -> 'backgroundColor'
    $content = $content.Replace('backgroundcolor', 'backgroundColor')
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Fixed casing in: $($file.Name)"
    }
}

Write-Host "Done!"
