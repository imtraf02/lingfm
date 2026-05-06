# nix/package.nix — Build derivation cho LingFM (Tauri v2 app)
{
  lib,
  pkgs,
  fetchPnpmDeps,
  pnpmConfigHook,
  # self là flake self-reference (chỉ có khi gọi từ flake.nix).
  # Khi gọi từ NixOS/HM module, self = null và src fallback về cleanSource.
  self ? null,
  ...
}:

let
  # -----------------------------------------------------------------------
  # Metadata
  # -----------------------------------------------------------------------
  pname   = "lingfm";
  version = "0.1.0";
  # Nếu được gọi từ flake.nix thì dùng flake self (bao gồm cả flake.lock),
  # nếu không (HM/NixOS module) thì dùng cleanSource để bỏ .git.
  src = if self != null then self else lib.cleanSource ./..;

  # -----------------------------------------------------------------------
  # Frontend dependencies — dùng fetchPnpmDeps (top-level, không deprecated)
  # Đây là fixed-output derivation, có network access + SSL certs đúng.
  #
  # Lần đầu build sẽ báo lỗi hash mismatch kiểu:
  #   specified: sha256-AAAA...
  #   got:       sha256-xxxx...
  # Thay lib.fakeHash bằng hash thực tế đó.
  # -----------------------------------------------------------------------
  pnpmDeps = fetchPnpmDeps {
    inherit pname version src;
    # fetcherVersion = 2 dùng cho pnpm lockfile v9+ (pnpm >= v9)
    fetcherVersion = 2;
    hash = "sha256-ILPzv4tTwV3ztnzuZeNvlJYG9lKwL/P4XFjHM9Q+k6Y=";
  };

  # -----------------------------------------------------------------------
  # Build frontend (React 19 + Vite)
  # pnpm.configHook tự động setup offline store từ pnpmDeps
  # -----------------------------------------------------------------------
  frontendDist = pkgs.stdenv.mkDerivation {
    name = "${pname}-frontend";
    inherit src pnpmDeps;

    nativeBuildInputs = with pkgs; [
      nodejs
      pnpm
      pnpmConfigHook
    ];

    buildPhase = ''
      pnpm build
    '';

    installPhase = ''
      cp -r dist $out
    '';
  };

in
pkgs.rustPlatform.buildRustPackage {
  inherit pname version src;

  # -----------------------------------------------------------------------
  # Cargo deps — dùng cargoLock để Nix tự tính hash từ Cargo.lock
  # -----------------------------------------------------------------------
  cargoLock = {
    lockFile = "${src}/src-tauri/Cargo.lock";
  };

  # Đặt sourceRoot vào src-tauri để cargo tìm thấy Cargo.toml và Cargo.lock
  sourceRoot = "source/src-tauri";

  # -----------------------------------------------------------------------
  # Build inputs
  # -----------------------------------------------------------------------
  nativeBuildInputs = with pkgs; [
    pkg-config
    wrapGAppsHook3
    gobject-introspection
  ];

  buildInputs = with pkgs; [
    # GTK / WebKit (Tauri v2 dùng WebKitGTK 4.1)
    webkitgtk_4_1
    gtk3
    glib
    cairo
    pango
    gdk-pixbuf
    atk
    libsoup_3

    # Tauri system deps
    openssl
    xdotool
    librsvg

    # Clipboard (wl-clipboard-rs)
    wl-clipboard
  ];

  # -----------------------------------------------------------------------
  # Pre-configure: đặt frontend dist vào đúng nơi mà Tauri expect
  # -----------------------------------------------------------------------
  preConfigure = ''
    # Sửa tauri.conf.json để tìm frontend ở ./dist thay vì ../dist
    # Điều này tránh việc phải ghi đè vào thư mục cha (gây lỗi Permission Denied)
    substituteInPlace tauri.conf.json --replace '"../dist"' '"./dist"'

    mkdir -p dist
    cp -r ${frontendDist}/* dist/
  '';

  env = {
    TAURI_SKIP_DEVSERVER_CHECK = "true";
    TAURI_CLI_NO_DEV_SERVER_WAIT = "1";
  };

  postInstall = ''
    # Desktop entry
    install -Dm644 /dev/stdin $out/share/applications/${pname}.desktop <<EOF
    [Desktop Entry]
    Name=LingFM
    Comment=A modern file manager
    Exec=${pname}
    Icon=${pname}
    Terminal=false
    Type=Application
    Categories=System;FileManager;
    StartupWMClass=lingfm
    EOF

    # Icons
    if [ -f src-tauri/icons/128x128.png ]; then
      install -Dm644 src-tauri/icons/128x128.png \
        $out/share/icons/hicolor/128x128/apps/${pname}.png
    fi
    if [ -f src-tauri/icons/32x32.png ]; then
      install -Dm644 src-tauri/icons/32x32.png \
        $out/share/icons/hicolor/32x32/apps/${pname}.png
    fi
  '';

  meta = with lib; {
    description = "A modern, fast, and feature-rich file manager built with Tauri v2 and React";
    homepage    = "https://github.com/imtraf02/lingfm";
    license     = licenses.mit;
    maintainers = [ ];
    platforms   = platforms.linux;
    mainProgram = pname;
  };
}
