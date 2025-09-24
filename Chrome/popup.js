function setStatus(val) {
	document.querySelector("h5").textContent = val;
}

document.addEventListener(
	"DOMContentLoaded",
	function () {
		var enableButton = document.getElementById("enable");
		var loginButton = document.getElementById("login");
		var logoutButton = document.getElementById("logout");
		enabled = "#000";

		chrome.storage.local.get(null, function (data) {
			if (data.username != (undefined || null)) {
				document.getElementById("username").value = data.username;
				document.getElementById("password").value = data.password;
				enabled = data.enable;
				document.getElementById("enable").style.backgroundColor = enabled;
			}
		});

		chrome.runtime.onMessage.addListener(function (request) {
			if (request.login_success) setStatus("✅ Logged in");
			else if (request.network_error) setStatus("⛔ Network Error ⛔");
			else if (request.logout_success) setStatus("✅ Logged out");
			else if (request.already_logged_in) setStatus("🛜 Logged in");
			else if (request.login_timed_out) setStatus("🚧 Login Timed Out");
			else if (request.quota_over) setStatus("🚧 Quota Exceeded");
			else if (!request.logout_success) setStatus("🛜 Logged out");
			else if (request.empty_creds || !request.login_success)
				setStatus("⛔ Invalid credentials ⛔");
			else if (!request.logout_success || request.logout_unknown_error)
				setStatus("⛔ Logout Error ⛔");
		});

		loginButton.addEventListener("click", function () {
			setStatus("🚧 Logging in");
			var f = document.getElementById("form1");
			username = f.elements["username"].value;
			password = f.elements["password"].value;
			chrome.storage.local.set(
				{ username: username, password: password },
				function () {}
			);

			chrome.runtime.sendMessage({
				login: true,
				username: f.elements["username"].value,
				password: f.elements["password"].value,
			});
		});

		logoutButton.addEventListener("click", function () {
			setStatus("🚧 Logging out");
			chrome.runtime.sendMessage({ logout: true });
		});

		enableButton.addEventListener("click", function () {
			enabled = enabled == "#77d458" ? "#e77979" : "#77d458";
			chrome.storage.local.set({ enable: enabled });
			document.getElementById("enable").style.backgroundColor = enabled;

			if (enabled === "#77d458") setStatus("✅ Autologin Enabled");
			else setStatus("⛔ Autologin Disabled");
		});
	},
	false
);
