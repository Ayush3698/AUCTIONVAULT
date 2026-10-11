import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)

from huggingface_hub import snapshot_download

logging.info("Downloading hunyuan3d-dit-v2-mini-turbo ...")
snapshot_download(
    repo_id="tencent/Hunyuan3D-2mini",
    allow_patterns=["hunyuan3d-dit-v2-mini-turbo/*"],
)
logging.info("DIT turbo done.")

logging.info("Downloading hunyuan3d-vae-v2-mini-turbo ...")
snapshot_download(
    repo_id="tencent/Hunyuan3D-2mini",
    allow_patterns=["hunyuan3d-vae-v2-mini-turbo/*"],
)
logging.info("VAE turbo done.")