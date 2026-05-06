# nix/package.nix — Build derivation cho LingFM (Tauri v2 app)
{
  lib,
  pkgs,
  stdenv,
  rustPlatform,
  # self là flake self-reference (chỉ có khi gọi từ flake.nix).
  # Khi gọi từ NixOS/HM module, self = null và src fallback về cleanSource.
  self ? null,
  ...
}:

let
  # -----------------------------------------------------------------------
  # Toolchain Rust
  # -----------------------------------------------------------------------
  rustToolchain = pkgs.rust-bin.stable.latest.default.override {
    targets = [ "x86_64-unknown-linux-gnu" ];
  };

  # -----------------------------------------------------------------------
  # Metadata
  # -----------------------------------------------------------------------
  pname   = "lingfm";
  version = "0.1.0";
  # Nếu được gọi từ flake.nix thì dùng flake self (bao gồm cả flake.lock),
  # nếu không (HM/NixOS module) thì dùng cleanSource để bỏ .git và các file không cần.
  src = if self != null then self else lib.cleanSource ./..;

  # -----------------------------------------------------------------------
  # Frontend build (pnpm + vite)
  # -----------------------------------------------------------------------
  nodeModules = pkgs.stdenv.mkDerivation {
    name = "${pname}-node-modules";
    inherit src;
    nativeBuildInputs = [ pkgs.pnpm_9 pkgs.nodejs_22 ];

    buildPhase = ''
      export HOME=$TMPDIR
      export npm_config_cache=$TMPDIR/.npm
      pnpm config set store-dir $TMPDIR/.pnpm-store
      pnpm install --frozen-lockfile
    '';

    installPhase = ''
      mkdir -p $out
      cp -r node_modules $out/node_modules
    '';

    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    # Cập nhật hash sau khi chạy `nix build` lần đầu với hash giả
    outputHash     = lib.fakeSha256;
  };

  frontendDist = pkgs.stdenv.mkDerivation {
    name = "${pname}-frontend";
    inherit src;
    nativeBuildInputs = [ pkgs.pnpm_9 pkgs.nodejs_22 ];

    buildPhase = ''
      export HOME=$TMPDIR
      # Dùng lại node_modules từ derivation trên
      ln -s ${nodeModules}/node_modules ./node_modules
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
  # Cargo deps hash — cập nhật sau: nix build 2>&1 | grep "got:"
  # -----------------------------------------------------------------------
  cargoLock = {
    lockFile = "${src}/src-tauri/Cargo.lock";
  };

  # Chỉ build crate Tauri backend
  buildAndTestSubdir = "src-tauri";

  # -----------------------------------------------------------------------
  # Build inputs
  # -----------------------------------------------------------------------
  nativeBuildInputs = with pkgs; [
    pkg-config
    wrapGAppsHook
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
    # Tauri đọc frontendDist từ tauri.conf.json → ../dist
    cp -r ${frontendDist} dist
  '';

  # Tauri bundle không cần thiết khi build bằng Nix
  env = {
    TAURI_SKIP_DEVSERVER_CHECK = "true";
    # Tắt bundle (chúng ta tự install binary)
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

    # Icon (nếu có)
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
