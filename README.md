# RIFT

A responsive gaming hero experience featuring a cursor-reactive 3D character.

## Run locally

```sh
npm install
npm run dev
```

The model in `public/niloy_3D_Model.glb` is copied into production builds and served from `/niloy_3D_Model.glb`. It is Meshopt-compressed, and the loader enables the matching decoder. The model is large, so the first load can take a moment.