{
  description = "LingFM - A Tauri-based File Manager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

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
          at-spi2-atk
          atk
          gdk-pixbuf
          pango
          harfbuzz
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
          (rust-bin.stable.latest.default.override {
            extensions = [ "rust-src" "rust-analyzer" ];
          })
          nodejs
          pnpm
          fzf
          
          # Useful for Tauri
          appimage-run
        ];
in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = packages;

          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-data-schemas:${pkgs.gtk3}/share/gsettings-data-schemas:$XDG_DATA_DIRS
            
            echo "LingFM Development Environment Loaded!"
            echo "Rust: $(rustc --version)"
            echo "Node: $(node --version)"
            echo "Pnpm: $(pnpm --version)"
          '';
        };

        # Placeholder for package - building Tauri apps in Nix is non-trivial 
        # but we can provide the derivation path once implemented
        packages.default = pkgs.callPackage ./nix/package.nix { };
      }
    ) // {
      nixosModules.default = import ./nix/module.nix self;
      homeModules.default = import ./nix/hm-module.nix self;
    };
}
