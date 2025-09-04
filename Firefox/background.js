browser.runtime.onInstalled.addListener(() => {
	if (details.reason == "install") {
		browser.tabs.create({
			url: "https://nochilli.github.io/auto-vwifi",
		});
	}
});

browser.runtime.onStartup.addListener(function () {
	startup();
});

browser.runtime.onMessage.addListener(function (request) {
	if (request.error == true) {
		console.log("Incorrect credentials");
	}
	if (request.login == true) {
		login(false, request.username, request.password);
	}
	if (request.logout == true) {
		logout();
	}
});

var opt_login_timeout = {
	type: "basic",
	title: "⛔ Request Timed Out",
	message: "Please check your connection or try again later",
	iconUrl: "/assets/icon128.png",
};

var opt_no_wifi = {
	type: "basic",
	title: "⛔ Wi-Fi Disconnected",
	message: "Please check your connection",
	iconUrl: "/assets/icon128.png",
};

var opt_network_changed = {
	type: "basic",
	title: "⛔ Network Changed",
	message: "Please try again later",
	iconUrl: "/assets/icon128.png",
};

var opt_name_not_resolved = {
	type: "basic",
	title: "⛔ Network Error",
	message: "Try disconnecting and reconnecting to VOLSBB",
	iconUrl: "/assets/icon128.png",
};

async function startup() {
	enabled = "a";
	browser.storage.local.get(null, function (data) {
		if (data.enable != (undefined || null)) {
			enabled = data.enable;
			if (enabled == "#77d458") {
				fetch("http://phc.prontonetworks.com/cgi-bin/authlogin", {
					method: "GET",
				})
					.then((response) => {
						if (!response.ok) {
						}
						return response.text();
					})
					.then((responseText) => {
						if (responseText.includes("WiFi Login Portal")) {
							browser.tabs.create({
								url: "http://phc.prontonetworks.com/cgi-bin/authlogin",
							});
						}
					})
					.catch((error) => {
						return 0;
					});
			}
		} else browser.storage.local.set({ enable: "#77d458" });
	});
}

function logout() {
	fetch("http://phc.prontonetworks.com/cgi-bin/authlogout", {
		method: "GET",
		mode: "cors",
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response not ok");
			}
			return response.text();
		})
		.then((responseText) => {
			var patt_logout = new RegExp("successfully logged out", "i");
			var patt_no_active = new RegExp("no active session", "i");

			if (patt_logout.test(responseText)) {
				browser.runtime.sendMessage({ logout_success: true });
			} else if (patt_no_active.test(responseText)) {
				browser.runtime.sendMessage({ logout_success: false });
			} else {
				browser.runtime.sendMessage({ logout_unknown_error: true });
			}
		})
		.catch((error) => {
			if (error.name === "TypeError") {
				browser.runtime.sendMessage({ network_error: true });
				return 0;
			}
			console.error(
				"There was a problem with the logout fetch operation:",
				error
			);
		});
}

function showNotification(id, options) {
	browser.notifications.create(id, options, (notificationId) => {
		if (browser.runtime.lastError) {
			console.error("Notification error:", browser.runtime.lastError);
		}
	});
}

function login(firstRun, formUser, formPassword) {
	firstRun || (firstRun = false);
	browser.storage.local.get(null, function (data) {
		var username = typeof formUser === undefined ? data.username : formUser;
		var password =
			typeof formPassword === undefined ? data.password : formPassword;

		const controller = new AbortController();
		const signal = controller.signal;

		const timeoutId = setTimeout(() => {
			controller.abort();
		}, 7000);

		fetch("http://phc.prontonetworks.com/cgi-bin/authlogin", {
			method: "POST",
			headers: {
				"Content-type": "application/x-www-form-urlencoded",
			},
			body:
				"userId=" +
				username +
				"&password=" +
				password +
				"&serviceName=ProntoAuthentication&Submit22=Login",
			mode: "cors",
			signal: signal,
		})
			.then((response) => {
				console.log(response);
				if (!response.ok) {
					console.error(response.text());
					throw new Error("Network response was not ok");
				}
				return response.text();
			})
			.then((responseText) => {
				var patt_success = /WiFi Access Granted/i;
				var patt_already = /already logged in/i;
				var patt_quota_over = /quota is over/i;
				var patt_sorry = /sorry/i;
				var patt_tryAgain = /try again/i;

				if (patt_success.test(responseText)) {
					browser.runtime.sendMessage({ login_success: true });
					return 0;
				} else if (patt_quota_over.test(responseText)) {
					browser.runtime.sendMessage({ quota_over: true });
					return 2;
				} else if (
					patt_sorry.test(responseText) &&
					patt_tryAgain.test(responseText)
				) {
					browser.runtime.sendMessage({ login_success: false });
					return 1;
				} else if (patt_already.test(responseText)) {
					if (!firstRun) {
						browser.runtime.sendMessage({ already_logged_in: true });
						return 3;
					}
				} else {
					console.log(response.text());
				}
			})
			.catch((error) => {
				if (error.name === "ReferenceError") {
					browser.runtime.sendMessage({ empty_creds: true });
					return 0;
				}
				if (error.name === "TypeError") {
					browser.runtime.sendMessage({ network_error: true });
					return 0;
				}
				if (error.name === "AbortError") {
					browser.runtime.sendMessage({ login_timed_out: true });
					showNotification("id_timeout", opt_login_timeout);
				}
			})
			.finally(() => {
				clearTimeout(timeoutId);
			});
	});
}

browser.webRequest.onErrorOccurred.addListener(
	function (details) {
		if (details.error == "net::ERR_INTERNET_DISCONNECTED") {
			showNotification("id_no_wifi", opt_no_wifi);
		}
		if (details.error == "net::ERR_NETWORK_CHANGED") {
			showNotification("id_net_changed", opt_network_changed);
		}
		if (details.error == "net::ERR_NAME_NOT_RESOLVED") {
			showNotification("id_name_not_resolved", opt_name_not_resolved);
		}
	},
	{
		urls: ["*://*/*"],
		types: ["xmlhttprequest"],
	}
);
