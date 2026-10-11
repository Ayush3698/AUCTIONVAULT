# Local Hunyuan3D Service

A **fully local, open-source** image-to-3D generation service for the auction
platform. It replaces the previous cloud integration (Tripo) with
[Tencent Hunyuan3D-2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) running on
the machine that hosts the application.

- **No paid API, no API key, no credit system, no subscription.**
- The service binds to `127.0.0.1` by default and is never exposed publicly.
- Uploads are validated (magic bytes + Pillow decode + size limit), filenames
  are sanitized, and uploaded bytes are never executed.

## Architecture

```
Next.js application            (auction-platform, port 3000)
        |
        |  HUNYUAN3D_URL=http://127.0.0.1:8000
        v
Local Hunyuan3D service        (this folder, port 8000)
        |
        +-- POST /generate (multipart image)  -> image-to-3D
        +-- GET  /models/{id}/model.glb       -> serves the GLB back
        |
        v
Generated GLB saved to auction-platform/public/models/*.glb
        |
        v
Existing ModelViewer (<model-viewer>) renders the GLB
```

```
hunyuan3d-service/
  app/
    config.py      # env-based configuration
    errors.py      # structured error codes
    validate.py    # upload validation + filename sanitization
    pipeline.py    # wraps the official hy3dgen pipeline (shape+texture -> GLB)
  server.py        # FastAPI HTTP endpoints
  requirements.txt
  README.md
  outputs/         # generated GLBs kept by the service (gitignored)
  Hunyuan3D-2/     # official repo - clone it here (see below)
```

## Requirements

| Requirement                 | Recommended / required                          |
|-----------------------------|-------------------------------------------------|
| Python                      | 3.10 – 3.13 (the verified venv here is 3.13.2)   |
| PyTorch build               | CUDA build for NVIDIA GPUs, or CPU build        |
| Free system RAM at runtime  | ≈ 4 GB commit (see *Memory requirements* below)  |
| GPU (shape only)            | ≥ 6 GB VRAM (full model), try 4 GB with mini    |
| GPU (shape + texture)       | ≥ 16 GB VRAM                                    |
| Disk                        | ≥ 20 GB free (model checkpoints)                |
| Network (first setup only)  | Needed to clone the repo and download weights   |

> **About this machine:** the detected GPU is an **NVIDIA GeForce RTX 2050 with
> 4 GB VRAM** (driver 581.83, CUDA 13.0, 15.6 GB system RAM). That is below the
> 6 GB officially required for shape generation and far below the 16 GB required
> for texture generation.
>
> What that means, honestly:
> - With **CUDA**, use `Hunyuan3D-2mini-Turbo` (0.6B model) with the CPU-offload
>   hooks the service sets up automatically. It fits by streaming one component
>   at a time into the 4 GB of VRAM.
> - With **CPU** (`HUNYUAN3D_DEVICE=cpu`), generation works but is **very slow**
>   (often 10–30+ minutes per model). This is expected and documented, not a bug.
> - Texture generation is **off by default**. Enable it only on a machine with
>   enough VRAM.

### Memory requirements (important)

The `hunyuan3d-dit-v2-mini-turbo` checkpoint is 3.6 GB of fp16 weights. The
upstream Hunyuan3D loaders build every module in float32 first and copy the
checkpoint into it, which peaks at roughly **15 GB of committed memory per
checkpoint** – more than this machine has. Windows answers the failing
allocation with an access violation inside `torch_cpu.dll`, so the process used
to die mid-request with no Python traceback at all.

`app/pipeline.py` therefore loads the weights itself: it memory-maps the
safetensors file, instantiates the modules on the `meta` device and *assigns*
the fp16 tensors to them (`load_state_dict(assign=True)`). Peak extra memory is
one tensor, the weights stay file-backed and evictable, and `/generate` reports
a structured `MODEL_LOAD_FAILED` instead of crashing if memory still runs out.

Consequences for this machine:
- The weights consume ~3.6 GB of commit charge for as long as the service runs.
- `enable_flashvdm()` pulls in a *second* 4 GB turbo VAE, so `HUNYUAN3D_FLASH_VDM`
  defaults to `auto` and turns it off when free RAM is low.
- Background removal defaults to rembg's `bria-rmbg` session (~1 GB);
  `HUNYUAN3D_REMBG_MODEL=auto` drops to `u2net` (~176 MB) when RAM is tight.
- If the commit limit is exhausted anyway, close virtual machines/browsers or
  enlarge the Windows pagefile. `/health` reports `availableRamGb`.

## Setup (Windows)

You have two supported paths. Choose one.

### Option A – Native Windows (recommended for simplicity)

Open a terminal (PowerShell) in this folder:

```powershell
cd hunyuan3d-service

# 1. Create a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Service dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3. Official Hunyuan3D-2 repo (this clones the model code)
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2
cd Hunyuan3D-2

# 4. Install the repo dependencies + the local hy3dgen package
pip install -r requirements.txt
pip install -e .
cd ..

# 5. Accelerator + verified ML pins (torch build must match the NVIDIA driver)
pip install -r requirements-torch.txt
```

> **Start the service with the venv interpreter**, never with a bare
> `python server.py` – a plain `python` can resolve to the system interpreter,
> which has no torch, and every `/generate` then fails with
> `DEPENDENCIES_MISSING`:
>
> ```powershell
> .\.venv\Scripts\python.exe server.py
> # or simply
> .\start_hunyuan3d.bat
> ```
>
> The service prints the interpreter, PyTorch build and GPU it detected at
> startup, and warns loudly if PyTorch is missing. `GET /diagnose` returns the
> same information as JSON.

> **On Windows**, the differentiable-rasterizer/kaolin components used by the
> texture branch can be hard to build. That is another reason the service keeps
> texture off by default for shape-only generation. If you hit build errors with
> `::render`/`kaolin`, use option B (WSL2) for the full experience.


### Option B – WSL2 Ubuntu (closest to official Linux support)

From Windows PowerShell:

```powershell
wsl -d Ubuntu
```

Then inside Ubuntu (WSL2 has CUDA passthrough via the NVIDIA driver):

```bash
cd /mnt/d/Example/auction-platform/hunyuan3d-service   # your actual path

sudo apt-get update
sudo apt-get install -y python3.10-venv python3.11-venv git build-essential

python3.11 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2
cd Hunyuan3D-2
pip install -r requirements.txt
pip install -e .
cd ..
pip install torch --index-url https://download.pytorch.org/whl/cu128
```

WSL2 forwards localhost to Windows by default, so the Next.js app on Windows can
reach the service at `http://127.0.0.1:8000`.

## First run – download the model weights

On the **first generation (or preload)**, Hugging Face downloads the model
(`tencent/Hunyuan3D-2mini`, subfolder `hunyuan3d-dit-v2-mini-turbo`) plus the
`u2net` background-removal checkpoint. This can take several minutes and needs
network access once.

## Starting the service

```powershell
cd hunyuan3d-service

# always use the project venv - a bare `python` may lack torch
.\.venv\Scripts\python.exe server.py --host 127.0.0.1 --port 8000
# or
.\start_hunyuan3d.bat

# optional: preload models at boot (adds ~10-20s, removes it from request 1)
# $env:HUNYUAN3D_PRELOAD = "1"
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod -Method Post http://127.0.0.1:8000/diagnose
```

## Configuration (environment variables)

All variables are optional; defaults are shown.

| Variable                     | Default                          | Meaning                                        |
|------------------------------|----------------------------------|------------------------------------------------|
| `HUNYUAN3D_HOST`             | `127.0.0.1`                      | Bind address (keep localhost)                  |
| `HUNYUAN3D_PORT`             | `8000`                           | Port                                          |
| `HUNYUAN3D_ROOT`             | `.\Hunyuan3D-2`                  | Path to the cloned official repo               |
| `HUNYUAN3D_DEVICE`           | `auto`                           | `auto`, `cuda` or `cpu`                        |
| `HUNYUAN3D_MODEL`            | `tencent/Hunyuan3D-2mini`        | HF id of the shape model                       |
| `HUNYUAN3D_SUBFOLDER`        | `hunyuan3d-dit-v2-mini-turbo`    | Subfolder inside the HF repo                   |
| `HUNYUAN3D_TEX_MODEL`        | `tencent/Hunyuan3D-2`            | HF id of the texture model                     |
| `HUNYUAN3D_TEXTURE`          | `0`                              | Enable texture generation (needs ≥16 GB VRAM)  |
| `HUNYUAN3D_MAX_IMAGE_MB`     | `10`                             | Max uploaded image size                        |
| `HUNYUAN3D_OCTREE_RESOLUTION`| `128`                            | Mesh resolution                                |
| `HUNYUAN3D_STEPS`            | `5`                              | Diffusion steps (turbo)                        |
| `HUNYUAN3D_GUIDANCE`         | `5.0`                            | Guidance scale                                 |
| `HUNYUAN3D_SEED`             | `1234`                           | Random seed                                    |
| `HUNYUAN3D_FLASH_VDM`        | `auto`                           | `auto`, `0`/`1` – swap in the 4 GB turbo VAE   |
| `HUNYUAN3D_REMBG_MODEL`      | `auto`                           | `auto` (u2net when RAM is tight), or a rembg session name |
| `HUNYUAN3D_PRELOAD`          | `0`                              | Load models at boot                            |
| `HUNYUAN3D_OUTPUTS`          | `.\outputs`                      | Where the service stores GLBs                  |

## Endpoints

| Method | Path                        | Description                                          |
|--------|-----------------------------|------------------------------------------------------|
| GET    | `/health`                   | Model/GPU/RAM status (works even when deps are missing) |
| POST   | `/diagnose`                 | Same as `/health` plus an explicit reason when deps are missing |
| POST   | `/load`                     | Load/reload models into memory                       |
| POST   | `/generate`                 | Multipart field `image` (+ optional `productName`) → JSON with `modelUrl` |
| GET    | `/models/{id}/model.glb`    | Fetch a generated GLB back to the Next.js backend    |


`POST /generate` response:

```json
{
  "ok": true,
  "modelId": "abc...",
  "filename": "model.glb",
  "sizeKb": 5120.5,
  "durationSeconds": 84.2,
  "device": "cpu",
  "model": "tencent/Hunyuan3D-2mini",
  "modelUrl": "/models/abc.../model.glb"
}
```

Failure response (structured, never silent):

```json
{ "ok": false, "code": "GENERATION_FAILED", "error": "..." }
```

Error codes: `INVALID_IMAGE_TYPE`, `IMAGE_TOO_LARGE`, `EMPTY_IMAGE`,
`SERVICE_BUSY`, `DEPENDENCIES_MISSING`, `GPU_UNAVAILABLE`,
`MODEL_DOWNLOAD_FAILED`, `MODEL_LOAD_FAILED`, `GENERATION_FAILED`,
`MODEL_NOT_RETURNED`.

## Running both services

**Terminal 1 – local Hunyuan3D service**

```powershell
cd hunyuan3d-service
.\start_hunyuan3d.bat
# or: .\.venv\Scripts\python.exe server.py
```

**Terminal 2 – auction platform**

```powershell
cd auction-platform
npm install
npm run dev
```

Open http://localhost:3000, create an auction, proceed to the **3D Model** step,
upload at least 4 product images, and click **Generate 3D Model**.

## Troubleshooting

- **Health reports `DEPENDENCIES_MISSING` / "PyTorch is not installed"** → the
  service is running under the wrong interpreter. Start it with
  `.\.venv\Scripts\python.exe server.py` (or `start_hunyuan3d.bat`).
- **`MODEL_LOAD_FAILED` mentioning the paging file / commit memory** → Windows
  could not give the service the ~3.6 GB the checkpoint needs. Close virtual
  machines, browsers and editors, or enlarge the pagefile, then restart.
- **Health reports `DEPENDENCIES_MISSING`** → the `Hunyuan3D-2` repo is not
  cloned at `HUNYUAN3D_ROOT`, or its `pip install -e .` was not run in this
  environment.
- **`GPU_UNAVAILABLE`** → CUDA requested but no usable GPU in the current
  Python build. Unset `HUNYUAN3D_DEVICE` (falls back to `cpu`) or install the
  CUDA PyTorch wheel.
- **`GENERATION_FAILED` on a 4 GB GPU** → likely CUDA OOM; use the mini/turbo
  subfolder, keep `HUNYUAN3D_TEXTURE=0`, run `HUNYUAN3D_DEVICE=cpu` if needed.
- **CPU generation is extremely slow** → expected; set `HUNYUAN3D_PRELOAD=1`
  and `HUNYUAN3D_STEPS=5`.
- **Model downloads fail** → first-run needs internet once; downloads are
  cached afterward in the Hugging Face cache dir.


## License note

Hunyuan3D is released by Tencent under the Tencent Hunyuan Community / Non-
Commercial license. You must comply with that license if you redistribute or
commercially use the generated models or weights. This project only integrates
the model locally.