(function () {
  const dot = document.getElementById("status-dot");
  if (!dot) return;

  fetch("https://videos.ssgf.com.br/status.json?t=" + Date.now())
    .then(res => res.json())
    .then(data => {
      const ok = data.nginx && data.cloudflared && data.reachable;
      dot.classList.add(ok ? "ok" : "fail");
    })
    .catch(() => {
      dot.classList.add("fail");
    });
})();
