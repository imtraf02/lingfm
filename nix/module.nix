self: { config, lib, pkgs, ... }:

let
  cfg = config.programs.lingfm;
in
{
  options.programs.lingfm = {
    enable = lib.mkEnableOption "LingFM File Manager";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
      description = "The LingFM package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];
  };
}
