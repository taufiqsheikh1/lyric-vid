#!/usr/bin/env node
// Rents a GPU box on vast.ai, uploads this project, runs the deterministic
// final render there, downloads the master, and (by default) destroys the box.
//
// Safety: requires --yes to actually spend money. Use --dry-run to preview.
//
//   set VAST_API_KEY=...            (or pass --api-key)
//   node vastai/render-on-vast.mjs --song my-song --profile final --yes
//   node vastai/render-on-vast.mjs --song my-song --dry-run
//
// Requires the `vastai` CLI (pip install vastai) and `ssh` on PATH.
import { spawnSync } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../scripts/lib/env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv();

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) a[k] = true;
    else (a[k] = n), i++;
  }
  return a;
}

function sh(bin, args, { capture = true, dry = false, cwd } = {}) {
  if (dry) {
    console.log("  $ " + bin + " " + args.join(" "));
    return "";
  }
  const res = spawnSync(bin, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${bin} ${args.join(" ")} failed (${res.status})\n${res.stderr || ""}`);
  }
  return res.stdout || "";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = JSON.parse(await fs.readFile(path.resolve(ROOT, "vastai/vast.config.json"), "utf8"));
  const dry = Boolean(args["dry-run"]);
  const confirmed = Boolean(args.yes);
  const keep = Boolean(args.keep);
  const song = args.song;
  const profile = args.profile || "final";
  const useGpu = args["no-gpu"] ? "0" : "1";

  if (!song) throw new Error("Pass --song <name>");
  if (!existsSync(path.resolve(ROOT, "songs", song, "scene.js"))) {
    throw new Error(`songs/${song}/scene.js not found`);
  }
  if (!confirmed && !dry) {
    throw new Error("Refusing to spend money without --yes (use --dry-run to preview).");
  }

  const vastKey = args["api-key"] || process.env.VAST_API_KEY;
  if (vastKey) sh("vastai", ["set", "api-key", vastKey], { dry });

  // 1. search offers ---------------------------------------------------------
  console.log(`▶ searching offers: ${cfg.query}  (sort ${cfg.sort})`);
  const offersRaw = sh("vastai", ["search", "offers", cfg.query, "-o", cfg.sort, "--raw"], { dry });
  const offers = dry ? [] : JSON.parse(offersRaw || "[]");
  const affordable = offers.filter((o) => (o.dph_total ?? Infinity) <= (cfg.maxDph ?? Infinity));
  if (!dry && !affordable.length) throw new Error("No offers within maxDph. Raise maxDph or relax query.");
  const offer = affordable[0];
  if (offer) {
    console.log(
      `  picked offer ${offer.id}: ${offer.gpu_name} x${offer.num_gpus}  $${offer.dph_total.toFixed(3)}/hr  ` +
        `cpu_cores_effective=${offer.cpu_cores_effective ?? "?"} ram=${offer.cpu_ram ?? "?"}MB disk=${offer.disk_space}MB`
    );
  }

  // 2. create instance -------------------------------------------------------
  const createArgs = [
    "create",
    "instance",
    String(offer?.id ?? 0),
    "--image",
    cfg.image,
    "--disk",
    String(cfg.diskGb),
    "--ssh",
    "--direct",
    "--label",
    cfg.label,
  ];
  if (cfg.bidPrice) createArgs.push("--bid_price", String(cfg.bidPrice), "--cancel-unavail");
  console.log("▶ creating instance (spot=" + Boolean(cfg.bidPrice) + ")");
  const createOut = sh("vastai", createArgs, { dry });
  let instanceId = null;
  if (!dry) {
    try {
      instanceId = JSON.parse(createOut).new_contract;
    } catch {
      const m = createOut.match(/"new_contract":\s*(\d+)/);
      instanceId = m ? Number(m[1]) : null;
    }
  }
  console.log(`  instance id: ${instanceId ?? "(dry-run)"}`);
  if (dry) {
    console.log("(dry-run) would upload, render, download, destroy.");
    return;
  }

  try {
    // 3. wait for running ----------------------------------------------------
    console.log("▶ waiting for instance to run (first boot pulls the image)...");
    let status = "";
    for (let i = 0; i < 120; i++) {
      const raw = sh("vastai", ["show", "instance", String(instanceId), "--raw"]);
      let info;
      try {
        info = JSON.parse(raw);
      } catch {
        info = {};
      }
      status = info.actual_status || info.cur_state || "";
      process.stdout.write(`\r  status=${status} (${i * 10}s)   `);
      if (status === "running") break;
      if (status === "exited" || status === "offline" || status === "unknown") {
        throw new Error(`Instance entered terminal state: ${status}. Destroy and retry.`);
      }
      await sleep(10000);
    }
    process.stdout.write("\n");
    if (status !== "running") throw new Error("Timed out waiting for instance.");

    const sshUrl = sh("vastai", ["ssh-url", String(instanceId)]).trim();

    // 4. upload project tarball ---------------------------------------------
    const tarPath = path.resolve(ROOT, "tmp/project.tar.gz");
    await fs.mkdir(path.dirname(tarPath), { recursive: true });
    console.log("▶ packaging project");
    sh(
      "tar",
      [
        "-czf",
        tarPath,
        "--exclude=node_modules",
        "--exclude=.git",
        "--exclude=output",
        "--exclude=frames",
        "--exclude=player/dist",
        "--exclude=tmp",
        "--exclude=.cache",
        ".",
      ],
      { cwd: ROOT, capture: false }
    );
    console.log("▶ uploading");
    sh("vastai", ["copy", tarPath, `C.${instanceId}:${cfg.remoteDir}/project.tar.gz`]);
    sh("ssh", [sshUrl, `cd ${cfg.remoteDir} && tar -xzf project.tar.gz && rm project.tar.gz`], {
      capture: false,
    });

    // 5. render --------------------------------------------------------------
    console.log("▶ rendering on vast.ai");
    sh("ssh", [sshUrl, `cd ${cfg.remoteDir} && bash vastai/render-remote.sh ${song} ${profile} ${useGpu}`], {
      capture: false,
    });

    // 6. download ------------------------------------------------------------
    await fs.mkdir(path.resolve(ROOT, "output"), { recursive: true });
    console.log("▶ downloading master");
    sh("vastai", [
      "copy",
      `C.${instanceId}:${cfg.remoteDir}/output/${song}.mp4`,
      path.resolve(ROOT, "output", `${song}.mp4`),
    ]);
    console.log(`✓ output/${song}.mp4`);
  } finally {
    if (!keep) {
      console.log("▶ destroying instance");
      sh("vastai", ["destroy", "instance", String(instanceId)], { capture: false });
    } else {
      console.log(`  kept instance ${instanceId} (destroy later with: vastai destroy instance ${instanceId})`);
    }
  }
}

main().catch((e) => {
  console.error("\n✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});
