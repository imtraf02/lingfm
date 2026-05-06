# LingFM

A modern, fast, and feature-rich file manager built with Tauri v2, React 19, and Rust.

## 🚀 Getting Started (NixOS / Nix Users)

This project uses **Nix Flakes** to manage its development environment and build process.

### 1. Development Environment
To start developing without installing any dependencies globally:

```bash
nix develop
# Once inside the shell:
pnpm install
pnpm tauri dev
```

### 2. Build from Source
To build the production binary using Nix:

```bash
nix build
# The binary will be available at:
./result/bin/lingfm
```

## ❄️ Installation on NixOS

You can integrate LingFM into your NixOS configuration using the provided Flake modules.

### Add to your `flake.nix` inputs:

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    lingfm.url = "github:yourusername/lingfm"; # Replace with your actual repo
  };

  outputs = { self, nixpkgs, lingfm, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        lingfm.nixosModules.default # Add the module
      ];
    };
  };
}
```

### Enable in `configuration.nix`:

```nix
{
  programs.lingfm.enable = true;
}
```

### Home Manager (Optional)
If you prefer Home Manager, add `lingfm.homeManagerModules.default` to your modules and enable it:

```nix
{
  programs.lingfm.enable = true;
}
```

## 🛠 Tech Stack
- **Frontend:** React 19, Tailwind CSS 4, Zustand, TanStack Query
- **Backend:** Rust, Tauri v2
- **Environment:** Nix Flakes

## 📄 License
MIT
