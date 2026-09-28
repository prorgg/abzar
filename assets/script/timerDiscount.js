// 5. تایمر شمارش معکوس
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const daysEl = document.getElementById("days");
if (daysEl) {
  let totalSeconds = 18 * 24 * 3600 + 2 * 3600 + 34 * 60 + 60;
  const pad = (n) => String(n).padStart(2, "0");
  function renderTimer() {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    daysEl.textContent = pad(d);
    if (document.getElementById("hours"))
      document.getElementById("hours").textContent = pad(h);
    if (document.getElementById("minutes"))
      document.getElementById("minutes").textContent = pad(m);
    if (document.getElementById("seconds"))
      document.getElementById("seconds").textContent = pad(s);
  }
  renderTimer();
  setInterval(() => {
    if (totalSeconds > 0) {
      totalSeconds--;
      renderTimer();
    }
  }, 1000);
}
});

