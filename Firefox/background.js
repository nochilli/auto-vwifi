browser.runtime.onInstalled.addListener((details) => {
	if (details.reason === "install") {
		browser.tabs.create({ url: "https://nochilli.github.io/auto-vwifi/" });
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
	if (request.redirect) {
		browser.storage.local.set({ sessionID: request.redirect }, function () {});
		browser.tabs.query(
			{ url: "*://phc.prontonetworks.com/*" },
			function (tabs) {
				browser.tabs.update(tabs[0].id, {
					url: browser.runtime.getURL("success.html"),
				});
			}
		);
	}
});

var opt_login_timeout = {
	type: "basic",
	title: "⛔ Request Timed Out",
	message: "Please check your connection or try again later",
	iconUrl: "/assets/vwifi128.png",
};

var opt_other_network = {
	type: "basic",
	title: "⛔ You're Not Connected To VIT Wi-Fi!",
	message: "Auto VIT Wi-Fi only works when connected to VIT Wi-Fi",
	iconUrl: "/assets/vwifi128.png",
};

var opt_network_changed = {
	type: "basic",
	title: "⛔ Network Changed",
	message: "Please try again later",
	iconUrl: "/assets/vwifi128.png",
};

var opt_name_not_resolved = {
	type: "basic",
	title: "⛔ Network Error",
	message: "Try reconnecting to VIT Wi-Fi",
	iconUrl: "/assets/vwifi128.png",
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
		method: "POST",
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
				if (!response.ok) {
					console.error(response.text());
					throw new Error("Network response was not ok");
				}
				return response.text();
			})
			.then((responseText) => {
				if (/successful pronto authentication/i.test(responseText)) {
					browser.runtime.sendMessage({ login_success: true });
					return 0;
				} else if (/quota is over/i.test(responseText)) {
					browser.runtime.sendMessage({ quota_over: true });
					return 2;
				} else if (
					/sorry/i.test(responseText) &&
					/try again/i.test(responseText)
				) {
					browser.runtime.sendMessage({ login_success: false });
					return 1;
				} else if (/already logged in/i.test(responseText)) {
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
		if (details.error == "net::ERR_INTERNET_DISCONNECTED")
			showNotification("id_no_wifi", opt_no_wifi);
		if (details.error == "net::ERR_NETWORK_CHANGED")
			showNotification("id_net_changed", opt_network_changed);
		if (details.error == "net::ERR_NAME_NOT_RESOLVED")
			showNotification("id_name_not_resolved", opt_other_network);
	},
	{
		urls: ["*://*/*"],
		types: ["xmlhttprequest"],
	}
);
