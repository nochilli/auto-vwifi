chrome.runtime.onStartup.addListener(function () {
	startup();
});

chrome.runtime.onMessage.addListener(function (request) {
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
// chrome.runtime.onInstalled.addListener(() => {
//   chrome.tabs.create({ url: "github link" });
// });

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
	chrome.storage.local.get(null, function (data) {
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
							chrome.tabs.create({
								url: "http://phc.prontonetworks.com/cgi-bin/authlogin",
							});
						}
					})
					.catch((error) => {
						return 0;
					});
			}
		} else chrome.storage.local.set({ enable: "#77d458" });
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
				chrome.runtime.sendMessage({ logout_success: true });
			} else if (patt_no_active.test(responseText)) {
				chrome.runtime.sendMessage({ logout_success: false });
			} else {
				chrome.runtime.sendMessage({ logout_unknown_error: true });
			}
		})
		.catch((error) => {
			if (error.name === "TypeError") {
				chrome.runtime.sendMessage({ network_error: true });
				return 0;
			}
			console.error(
				"There was a problem with the logout fetch operation:",
				error
			);
		});
}

function showNotification(id, options) {
	chrome.notifications.create(id, options, (notificationId) => {
		if (chrome.runtime.lastError) {
			console.error("Notification error:", chrome.runtime.lastError);
		}
	});
}

function login(firstRun, formUser, formPassword) {
	firstRun || (firstRun = false);
	chrome.storage.local.get(null, function (data) {
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
					chrome.runtime.sendMessage({ login_success: true });
					return 0;
				} else if (patt_quota_over.test(responseText)) {
					chrome.runtime.sendMessage({ quota_over: true });
					return 2;
				} else if (
					patt_sorry.test(responseText) &&
					patt_tryAgain.test(responseText)
				) {
					chrome.runtime.sendMessage({ login_success: false });
					return 1;
				} else if (patt_already.test(responseText)) {
					if (!firstRun) {
						chrome.runtime.sendMessage({ already_logged_in: true });
						return 3;
					}
				} else {
					console.log(response.text());
				}
			})
			.catch((error) => {
				if (error.name === "ReferenceError") {
					chrome.runtime.sendMessage({ empty_creds: true });
					return 0;
				}
				if (error.name === "TypeError") {
					chrome.runtime.sendMessage({ network_error: true });
					return 0;
				}
				if (error.name === "AbortError") {
					chrome.runtime.sendMessage({ login_timed_out: true });
					showNotification("id_timeout", opt_login_timeout);
				}
			})
			.finally(() => {
				clearTimeout(timeoutId);
			});
	});
}

chrome.webRequest.onErrorOccurred.addListener(
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
