{ lib
, rustPlatform
, pkg-config
, webkitgtk_4_1
, gtk3
, cairo
, gdk-pixbuf
, glib
, dbus
, openssl
, librsvg
, libsoup_3
, nodejs
, pnpm
, fetchPnpmDeps
, pnpmConfigHook
, makeDesktopItem
, copyDesktopItems
}:

rustPlatform.buildRustPackage rec {
  pname = "lingfm";
  version = "0.1.0";

  src = lib.cleanSource ../.;

  # This is required for pnpmConfigHook to work
  # It fetches all node_modules dependencies and creates a fixed-output derivation
  pnpmDeps = fetchPnpmDeps {
    inherit pname src;
    hash = "sha256-Ix3f9mvX0zkANvEwQN6X1t6xQA8V5IyUuy+GMEhNELo=";
    fetcherVersion = 3;
  };

  sourceRoot = "source";

  cargoRoot = "src-tauri";

  cargoLock = {
    lockFile = ../src-tauri/Cargo.lock;
  };

  # Enforce strict offline mode for pnpm and other tools
  env = {
    PNPM_CONFIG_OFFLINE = "true";
    PNPM_CONFIG_UPDATE_NOTIFIER = "false";
    CHECK_FOR_UPDATES = "false";
  };

  nativeBuildInputs = [
    pkg-config
    nodejs
    pnpm
    pnpmConfigHook
    copyDesktopItems
  ];

  buildInputs = [
    webkitgtk_4_1
    gtk3
    cairo
    gdk-pixbuf
    glib
    dbus
    openssl
    librsvg
    libsoup_3
  ];

  postPatch = ''
    substituteInPlace src-tauri/tauri.conf.json \
      --replace-fail '"beforeBuildCommand": "pnpm build"' '"beforeBuildCommand": ""'
  '';

  preBuild = ''
    # Build frontend
    pnpm build --offline
    cd src-tauri
  '';

  # Tauri specific environment variables
  TAURI_SKIP_DEVSHELL_CHECK = "true";

  desktopItems = [
    (makeDesktopItem {
      name = "lingfm";
      exec = "lingfm";
      icon = "lingfm";
      desktopName = "LingFM";
      comment = "A modern file manager";
      categories = [ "System" "FileManager" ];
    })
  ];

  meta = with lib; {
    description = "LingFM - A Tauri-based File Manager";
    homepage = "https://github.com/imtraf/lingfm";
    license = licenses.mit;
    platforms = platforms.linux;
    mainProgram = "lingfm";
  };
}
