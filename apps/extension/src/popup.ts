document.getElementById("open-dashboard")?.addEventListener("click", () => {
  chrome.tabs.create({ url: import.meta.env.VITE_WEB_LOGIN_URL || "http://localhost:5173" });
});
