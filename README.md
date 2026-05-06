# LingFM

A modern, fast, and feature-rich file manager built with Tauri v2, React 19, and Rust.

## 🚀 Quick Start (Nix / NixOS)

This project is fully powered by **Nix Flakes**.

### Development Shell
To enter a shell with all dependencies (Rust, Node.js, pnpm, etc.) pre-installed:

```bash
nix develop
# Then run:
pnpm install
pnpm tauri dev
```

### Build from Source
To build the production binary:

```bash
nix build
# The binary will be located at:
./result/bin/lingfm
```

## ❄️ Installation on NixOS

You can easily integrate LingFM into your NixOS or Home Manager configuration.

### 1. Add to your `flake.nix` inputs

```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    
    lingfm = {
      url = "github:imtraf02/lingfm";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, lingfm, ... }@inputs: {
    # ... your NixOS configurations
  };
}
```

### 2. Use with Home Manager

In your home-manager configuration file (e.g., `home.nix`):

```nix
{ inputs, ... }: {
  imports = [
    inputs.lingfm.homeModules.default
  ];

  programs.lingfm.enable = true;
}
```

### 3. Use as a NixOS Module

In your `configuration.nix`:

```nix
{ inputs, ... }: {
  imports = [
    inputs.lingfm.nixosModules.default
  ];

  programs.lingfm.enable = true;
}
```

## 🛠 Tech Stack
- **Frontend:** React 19, Tailwind CSS 4, Zustand, TanStack Query
- **Backend:** Rust, Tauri v2
- **Environment:** Nix Flakes

## 📄 License
MIT
