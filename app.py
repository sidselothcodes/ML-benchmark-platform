import subprocess
import os
from pathlib import Path


backend_process = subprocess.Popen(
    ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"],
    cwd=Path(__file__).parent,
)

frontend_dir = Path(__file__).parent / "frontend"
subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True)


import http.server
import socketserver

os.chdir(frontend_dir / "dist")
PORT = 7860  

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on port {PORT}")
    httpd.serve_forever()