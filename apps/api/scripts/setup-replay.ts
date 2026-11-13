import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, rm, symlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve, join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, "../../..");
const flag = process.argv.indexOf("--output");
const output =
  flag >= 0
    ? resolve(process.argv[flag + 1]!)
    : join(root, ".data/replay-parser");
const systemJava = process.argv.includes("--system-java");
const commit = "67945be040de92d0ba9cdedc77434886d4f736be";
const sourceHash =
  "8c62e2cdd9dce0f83ff892460a7bb397f3a239ca69c83f67147bdb5ded4fc033";
if (process.platform === "win32")
  throw new Error(
    "Build the replay parser using the project's Dockerfile on Windows.",
  );
await mkdir(output, { recursive: true, mode: 0o700 });
async function download(
  url: string,
  path: string,
  algorithm: string,
  checksum: string,
) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) throw new Error("Could not download replay build tools.");
  await Bun.write(path, response);
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest("hex") !== checksum.trim().split(/\s/)[0])
    throw new Error("Replay build tool checksum mismatch.");
}
async function extract(archive: string, target: string) {
  await mkdir(target, { recursive: true });
  await execute("tar", ["-xf", archive, "--strip-components=1", "-C", target]);
}
let javaHome = process.env.JAVA_HOME;
let maven = process.env.REPLAY_MAVEN_BIN ?? "mvn";
if (!systemJava) {
  javaHome = join(output, "java");
  if (!existsSync(join(javaHome, "bin/java"))) {
    const os = process.platform === "darwin" ? "mac" : "linux";
    const arch =
      process.arch === "arm64"
        ? "aarch64"
        : process.arch === "x64"
          ? "x64"
          : null;
    if (!arch) throw new Error("Unsupported replay parser architecture.");
    const response = await fetch(
      `https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=${arch}&image_type=jdk&os=${os}&vendor=eclipse`,
    );
    if (!response.ok) throw new Error("Could not resolve Java 21.");
    const assets = (await response.json()) as {
      binary: { package: { link: string; checksum: string } };
    }[];
    const pkg = assets[0]!.binary.package,
      archive = join(output, "java.tar.gz"),
      unpacked = join(output, "unpacked-java");
    await download(pkg.link, archive, "sha256", pkg.checksum);
    await extract(archive, unpacked);
    await symlink(
      existsSync(join(unpacked, "Contents/Home"))
        ? join(unpacked, "Contents/Home")
        : unpacked,
      javaHome,
      "dir",
    );
    await rm(archive);
  }
  maven = join(output, "maven/bin/mvn");
  if (!existsSync(maven)) {
    const url =
      "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.12/apache-maven-3.9.12-bin.tar.gz";
    const checksum = await (await fetch(`${url}.sha512`)).text(),
      archive = join(output, "maven.tar.gz");
    await download(url, archive, "sha512", checksum);
    await extract(archive, join(output, "maven"));
    await rm(archive);
  }
}
if (!javaHome)
  throw new Error(
    "JAVA_HOME must point to a Java 21 JDK when using --system-java.",
  );
const archive = join(output, "source.tar.gz"),
  source = join(output, "source"),
  adapter = join(output, "adapter");
await download(
  `https://codeload.github.com/odota/parser/tar.gz/${commit}`,
  archive,
  "sha256",
  sourceHash,
);
await extract(archive, source);
await execute(
  maven,
  [
    "-B",
    "-q",
    "-f",
    join(source, "pom.xml"),
    `-Dmaven.repo.local=${join(output, "m2")}`,
    `-Duser.home=${join(output, "home")}`,
    "-DskipTests",
    "package",
  ],
  { env: { ...process.env, JAVA_HOME: javaHome }, maxBuffer: 4 * 1024 * 1024 },
);
const jar = join(output, "parser.jar");
await copyFile(join(source, "target/stats-0.1.0.jar"), jar);
await execute(join(javaHome, "bin/javac"), [
  "-proc:none",
  "-cp",
  jar,
  "-d",
  adapter,
  join(root, "apps/api/replay-parser/ReplayImport.java"),
]);
await execute(join(javaHome, "bin/jar"), ["uf", jar, "-C", adapter, "."]);
await copyFile(join(source, "LICENSE"), join(output, "LICENSE"));
await rm(archive);
console.log(`Replay parser built from OpenDota ${commit}.`);
console.log(
  systemJava
    ? "Set REPLAY_JAVA_BIN to the Java 21 runtime executable."
    : "Local replay import is ready. Restart the API if it is already running.",
);
