{
  lib,
  pkgs,
  fetchPnpmDeps,
  pnpmConfigHook,
  self ? null,
  ...
}:

let
  pname   = "lingfm";
  version = "0.1.1";
  src = if self != null then self else lib.cleanSource ./..;

  pnpmDeps = fetchPnpmDeps {
    inherit pname version src;
    fetcherVersion = 2;
    hash = "sha256-wQbFSXEfE0tC4zwmlxJDYMExbHA8AsEAKOWn7ecRW2I=";
  };

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

  cargoLock = {
    lockFile = "${src}/src-tauri/Cargo.lock";
  };

  sourceRoot = "source/src-tauri";

  nativeBuildInputs = with pkgs; [
    pkg-config
    wrapGAppsHook3
    gobject-introspection
  ];

  buildInputs = with pkgs; [
    webkitgtk_4_1
    gtk3
    glib
    cairo
    pango
    gdk-pixbuf
    atk
    libsoup_3

    openssl
    xdotool
    librsvg
    gsettings-desktop-schemas
    adwaita-icon-theme

    wl-clipboard
    p7zip
  ];

  preConfigure = ''
    substituteInPlace tauri.conf.json --replace '"../dist"' '"./dist"'

    mkdir -p dist
    cp -r ${frontendDist}/* dist/
  '';

  cargoBuildFlags = [ "--features" "custom-protocol" ];

  env = {
    TAURI_SKIP_DEVSERVER_CHECK = "true";
    TAURI_CLI_NO_DEV_SERVER_WAIT = "1";
    TAURI_ENV_DEBUG = "false";
  };

  postInstall = ''
    install -Dm644 /dev/stdin $out/share/applications/${pname}.desktop <<EOF
    [Desktop Entry]
    Name=LingFM
    Comment=A modern file manager
    Exec=${pname} %u
    Icon=${pname}
    Terminal=false
    Type=Application
    Categories=System;FileManager;
    MimeType=inode/directory;x-scheme-handler/file;
    StartupWMClass=lingfm
    EOF

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
