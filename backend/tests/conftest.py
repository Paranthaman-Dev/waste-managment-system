import os
import sys
from pathlib import Path

os.environ.setdefault("UPLOAD_DIR", "/tmp/waste-management-test-uploads")
Path(os.environ["UPLOAD_DIR"]).mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
