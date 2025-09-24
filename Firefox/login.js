browser.storage.local.get(null, function (data) {
	if (data.enable != (undefined || null)) {
		if (data.enable == "#77d458") {
			if (document.getElementsByClassName("orangeText10").length == 4) {
				const urls = [];
				const elements = document.getElementsByClassName("orangeText10");
				for (let el of elements) {
					urls.push(el.href);
				}
				browser.runtime.sendMessage({ redirect: urls[1] });
			}
			try {
				var f = document.getElementsByTagName("form")[0]
					? document.getElementsByTagName("form")[0]
					: undefined;
				if (f !== undefined) {
					browser.storage.local.get(null, function (obj) {
						f.elements["userId"].value = obj.username;
						f.elements["password"].value = obj.password;
						f.submit();
					});
				}
			} catch (e) {
				console.log("Pronto Auto Login Error: Could not get form", e);
			}

			try {
				var err2 = document.getElementsByName("dynamicMacAuth")[0];

				var patt1 = /Sorry, please check/i;
				var patt2 = /try again/i;
				var responseText = document.getElementsByTagName("html")[0].innerHTML;
				var incorrect_cred =
					patt1.test(responseText) || patt2.test(responseText) || err2;
				if (incorrect_cred) {
					alert(
						"Invalid credentials! Please update autologin credentials in the extension popup."
					);
					browser.runtime.sendMessage({ error: true });
				}
			} catch (e) {
				console.log(e);
			}
		}
	} else browser.storage.local.set({ enable: "#77d458" });
});
