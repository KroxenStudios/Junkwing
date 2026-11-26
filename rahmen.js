const workerUrl = "https://frame-embed.kroxenstudios.workers.dev";

function runAfterDomReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
}

function showFrameNotice(message) {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:999999;background:#000;display:grid;place-items:center;padding:20px";

  const box = document.createElement("div");
  box.style.cssText =
    "max-width:500px;background:#111;color:white;padding:24px;border-radius:12px;font:16px sans-serif;text-align:center";

  const text = document.createElement("p");
  text.textContent = message;

  const link = document.createElement("a");
  link.href = "https://kroxenstudios.github.io/Junkwing/";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open Junkwing in a new Window";
  link.style.cssText =
    "display:inline-block;padding:10px 18px;margin-top:12px;background:#fff;color:#111;border-radius:4px;text-decoration:none";

  box.append(text, link);
  overlay.append(box);
  document.body.append(overlay);
}

if (window.top !== window.self) {
  navigator.sendBeacon(
    workerUrl,
    new Blob(["frame-embed"], { type: "text/plain" })
  );

  fetch(`${workerUrl}/message`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: document.referrer
  })
    .then(response => {
      if (!response.ok) throw new Error("Worker request failed");
      return response.text();
    })
    .then(message => {
      runAfterDomReady(() => showFrameNotice(message));
    })
    .catch(() => {
      runAfterDomReady(() =>
        showFrameNotice("This Game was opened in a frame")
      );
    });
}
