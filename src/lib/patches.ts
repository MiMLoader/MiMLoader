import { file, spawn } from "bun";
import { join } from "node:path";

export const enableDevtools = async () => {
  console.time("Patch: Enabling devtools");
  const gameFile = file("game/package.nw/package.json");
  const gameJson: { "chromium-args": string } = await gameFile.json();

  gameJson["chromium-args"] = gameJson["chromium-args"].replace(
    "--disable-devtools",
    "",
  );

  await gameFile.write(JSON.stringify(gameJson));
  console.timeEnd("Patch: Enabling devtools");
};

export const enableProxy = async () => {
  console.time("Patch: Enable proxy");
  const htmlFile = file("game/package.nw/index.html");
  const htmlText = await htmlFile.text();

  const engineFile = file("game/package.nw/scripts/c3runtime.js");
  const engineText = await engineFile.text();

  htmlFile.write(
    htmlText.replace(
      "</head>",
      `<script>
        const proxyList = process.env.proxyListFetch ? JSON.parse(process.env.proxyListFetch) : []
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
          if (proxyList.includes(args[0])) {
            const modifiedUrl = \`http://localhost:5131/proxy/\${args[0]}\`
            const options = args[1] ? {...args[1]}: {};
            return originalFetch(modifiedUrl, options);
          }
          return originalFetch(...args);
        };
    </script></head>`,
    ),
  );

  engineFile.write(
    engineText.replace(
      '"use strict";',
      `"use strict";
      const originalXHR = XMLHttpRequest;
      const proxyList = process.env.proxyListXHR ? JSON.parse(process.env.proxyListXHR) : []
      function newXHR() {
          const xhr = new originalXHR();
          xhr.open = function(method, url) {
              const modifiedUrl = url;
              if (proxyList.includes(url)) {
                const modifiedUrl = \`http://localhost:5131/proxy/\${url}\`
                return originalXHR.prototype.open.call(this, method, modifiedUrl);
              }
              return originalXHR.prototype.open.call(this, method, url);
          };
          return xhr;
      }
      XMLHttpRequest = newXHR;
  `,
    ),
  );

  console.timeEnd("Patch: Enable proxy");
};

export const legacyRuntimeMods = async () => {
  console.time("Patch: Legacy runtime mods");
  const htmlFile = file("game/package.nw/index.html");
  const htmlText = await htmlFile.text();

  htmlFile.write(
    htmlText.replace(
      "</body>",
      '<script src="http://localhost:5131/compiledmods" defer></script></body>',
    ),
  );

  console.timeEnd("Patch: Legacy runtime mods");
};

export const installWaldoPackage: () => Promise<void> = () =>
  new Promise((resolve) => {
    spawn([process.execPath, "install", "github:mimloader/waldo"], {
      env: { BUN_BE_BUN: "true" },
      stdout: "inherit",
      cwd: join(process.cwd(), "mods"),
      onExit: () => {
        spawn([process.execPath, "update", "--latest"], {
          env: { BUN_BE_BUN: "true" },
          stdout: "inherit",
          cwd: join(process.cwd(), "mods"),
          onExit: () => resolve(),
        });
      },
    });
  });
