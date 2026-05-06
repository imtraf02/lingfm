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
    # ── Rust ──────────────────────────────────────────────────────────────
    rustToolchain

    # ── Node / pnpm ───────────────────────────────────────────────────────
    nodejs_22
    pnpm_9

    # ── Tauri CLI ─────────────────────────────────────────────────────────
    cargo-tauri

    # ── Build tools ───────────────────────────────────────────────────────
    pkg-config
    cmake
    mold        # faster linker

    # ── GTK / WebKit (Tauri v2 Linux) ─────────────────────────────────────
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

    # ── Clipboard ─────────────────────────────────────────────────────────
    wl-clipboard

    # ── Dev utilities ─────────────────────────────────────────────────────
    nixfmt-rfc-style
  ];

  # Biến môi trường cần thiết cho Tauri / GTK
  env = {
    # Để pkg-config tìm thấy thư viện
    PKG_CONFIG_PATH = with pkgs; lib.makeSearchPathOutput "dev" "lib/pkgconfig" [
      webkitgtk_4_1
      gtk3
      glib
      openssl
      libsoup_3
    ];

    WEBKIT_DISABLE_COMPOSITING_MODE = "1";

    # Rust backtrace khi debug
    RUST_BACKTRACE = "1";
  };

  shellHook = ''
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║        LingFM Dev Shell               ║"
    echo "╠═══════════════════════════════════════╣"
    echo "║  pnpm install   → install JS deps     ║"
    echo "║  pnpm tauri dev → start dev server    ║"
    echo "║  nix build      → build release       ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
  '';
}
