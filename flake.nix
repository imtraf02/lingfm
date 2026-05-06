{
  description = "LingFM - A modern file manager built with Tauri v2, React 19, and Rust";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
      in
      {
        # Nix package
        packages.default = pkgs.callPackage ./nix/package.nix { inherit self; };
        packages.lingfm   = pkgs.callPackage ./nix/package.nix { inherit self; };

        # Dev shell
        devShells.default = pkgs.callPackage ./nix/default.nix { };

        # Formatter
        formatter = pkgs.nixfmt-rfc-style;
      }
    ) // {
      # NixOS module
      nixosModules.default = import ./nix/module.nix;
      nixosModules.lingfm  = import ./nix/module.nix;

      # Home Manager module
      homeModules.default = import ./nix/hm-module.nix;
      homeModules.lingfm  = import ./nix/hm-module.nix;

      # Overlay để thêm lingfm vào pkgs
      overlays.default = final: prev: {
        lingfm = final.callPackage ./nix/package.nix { self = self; };
      };
    };
}
