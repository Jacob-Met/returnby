"""Independent public-main policy witness; all socket, clock and worker boundaries are stubs.

This executes the exact frozen runtime without opening any port. It complements
the owner's native Mac measurements; it does not simulate kernel socket semantics.
"""
from __future__ import annotations

import argparse
from contextlib import redirect_stderr, redirect_stdout
import errno
import hashlib
import io
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace

SOURCE_SHA256 = "d2bbfaa4440d639bf20e37bc9b0fc3e20d01c643609f1af11d49a57b27e37ac2"


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def course(source, source_path, name, *, platform="darwin", binds=("success",),
           probes=("refused",), default_bind="busy", bind_elapsed=0.0,
           sleep_interrupt=False, bad_assets=False, extra_argument=False):
    module = ModuleType("independent_returnby_source")
    module.__file__ = str(source_path)
    exec(compile(source, str(source_path), "exec"), module.__dict__)
    out, err = io.StringIO(), io.StringIO()
    clock = {"now": 100.0}
    events = {"binds": [], "probes": [], "sleeps": [], "probe_closes": 0,
              "assets": 0, "worker_starts": 0, "worker_joins": 0,
              "serves": 0, "shutdowns": 0, "server_closes": 0}

    class ServerBoundary:
        def __init__(self, endpoint, handler):
            i = len(events["binds"])
            action = binds[i] if i < len(binds) else default_bind
            events["binds"].append({"time": clock["now"] - 100.0,
                                    "endpoint": endpoint, "action": action,
                                    "reuse_address": self.allow_reuse_address,
                                    "reuse_port": self.allow_reuse_port})
            clock["now"] += bind_elapsed
            if action == "busy":
                raise OSError(errno.EADDRINUSE, "owned simulated incumbent or retained state")
            if action == "denied":
                raise OSError(errno.EACCES, "owned simulated permission refusal")
            require(action == "success", "Unknown bind boundary action")

        def serve_forever(self, *, poll_interval):
            require(poll_interval == 0.05, "Unexpected serving interval")
            events["serves"] += 1

        def shutdown(self):
            events["shutdowns"] += 1

        def server_close(self):
            events["server_closes"] += 1

    class ProbeBoundary:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            events["probe_closes"] += 1

    def connect(endpoint, *, timeout):
        i = len(events["probes"])
        action = probes[i] if i < len(probes) else probes[-1]
        events["probes"].append({"time": clock["now"] - 100.0,
                                 "endpoint": endpoint, "timeout": timeout,
                                 "action": action})
        if action == "refused":
            raise ConnectionRefusedError(errno.ECONNREFUSED, "explicitly refused")
        if action == "timeout":
            clock["now"] += timeout
            raise TimeoutError("owned simulated timeout")
        if action == "other_error":
            raise OSError(errno.EHOSTUNREACH, "owned simulated uncertain endpoint")
        require(action == "reachable", "Unknown probe boundary action")
        return ProbeBoundary()

    def sleep(delay):
        events["sleeps"].append(delay)
        if sleep_interrupt:
            raise KeyboardInterrupt
        clock["now"] += delay

    class WorkerBoundary:
        def __init__(self, *, target, daemon):
            require(daemon is True, "Worker is not a daemon")
            self.target = target

        def start(self):
            events["worker_starts"] += 1
            self.target()

        def join(self):
            events["worker_joins"] += 1

    def admit():
        events["assets"] += 1
        if bad_assets:
            raise ValueError("owned simulated invalid asset set")
        return {"/": (b"pinned fixture", "text/html"),
                "/index.html": (b"pinned fixture", "text/html")}

    module.HTTPServer = ServerBoundary
    module.socket = SimpleNamespace(create_connection=connect)
    module.time = SimpleNamespace(monotonic=lambda: clock["now"], sleep=sleep)
    module.Thread = WorkerBoundary
    module.sys = SimpleNamespace(platform=platform,
                                 argv=[str(source_path)] + (["--unexpected"] if extra_argument else []),
                                 stdin=io.StringIO("\n"), stderr=err)
    module.admitted_assets = admit
    with redirect_stdout(out), redirect_stderr(err):
        exit_code = module.main()

    for event in events["binds"]:
        require(event["endpoint"] == ("127.0.0.1", 8769), name + ": alternate bind endpoint")
        require(event["reuse_address"] is (platform == "linux"), name + ": address reuse changed")
        require(event["reuse_port"] is False, name + ": port sharing enabled")
    for event in events["probes"]:
        require(event["endpoint"] == ("127.0.0.1", 8769), name + ": alternate probe endpoint")
        require(0 < event["timeout"] <= 0.25, name + ": probe timeout unbounded")
        require(event["time"] + event["timeout"] <= 60.000001, name + ": probe exceeds deadline")
    require(all(0 < delay <= 0.25 for delay in events["sleeps"]), name + ": sleep unbounded")
    stdout, stderr = out.getvalue(), err.getvalue()
    require("Traceback" not in stdout + stderr, name + ": uncontrolled traceback")
    require(stdout.count("Waiting up to 60 seconds") <= 1, name + ": repeated wait announcement")
    return {"name": name, "platform_simulated": platform, "exit_code": exit_code,
            "simulated_elapsed_seconds": clock["now"] - 100.0,
            "bind_attempts": len(events["binds"]),
            "bind_first_last": events["binds"][:1] + events["binds"][-1:] if events["binds"] else [],
            "all_binds_keep_platform_reuse_policy": True,
            "probe_attempts": len(events["probes"]),
            "probe_first_last": events["probes"][:1] + events["probes"][-1:] if events["probes"] else [],
            "probe_closes": events["probe_closes"],
            "sleep_calls": len(events["sleeps"]), "sleep_seconds": sum(events["sleeps"]),
            "assets_admissions": events["assets"],
            "worker_starts": events["worker_starts"], "worker_joins": events["worker_joins"],
            "serves": events["serves"], "shutdowns": events["shutdowns"],
            "server_closes": events["server_closes"], "stdout": stdout, "stderr": stderr,
            "trace_sha256": hashlib.sha256(json.dumps(events, sort_keys=True).encode()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source = args.source.read_bytes()
    require(hashlib.sha256(source).hexdigest() == SOURCE_SHA256, "Source is not the frozen reviewed runtime")
    results = []

    def run(name, expected_exit, expected_binds, expected_probes, **kwargs):
        r = course(source, args.source, name, **kwargs)
        require(r["exit_code"] == expected_exit, name + ": wrong exit")
        require(r["bind_attempts"] == expected_binds, name + ": wrong bind count")
        require(r["probe_attempts"] == expected_probes, name + ": wrong probe count")
        starts = int(expected_exit == 0 and not kwargs.get("sleep_interrupt"))
        for key in ("worker_starts", "worker_joins", "serves", "shutdowns", "server_closes"):
            require(r[key] == starts, name + ": wrong successful-server lifecycle " + key)
        require(r["assets_admissions"] == int(not kwargs.get("extra_argument")), name + ": repeated/missing admission")
        r["passed"] = True
        results.append(r)
        return r

    run("fresh Darwin start and normal cleanup", 0, 1, 0)
    r = run("explicit refusals then successful Darwin bind", 0, 3, 2,
            binds=("busy", "busy", "success"))
    require(r["sleep_seconds"] == 0.5 and r["stdout"].count("Waiting up to") == 1,
            "Released-address retry did not wait once per failed attempt")
    r = run("reachable incumbent refuses and closes probe", 1, 1, 1,
            binds=("busy",), probes=("reachable",))
    require(r["probe_closes"] == 1 and r["sleep_calls"] == 0, "Reachable probe not closed promptly")
    run("probe timeout refuses without retry", 1, 1, 1, binds=("busy",), probes=("timeout",))
    run("uncertain probe error refuses without retry", 1, 1, 1,
        binds=("busy",), probes=("other_error",))
    run("non-address bind error does not probe or retry", 1, 1, 0, binds=("denied",))
    r = run("repeated refused endpoint reaches fixed deadline", 1, 240, 240, binds=("busy",))
    require(r["simulated_elapsed_seconds"] == 60.0 and "after 60 seconds" in r["stderr"],
            "Deadline was extended or not reported")
    r = run("probe timeout is capped by remaining deadline", 1, 1, 1,
            binds=("busy",), bind_elapsed=59.9, probes=("timeout",))
    require(abs(r["simulated_elapsed_seconds"] - 60.0) < 1e-8,
            "Remaining deadline cap was not honored")
    r = run("incumbent appears after refused probe; next bind remains non-reuse", 1, 2, 2,
            binds=("busy", "busy"), probes=("refused", "reachable"))
    require(r["sleep_calls"] == 1 and r["probe_closes"] == 1, "New incumbent caused another retry")
    r = run("Ctrl-C cancels startup wait without worker", 0, 1, 1,
            binds=("busy",), sleep_interrupt=True)
    require("startup cancelled" in r["stdout"] and r["stderr"] == "", "Cancellation not controlled")
    run("Linux busy bind retains existing immediate policy", 1, 1, 0,
        platform="linux", binds=("busy",))
    run("other-platform busy bind retains existing immediate policy", 1, 1, 0,
        platform="win32", binds=("busy",))
    run("invalid assets stop before all socket boundaries", 1, 0, 0, bad_assets=True)
    run("unexpected arguments stop before admission", 2, 0, 0, extra_argument=True)
    run("fresh Linux start retains existing cleanup", 0, 1, 0, platform="linux")
    require(args.source.read_bytes() == source, "Source changed during review")
    receipt = {"schema": "returnby-independent-public-main-policy-v1",
               "source": str(args.source), "source_bytes": len(source),
               "source_sha256": SOURCE_SHA256, "source_unchanged": True,
               "host_platform": sys.platform, "python": sys.version.split()[0],
               "optimize": sys.flags.optimize,
               "scope": "Actual frozen main() with stubbed socket/server/time/worker boundaries; no sockets, threads or Mac processes opened. Kernel exclusion and wall-clock timing are separately qualified by native owner controls.",
               "courses": results, "passed": True}
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(receipt, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"passed": True, "courses": len(results), "optimize": sys.flags.optimize,
                      "source_sha256": SOURCE_SHA256, "output": str(args.output)}))


if __name__ == "__main__":
    main()
