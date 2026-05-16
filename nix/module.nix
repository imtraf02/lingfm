# nix/module.nix — NixOS system module cho LingFM
{ config, lib, pkgs, ... }:

let
  cfg = config.programs.lingfm;
in
{
  options.programs.lingfm = {
    enable = lib.mkEnableOption "LingFM — modern file manager built with Tauri v2";

    package = lib.mkPackageOption pkgs "lingfm" {
      nullable    = false;
      extraDescription = "The LingFM package to use.";
    } // {
      default = pkgs.lingfm or (pkgs.callPackage ./package.nix { });
    };

    # Cho phép tất cả user chạy LingFM
    forAllUsers = lib.mkOption {
      type        = lib.types.bool;
      default     = true;
      description = "Thêm LingFM vào environment.systemPackages để mọi user đều dùng được.";
    };
  };

  config = lib.mkIf cfg.enable {
    # Thêm package vào system nếu forAllUsers = true
    environment.systemPackages = lib.mkIf cfg.forAllUsers [ cfg.package ];

    # XDG MIME: đặt LingFM làm file manager mặc định (tuỳ chọn)
    xdg.mime.defaultApplications = lib.mkDefault {
      "inode/directory" = "lingfm.desktop";
      "x-scheme-handler/file" = "lingfm.desktop";
    };
  };
}
