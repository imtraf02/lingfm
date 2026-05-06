{ pkgs ? import <nixpkgs> { } }:

{
  package = pkgs.callPackage ./package.nix { };
  nixosModule = import ./module.nix;
  homeManagerModule = import ./hm-module.nix;
}
