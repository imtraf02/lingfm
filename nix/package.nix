{ lib
, rustPlatform
, fetchPnpmDeps
, pnpmConfigHook
, pkg-config
, nodejs
, pnpm
, webkitgtk_4_1
, gtk3
, cairo
, gdk-pixbuf
, glib
, dbus
, openssl
, librsvg
, libsoup_3
, makeDesktopItem
, copyDesktopItems
}:

rustPlatform.buildRustPackage rec {
  pname = "lingfm";
  version = "0.1.0";

  src = lib.cleanSource ../.;

  sourceRoot = "source";

  # Standard way to fetch pnpm dependencies
  pnpmDeps = fetchPnpmDeps {
    inherit pname src;
    hash = "sha256-Ix3f9mvX0zkANvEwQN6X1t6xQA8V5IyUuy+GMEhNELo="; # Giữ lại hash cũ của bạn
  };

  cargoRoot = "src-tauri";

  cargoLock = {
    lockFile = ../src-tauri/Cargo.lock;
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

  # Tauri v2 environment variables
  EVENT_NO_DELAYS = "1";

  postPatch = ''
    substituteInPlace src-tauri/tauri.conf.json \
      --replace-fail '"beforeBuildCommand": "pnpm build"' '"beforeBuildCommand": ""'
  '';

  preBuild = ''
    # Build frontend
    pnpm build
    # Go back to backend root for cargo
    cd src-tauri
  '';

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
