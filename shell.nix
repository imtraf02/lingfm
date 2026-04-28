{ pkgs ? import <nixpkgs> { } }:

let
  libraries = with pkgs; [
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

  packages = with pkgs; [
    curl
    wget
    pkg-config
    dbus
    openssl
    glib
    gtk3
    libsoup_3
    webkitgtk_4_1
    librsvg
    
    # Development tools
    cargo
    rustc
    rust-analyzer
    nodejs
    pnpm
  ];
in
pkgs.mkShell {
  buildInputs = packages;

  shellHook = ''
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
    export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-data-schemas:${pkgs.gtk3}/share/gsettings-data-schemas:$XDG_DATA_DIRS
    
    echo "Tauri Dev Environment Loaded (NixOS 26.05 compatibility)!"
    echo "Using Node: $(node --version)"
    echo "Using OpenSSL: $(openssl version)"
  '';
}
