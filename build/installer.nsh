; Custom NSIS Installer Script for Vidmix v2

; Mengubah teks "Nullsoft Install System..." di bagian bawah menjadi teks promosi Anda
BrandingText "Vidmix v2 | Portofolio: ferdy.web.id | IG: @ferdy"

!macro customHeader
  !define MUI_FINISHPAGE_LINK "Kunjungi Portofolio & Instagram Ferdy"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://ferdy.web.id"
!macroend

!macro customInstall
  ; Opsional: script yang dijalankan setelah file di-copy
!macroend
