"""Native archives for package_release.py; standard-library Go, no runtime installer."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import gzip
import io
import json
import os
import shutil
import subprocess
import tarfile
import tempfile

PLATFORMS = ("linux-amd64", "linux-arm64", "darwin-amd64", "darwin-arm64", "windows-amd64")

def package_native(root, static, out, version, source, platforms):
    go_version = subprocess.check_output(["go", "version"], text=True).strip()
    notices = ["Go runtime\n\n" + (root / "tools/launcher/LICENSE-Go").read_text()]
    for relative in ("LICENSE", "node_modules/parse5/LICENSE", "node_modules/entities/LICENSE"):
        candidate = root / relative
        if candidate.is_file():
            notices.append(relative + "\n\n" + candidate.read_text())
    for platform in platforms:
        system, arch = platform.split("-")
        folder = "ReturnBy-v" + version + "-" + platform
        executable = "ReturnBy.exe" if system == "windows" else "ReturnBy"
        archive = out / (folder + (".tar.gz" if system == "linux" else ".zip"))
        if archive.exists():
            raise FileExistsError("Refusing to overwrite " + str(archive))
        with tempfile.TemporaryDirectory(prefix="returnby-native-") as temp:
            stage = Path(temp)
            shutil.copy(root / "tools/launcher/main.go", stage / "main.go")
            shutil.copy(root / "tools/launcher/go.mod", stage / "go.mod")
            shutil.copytree(static, stage / "web")
            built = stage / executable
            env = dict(os.environ, GOOS=system, GOARCH=arch, CGO_ENABLED="0", GOTOOLCHAIN="local")
            subprocess.run(["go", "build", "-trimpath", "-buildvcs=false", "-ldflags",
                            "-s -w -X main.version=" + version + " -X main.source=" + source,
                            "-o", str(built), "."], cwd=stage, env=env, check=True)
            launch = ("Double-click Start ReturnBy.cmd (or ReturnBy.exe)." if system == "windows"
                      else "Double-click Start ReturnBy.command." if system == "darwin"
                      else "Run ./ReturnBy from the extracted folder.")
            readme = (
                "RETURNBY " + version + " — " + platform + "\n\n" + launch + "\n"
                "No Python, Node, Go, installation or network access is required.\n"
                "A current browser is required. The complete browser app is inside the executable.\n"
                "The launcher opens http://127.0.0.1:8769 in your normal browser.\n"
                "If it cannot open automatically, open that address yourself.\n"
                "Keep the launcher window open; Ctrl+C stops it. Saved work remains in your browser.\n\n"
                "Use the SAME browser profile and address as your previous ReturnBy release.\n"
                "This preserves saved purchases, refunds and trips without moving their data.\n"
                "An occupied port does not cause a silent fallback. Close the other local server.\n"
                "Advanced: --port 18769 or RETURNBY_PORT=18769 chooses another origin; use a backup\n"
                "to transfer data. --no-open prints the address without opening a browser.\n"
                "--version prints this executable's exact version and source.\n\n"
                "These binaries are unsigned. macOS/Windows may show publisher checks.\n"
                "Linux amd64 is exercised on the estate. Other platform binaries are crosscompiled;\n"
                "read the release notes for actual platform execution coverage.\n\n"
                "ReturnBy does not upload receipts or synchronize accounts. Backups are unencrypted.\n"
                "Calendar files need import and notification setup in your calendar app.\n\n"
                "Source: https://github.com/Jacob-Met/returnby/commit/" + source + "\n"
                "Toolchain: " + go_version + "\n"
            )
            metadata = {"app": "ReturnBy", "version": version, "source": source,
                        "platform": platform, "go": go_version, "runtime": "bundled",
                        "assets": len([p for p in static.rglob("*") if p.is_file()])}
            payloads = [(executable, built.read_bytes(), 0o755),
                        ("READ_ME_FIRST.txt", readme.encode(), 0o644),
                        ("THIRD_PARTY_NOTICES.txt", "\n\n---\n\n".join(notices).encode(), 0o644),
                        ("VERSION.json", (json.dumps(metadata, indent=2) + "\n").encode(), 0o644)]
            if system == "windows":
                payloads.append(("Start ReturnBy.cmd",
                    b'@echo off\r\ncd /d "%~dp0"\r\nReturnBy.exe\r\nif errorlevel 1 pause\r\n', 0o644))
            if system == "darwin":
                payloads.append(("Start ReturnBy.command",
                    b'#!/bin/sh\ncd "$(dirname "$0")" || exit 1\n./ReturnBy\nresult=$?\nif [ "$result" -ne 0 ]; then printf "Press Return to close."; read answer; fi\nexit "$result"\n', 0o755))
            if system == "linux":
                with archive.open("xb") as raw:
                    with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0, filename="") as gz:
                        with tarfile.open(fileobj=gz, mode="w") as package:
                            for name, content, mode in payloads:
                                entry = tarfile.TarInfo(folder + "/" + name)
                                entry.size = len(content)
                                entry.mode = mode
                                entry.mtime = 0
                                package.addfile(entry, io.BytesIO(content))
            else:
                with ZipFile(archive, "x") as package:
                    for name, content, mode in payloads:
                        entry = ZipInfo(folder + "/" + name, (2026, 1, 1, 0, 0, 0))
                        entry.compress_type = ZIP_DEFLATED
                        entry.external_attr = (0o100000 | mode) << 16
                        package.writestr(entry, content)
            print(json.dumps({"archive": str(archive), "source": source, "platform": platform,
                              "bytes": archive.stat().st_size, "runtime": "bundled", "go": go_version}), flush=True)
