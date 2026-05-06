# nix/hm-module.nix — Home Manager module cho LingFM
{ config, lib, pkgs, ... }:

let
  cfg = config.programs.lingfm;
in
{
  options.programs.lingfm = {
    enable = lib.mkEnableOption "LingFM — modern file manager built with Tauri v2";

    package = lib.mkOption {
      type        = lib.types.package;
      default     = pkgs.lingfm or (pkgs.callPackage ./package.nix { });
      defaultText = lib.literalExpression "pkgs.lingfm";
      description = "The LingFM package to install.";
    };

    # Đặt LingFM là file manager mặc định cho user này (XDG MIME)
    defaultFileManager = lib.mkOption {
      type        = lib.types.bool;
      default     = false;
      description = "Đặt LingFM làm file manager mặc định cho user (xdg-mime).";
    };
  };

  config = lib.mkIf cfg.enable {
    home.packages = [ cfg.package ];

    # XDG MIME association
    xdg.mimeApps = lib.mkIf cfg.defaultFileManager {
      enable = true;
      defaultApplications = {
        "inode/directory" = [ "lingfm.desktop" ];
      };
    };
  };
}
