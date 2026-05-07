# nix/default.nix — Dev shell cho LingFM
{ pkgs ? import <nixpkgs> { } }:

let
  rustToolchain = pkgs.rust-bin.stable.latest.default.override {
    extensions = [ "rust-src" "rust-analyzer" "clippy" "rustfmt" ];
    targets    = [ "x86_64-unknown-linux-gnu" "wasm32-unknown-unknown" ];
  };
in
pkgs.mkShell {
  name = "lingfm-dev";

  packages = with pkgs; [
    rustToolchain

    nodejs
    pnpm

    cargo-tauri

    pkg-config
    cmake
    mold

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

    nixfmt-rfc-style
  ];

  env = {
    PKG_CONFIG_PATH = with pkgs; lib.makeSearchPathOutput "dev" "lib/pkgconfig" [
      webkitgtk_4_1
      gtk3
      glib
      openssl
      libsoup_3
    ];

    WEBKIT_DISABLE_COMPOSITING_MODE = "1";

    RUST_BACKTRACE = "1";

    XDG_DATA_DIRS = with pkgs; lib.concatStringsSep ":" [
      "${gtk3}/share/gsettings-schemas/${gtk3.name}"
      "${gsettings-desktop-schemas}/share/gsettings-schemas/${gsettings-desktop-schemas.name}"
      "$XDG_DATA_DIRS"
    ];
  };

  shellHook = ''
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║        LingFM Dev Shell               ║"
    echo "╠═══════════════════════════════════════╣"
    echo "║  pnpm install   → install TS deps     ║"
    echo "║  pnpm tauri dev → start dev server    ║"
    echo "║  nix build      → build release       ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
  '';
}
