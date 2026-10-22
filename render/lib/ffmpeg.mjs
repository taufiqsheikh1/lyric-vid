import { spawn } from "node:child_process";

export function run(cmd, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}\n${stderr.slice(-4000)}`));
    });
  });
}

export async function probeDuration(file) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number(stdout.trim());
}

/**
 * Encode a PNG frame sequence + optional audio into the master MP4.
 * `startNumber` must match the first frame's index in the glob.
 */
export async function encodeFrames({
  frameGlob,
  startNumber = 0,
  fps,
  audioPath,
  outPath,
  video = {},
  audioBitrate = "320k",
}) {
  const args = [
    "-y",
    "-framerate",
    String(fps),
    "-start_number",
    String(startNumber),
    "-i",
    frameGlob,
  ];
  if (audioPath) args.push("-i", audioPath);

  args.push("-c:v", video.codec || "libx264", "-preset", video.preset || "veryslow");
  if (video.crf != null) args.push("-crf", String(video.crf));
  if (video.profile) args.push("-profile:v", video.profile);
  if (video.pixFmt) args.push("-pix_fmt", video.pixFmt);

  if (audioPath) {
    args.push("-c:a", "aac", "-b:a", audioBitrate, "-shortest");
  }

  args.push("-movflags", "+faststart", outPath);
  await run("ffmpeg", args);
  return outPath;
}

export async function tileFrames({ inputGlob, outPath, grid = "4x4", tileWidth = 320 }) {
  await run("ffmpeg", [
    "-y",
    "-framerate",
    "1",
    "-i",
    inputGlob,
    "-vf",
    `scale=${tileWidth}:-1,tile=${grid}`,
    "-frames:v",
    "1",
    outPath,
  ]);
  return outPath;
}
