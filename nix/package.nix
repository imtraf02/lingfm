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
, pnpmConfigHook
, makeDesktopItem
, copyDesktopItems
}:

rustPlatform.buildRustPackage rec {
  pname = "lingfm";
  version = "0.1.0";

  src = lib.cleanSource ../.;

  sourceRoot = "source/src-tauri";

  cargoLock = {
    lockFile = ../src-tauri/Cargo.lock;
  };

  nativeBuildInputs = [
    pkg-config
    nodejs
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
    substituteInPlace tauri.conf.json \
      --replace '"beforeBuildCommand": "pnpm build"' '"beforeBuildCommand": ""'
  '';

  preBuild = ''
    # Build frontend
    pushd ..
    pnpm build
    popd
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
