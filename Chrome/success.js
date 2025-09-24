function setStatus(val) {
	document.querySelector("h5").textContent = val;
}

document.addEventListener(
	"DOMContentLoaded",
	function () {
		const buttonlink = ["http://136.233.9.110/registration/Main.jsp?wispId=1"];
		chrome.storage.local.get(null, function (data) {
			buttonlink[0] = data.sessionID;
		});
		chrome.runtime.onMessage.addListener(function (request) {
			if (request.logout_success) setStatus("✅ Logged out");
			else if (request.network_error) setStatus("⛔ Network Error ⛔");
			else if (!request.logout_success) setStatus("🛜 Logged out");
		});
		
		var infoButton = document.getElementById("info");
		var logoutButton = document.getElementById("logout");

		infoButton.addEventListener("click", function () {
			chrome.tabs.create({
				url: buttonlink[0],
			});
		});

		logoutButton.addEventListener("click", function () {
			setStatus("🚧 Logging out");
			chrome.runtime.sendMessage({ logout: true });
		});
	},
	false
);

window.addEventListener("load", () => {
	setTimeout(() => {
		window.close();
	}, 10000);
});
