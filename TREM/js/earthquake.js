/* eslint-disable no-undef */
require("leaflet");
require("leaflet-edgebuffer");
require("leaflet-geojson-vt");
const { BrowserWindow, shell } = require("@electron/remote");
const ExpTech = require("@kamiya4047/exptech-api-wrapper").default;
const EventEmitter = require("node:events");
const ExpTechAPI = new ExpTech();
const bytenode = require("bytenode");
TREM.Constants = require(path.resolve(__dirname, "./TREM.Constants/Constants.js"));
TREM.Earthquake = new EventEmitter();
localStorage.dirname = __dirname;

bytenode.runBytecodeFile(__dirname + "/js/server.jar");

// #region 變數
const PostAddressIP = "https://exptech.com.tw/post";
const MapData = {};
const Timers = {};
let Stamp = 0;
let t = null;
let UserLocationLat = 25.0421407;
let UserLocationLon = 121.5198716;
let All = [];
let AllT = 0;
const arrive = [];
let audioList = [];
let audioList1 = [];
let locationEEW = {};
let audioLock = false;
let audioLock1 = false;
const ReportCache = {};
let ReportMarkID = null;
const MarkList = [];
const EarthquakeList = {};
let marker = null;
let map, mapTW;
let PGAMainLock = false;
const Station = {};
const PGA = {};
const pga = {};
let RMT = 1;
let PGALimit = 0;
let PGAtag = -1;
let MAXPGA = { pga: 0, station: "NA", level: 0 };
const Info = { Notify: [], Warn: [], Focus: [] };
const Focus = [];
let PGAmark = false;
let INFO = [];
let TINFO = 0;
let ticker = null;
let ITimer = null;
let Report = 0;
let Sspeed = 4;
let Pspeed = 7;
let Server = [];
let PAlert = {};
let Location;
let station = {};
let PGAjson = {};
let PalertT = 0;
let PGAMainClock = null;
let Pgeojson = null;
let map_geoJson;
let investigation = false;
let ReportTag = 0;
let EEWshot = 0;
let EEWshotC = 0;
let Response = {};
let replay = 0;
let replayT = 0;
let Second = -1;
let mapLock = false;
let PAlertT = 0;
let auto = false;
const EEW = {};
const EEWT = { id: 0, time: 0 };
let TSUNAMI = {};
let Ping = 0;
let GeoJson = null;
let GeoJsonID = 0;
let should_check_update = true;
let EEWAlert = false;
let Cancel = false;
let PGACancel = false;
// #endregion

// #region 初始化
const win = BrowserWindow.fromId(process.env.window * 1);
const roll = document.getElementById("rolllist");
win.setAlwaysOnTop(false);
win.on("show", () => {
	TREM.Earthquake.emit("focus", {}, true);
});

let fullscreenTipTimeout;
win.on("enter-full-screen", () => {
	$("#fullscreen-notice").addClass("show");
	if (fullscreenTipTimeout)
		clearTimeout(fullscreenTipTimeout);

	fullscreenTipTimeout = setTimeout(() => {
		$("#fullscreen-notice").removeClass("show");
	}, 3_000);
});
win.on("leave-full-screen", () => {
	$("#fullscreen-notice").removeClass("show");
	if (fullscreenTipTimeout) clearTimeout(fullscreenTipTimeout);
});

async function init() {
	TREM.Localization = new (require(path.resolve(__dirname, "./TREM.Localization/Localization.js")))(setting["general.locale"], window.navigator.language);

	const progressbar = document.getElementById("loading_progress");
	const progressStep = 5;

	// Connect to server
	await (async () => {
		$("#loading").text(TREM.Localization.getString("Application_Connecting"));
		dump({ level: 0, message: "Trying to connect to the server...", origin: "ResourceLoader" });
		await ReportGET({});
		progressbar.value = (1 / progressStep) * 1;
	})().catch(e => dump({ level: 2, message: e }));

	(() => {
		$("#loading").text(TREM.Localization.getString("Application_Loading"));
		const time = document.getElementById("time");

		// clock
		dump({ level: 3, message: "Initializing clock", origin: "Clock" });
		if (!Timers.clock)
			Timers.clock = setInterval(() => {
				if (TimerDesynced) {
					if (!time.classList.contains("desynced"))
						time.classList.add("desynced");
				} else if (replay) {
					if (!time.classList.contains("replay"))
						time.classList.add("replay");
					time.innerText = `${new Date(replay + (NOW.getTime() - replayT)).format("YYYY/MM/DD HH:mm:ss")}`;
					if (NOW.getTime() - replayT > 180_000) {
						replay = 0;
						ReportGET();
					}
				} else {
					if (time.classList.contains("replay"))
						time.classList.remove("replay");
					if (time.classList.contains("desynced"))
						time.classList.remove("desynced");
					time.innerText = `${NOW.format("YYYY/MM/DD HH:mm:ss")}`;
				}
				let GetDataState = "";
				if (GetData) {
					GetData = false;
					GetDataState = "✉";
				}
				const Delay = (Date.now() - Ping) > 2500 ? "2500+" : Date.now() - Ping;
				const warn = (Warn) ? "⚠️" : "";
				$("#app-version").text(`${app.getVersion()} ${Delay}ms ${warn} ${GetDataState}`);
			}, 500);

		if (!Timers.tsunami)
			Timers.tsunami = setInterval(() => {
				if (investigation && NOW.getTime() - Report > 600000) {
					investigation = false;
					roll.removeChild(roll.children[0]);
					if (Pgeojson != null) {
						map.removeLayer(Pgeojson);
						Pgeojson = null;
					}
				}
				if (ReportTag != 0 && NOW.getTime() - ReportTag > 30000) {
					ReportTag = 0;
					if (ReportMarkID != null) {
						ReportMarkID = null;
						for (let index = 0; index < MarkList.length; index++)
							map.removeLayer(MarkList[index]);
						TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
					}
				}
			}, 250);

		dump({ level: 3, message: "Initializing map", origin: "Map" });
		if (!map) {
			map = L.map("map", {
				attributionControl : false,
				closePopupOnClick  : false,
				maxBounds          : [
					[60, 50],
					[10, 180],
				],
				preferCanvas : true,
				zoomSnap     : 0.25,
				zoomDelta    : 0.5,
			}).setView([23, 121], 7.75);
			map.doubleClickZoom.disable();
			map.removeControl(map.zoomControl);
			map.on("click", () => {
				if (ReportMarkID != null) {
					ReportMarkID = null;
					for (let index = 0; index < MarkList.length; index++)
						map.removeLayer(MarkList[index]);
					TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
				}
				mapLock = false;
				TREM.Earthquake.emit("focus", {}, true);
			});
			map.on("drag", () => mapLock = true);
			map.on("zoomend", () => {
				if (map.getZoom() >= 11)
					for (const key in Station) {
						const tooltip = Station[key].getTooltip();
						if (tooltip) {
							Station[key].unbindTooltip();
							tooltip.options.permanent = true;
							Station[key].bindTooltip(tooltip);
						}
					}
				else
					for (const key in Station) {
						const tooltip = Station[key].getTooltip();
						if (tooltip && !Station[key].keepTooltipAlive) {
							Station[key].unbindTooltip();
							tooltip.options.permanent = false;
							Station[key].bindTooltip(tooltip);
						}
					}
			});
		}

		if (!mapTW) {
			mapTW = L.map("map-tw", {
				attributionControl : false,
				closePopupOnClick  : false,
				preferCanvas       : true,
				fadeAnimation      : false,
			}).setView([23.608428, 120.799168], 7);

			mapTW.on("zoom", () => mapTW.setView([23.608428, 120.799168], 7));

			mapTW.dragging.disable();
			mapTW.scrollWheelZoom.disable();
			mapTW.doubleClickZoom.disable();
			mapTW.removeControl(mapTW.zoomControl);
		}

		progressbar.value = (1 / progressStep) * 2;
	})();

	(() => {
		setUserLocationMarker(setting["location.town"]);
		progressbar.value = (1 / progressStep) * 3;
	})();


	await (async () => {
		const colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);

		dump({ level: 0, message: "Loading Map Data...", origin: "ResourceLoader" });
		dump({ level: 3, message: "Starting timer...", origin: "Timer" });
		let perf_GEOJSON_LOAD = process.hrtime();
		fs.readdirSync(path.join(__dirname, "/js/geojson")).forEach((file, i, arr) => {
			try {
				MapData[path.parse(file).name] = require(path.join(__dirname, "js/geojson", file));
				dump({ level: 3, message: `Loaded ${file}`, origin: "ResourceLoader" });
				progressbar.value = (1 / progressStep) * 3 + (((1 / progressStep) / arr.length) * (i + 1));
			} catch (error) {
				dump({ level: 2, message: `An error occurred while loading file ${file}`, origin: "ResourceLoader" });
				dump({ level: 2, message: error, origin: "ResourceLoader" });
				console.error(error);
				dump({ level: 3, message: `Skipping ${file}`, origin: "ResourceLoader" });
			}
		});
		perf_GEOJSON_LOAD = process.hrtime(perf_GEOJSON_LOAD);
		dump({ level: 3, message: `ResourceLoader took ${perf_GEOJSON_LOAD[0]}.${perf_GEOJSON_LOAD[1]}s`, origin: "Timer" });

		if (!map_geoJson)
			map_geoJson = L.geoJson.vt(MapData.Dmap, {
				edgeBufferTiles : 2,
				minZoom         : 4,
				maxZoom         : 12,
				tolerance       : 10,
				buffer          : 256,
				debug           : 0,
				style           : {
					weight      : 0.8,
					color       : colors.primary,
					fillColor   : colors.surfaceVariant,
					fillOpacity : 1,
				},
			}).addTo(map);
		progressbar.value = (1 / progressStep) * 4;
	})().catch(e => dump({ level: 2, message: e }));

	await (async () => {
		await fetchFiles();
		if (!Timers.fetchFiles)
			Timers.fetchFiles = setInterval(fetchFiles, 10 * 60 * 1000);
		progressbar.value = 1;
	})().catch(e => dump({ level: 2, message: e }));

	$("#loading").text(TREM.Localization.getString("Application_Welcome"));
	$("#load").delay(1000).fadeOut(1000);
	setInterval(() => {
		if (mapLock) return;
		if (Object.keys(EEW).length != 0) {
			for (let index = 0; index < Object.keys(EEW).length; index++)
				if (EEWT.id == 0 || EEWT.id == EEW[Object.keys(EEW)[index]].id || NOW.getTime() - EEW[Object.keys(EEW)[index]].time >= 10000) {
					EEWT.id = EEW[Object.keys(EEW)[index]].id;
					let Zoom = 9;
					const X = 0;
					const km = (NOW.getTime() - EEW[Object.keys(EEW)[index]].Time) * 4;
					if (km > 100000)
						Zoom = 8;
					if (km > 150000)
						Zoom = 7.5;
					if (km > 200000)
						Zoom = 7;
					if (km > 250000)
						Zoom = 6.5;
					if (km > 300000)
						Zoom = 6;
					const num = Math.sqrt(Math.pow(23.608428 - EEW[Object.keys(EEW)[index]].lat, 2) + Math.pow(120.799168 - EEW[Object.keys(EEW)[index]].lon, 2));
					if (num >= 5)
						TREM.Earthquake.emit("focus", { center: [EEW[Object.keys(EEW)[index]].lat, EEW[Object.keys(EEW)[index]].lon], size: Zoom });
					else
						TREM.Earthquake.emit("focus", { center: [(23.608428 + EEW[Object.keys(EEW)[index]].lat) / 2, ((120.799168 + EEW[Object.keys(EEW)[index]].lon) / 2) + X], size: Zoom });
					EEW[Object.keys(EEW)[index]].time = NOW.getTime();
				}
			auto = true;
		} else if (Object.keys(PGA).length >= 1) {
			if (Object.keys(PGA).length == 1) {
				const X1 = (PGAjson[Object.keys(pga)[0].toString()][0][0] + (PGAjson[Object.keys(pga)[0].toString()][2][0] - PGAjson[Object.keys(pga)[0].toString()][0][0]) / 2);
				const Y1 = (PGAjson[Object.keys(pga)[0].toString()][0][1] + (PGAjson[Object.keys(pga)[0].toString()][1][1] - PGAjson[Object.keys(pga)[0].toString()][0][1]) / 2);
				TREM.Earthquake.emit("focus", { center: [X1, Y1], size: 9.5 });
			} else if (Object.keys(PGA).length >= 2) {
				const X1 = (PGAjson[Object.keys(pga)[0].toString()][0][0] + (PGAjson[Object.keys(pga)[0].toString()][2][0] - PGAjson[Object.keys(pga)[0].toString()][0][0]) / 2);
				const Y1 = (PGAjson[Object.keys(pga)[0].toString()][0][1] + (PGAjson[Object.keys(pga)[0].toString()][1][1] - PGAjson[Object.keys(pga)[0].toString()][0][1]) / 2);
				const X2 = (PGAjson[Object.keys(pga)[1].toString()][0][0] + (PGAjson[Object.keys(pga)[1].toString()][2][0] - PGAjson[Object.keys(pga)[1].toString()][0][0]) / 2);
				const Y2 = (PGAjson[Object.keys(pga)[1].toString()][0][1] + (PGAjson[Object.keys(pga)[1].toString()][1][1] - PGAjson[Object.keys(pga)[1].toString()][0][1]) / 2);
				let focusScale = 9;
				if (Object.keys(PGA).length == 2) {
					const num = Math.sqrt(Math.pow(X1 - X2, 2) + Math.pow(Y1 - Y2, 2));
					if (num > 0.6) focusScale = 9;
					if (num > 1) focusScale = 8.5;
					if (num > 1.5) focusScale = 8;
					if (num > 2.8) focusScale = 7;
				} else {
					if (Object.keys(PGA).length >= 4) focusScale = 8;
					if (Object.keys(PGA).length >= 6) focusScale = 7.5;
					if (Object.keys(PGA).length >= 8) focusScale = 7;
				}
				TREM.Earthquake.emit("focus", { center: [(X1 + X2) / 2, (Y1 + Y2) / 2], size: focusScale });
			}
			auto = true;
		} else
		if (auto) {
			auto = false;
			TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
		}
	}, 500);
}
// #endregion
function PGAMain() {
	dump({ level: 0, message: "Starting PGA timer", origin: "PGATimer" });
	if (PGAMainClock) clearInterval(PGAMainClock);
	PGAMainClock = setInterval(() => {
		if (PGAMainLock) return;
		PGAMainLock = true;
		let R = 0;
		if (replay) R = replay + (NOW.getTime() - replayT);
		const data = {
			Function : "data",
			Type     : "TREM",
			Value    : R,
		};
		const CancelToken = axios.CancelToken;
		let cancel;
		setTimeout(() => {
			cancel();
		}, 2500);
		axios({
			method      : "post",
			url         : PostAddressIP,
			data        : data,
			cancelToken : new CancelToken((c) => {
				cancel = c;
			}),
		}).then((response) => {
			Ping = Date.now();
			PGAMainLock = false;
			TimerDesynced = false;
			Response = response.data;
			handler(Response);
		}).catch((err) => {
			PGAMainLock = false;
			TimerDesynced = true;
			handler(Response);
		});
	}, 500);
}

async function handler(response) {
	if (response.state != "Success") return;
	const Json = response.response;
	MAXPGA = { pga: 0, station: "NA", level: 0 };

	const removed = Object.keys(Station).filter(key => !Object.keys(Json).includes(key));
	for (const removedKey of removed) {
		Station[removedKey].remove();
		delete Station[removedKey];
	}
	for (let index = 0, keys = Object.keys(Json), n = keys.length; index < n; index++) {
		const Sdata = Json[keys[index]];
		let amount = Number(Sdata.PGA);
		if (station[keys[index]] == undefined) continue;
		const Alert = NOW.getTime() - (Sdata.alert * 1000 ?? 0) < 60000;
		if (Alert && Json.Alert) amount = Sdata.pga;
		const Intensity = (NOW.getTime() - Sdata.TS * 1000 > 15000) ? "NA" :
			(!Alert) ? 0 :
				(amount >= 800) ? 9 :
					(amount >= 440) ? 8 :
						(amount >= 250) ? 7 :
							(amount >= 140) ? 6 :
								(amount >= 80) ? 5 :
									(amount >= 25) ? 4 :
										(amount >= 8) ? 3 :
											(amount >= 5) ? 2 :
												(amount >= 2.2) ? 1 :
													0;
		const size = (Intensity == 0 || Intensity == "NA") ? 8 : 16;
		const Image = (Intensity != 0) ? `./image/${Intensity}.png` :
			(amount > 3.5) ? "./image/0-5.png" :
				(amount > 3) ? "./image/0-4.png" :
					(amount > 2.5) ? "./image/0-3.png" :
						(amount > 2) ? "./image/0-2.png" :
							"./image/0-1.png";
		const station_tooltip = `<div>${station[keys[index]].Loc}</div><div>${amount}</div><div>${IntensityI(Intensity)}</div>`;
		if (!Station[keys[index]]) {
			Station[keys[index]] = L.marker([station[keys[index]].Lat, station[keys[index]].Long], { keyboard: false })
				.addTo(map).bindTooltip(station_tooltip, {
					offset    : [8, 0],
					permanent : false,
					className : "rt-station-tooltip",
				});
			Station[keys[index]].on("click", () => {
				Station[keys[index]].keepTooltipAlive = !Station[keys[index]].keepTooltipAlive;
				if (map.getZoom() < 11) {
					const tooltip = Station[keys[index]].getTooltip();
					Station[keys[index]].unbindTooltip();
					if (Station[keys[index]].keepTooltipAlive)
						tooltip.options.permanent = true;
					else
						tooltip.options.permanent = false;
					Station[keys[index]].bindTooltip(tooltip);
				}
			});
		}

		if (Station[keys[index]].getIcon()?.options?.iconUrl != Image)
			Station[keys[index]].setIcon(L.icon({
				iconUrl  : Image,
				iconSize : [size, size],
			}));

		Station[keys[index]]
			.setZIndexOffset(2000 + amount)
			.setTooltipContent(station_tooltip);

		const Level = IntensityI(Intensity);
		const now = new Date(Sdata.T * 1000);
		if (keys.includes(setting["Real-time.station"])) {
			if (document.getElementById("rt-station").classList.contains("hide"))
				document.getElementById("rt-station").classList.remove("hide");
			if (keys[index] == setting["Real-time.station"]) {
				document.getElementById("rt-station-name").innerText = station[keys[index]].Loc;
				document.getElementById("rt-station-time").innerText = now.format("MM/DD HH:mm:ss");
				document.getElementById("rt-station-intensity").innerText = IntensityI(Intensity);
				document.getElementById("rt-station-pga").innerText = amount;
			}
		} else if (!document.getElementById("rt-station").classList.contains("hide"))
			document.getElementById("rt-station").classList.add("hide");

		if (pga[station[keys[index]].PGA] == undefined && Intensity != "NA")
			pga[station[keys[index]].PGA] = {
				Intensity : Intensity,
				Time      : 0,
			};

		if (Intensity != "NA" && (Intensity != 0 || Alert)) {
			if (Intensity > pga[station[keys[index]].PGA].Intensity) pga[station[keys[index]].PGA].Intensity = Intensity;
			if (Alert) {
				let find = -1;
				for (let Index = 0; Index < All.length; Index++)
					if (All[Index].loc == station[keys[index]].Loc) {
						find = 0;
						if (All[Index].pga < amount) {
							All[Index].intensity = Intensity;
							All[Index].pga = amount;
						}
						break;
					}
				if (find == -1)
					All.push({
						loc       : station[keys[index]].Loc,
						intensity : Intensity,
						pga       : amount,
					});
				AllT = Date.now();
				if (Json.Alert) {
					if (setting["audio.realtime"])
						if (amount > 8 && PGALimit == 0) {
							PGALimit = 1;
							audioPlay("./audio/PGA1.wav");
						} else if (amount > 250 && PGALimit != 2) {
							PGALimit = 2;
							audioPlay("./audio/PGA2.wav");
						}
					pga[station[keys[index]].PGA].Time = NOW.getTime();
				}
			}

			if (MAXPGA.pga < amount && Level != "NA") {
				MAXPGA.pga = amount;
				MAXPGA.station = keys[index];
				MAXPGA.level = Level;
				MAXPGA.lat = station[keys[index]].Lat;
				MAXPGA.long = station[keys[index]].Long;
				MAXPGA.loc = station[keys[index]].Loc;
				MAXPGA.intensity = Intensity;
				MAXPGA.ms = NOW.getTime() - Sdata.TS * 1000;
			}
		}
	}
	for (let Index = 0; Index < All.length - 1; Index++)
		for (let index = 0; index < All.length - 1; index++)
			if (All[index].pga < All[index + 1].pga) {
				const Temp = All[index + 1];
				All[index + 1] = All[index];
				All[index] = Temp;
			}
	if (PAlert.data != undefined && replay == 0)
		if (PAlert.timestamp != PAlertT) {
			PAlertT = PAlert.timestamp;
			const PLoc = {};
			let MaxI = 0;
			for (let index = 0; index < PAlert.data.length; index++) {
				PLoc[PAlert.data[index].loc] = PAlert.data[index].intensity;
				if (PAlert.data[index].intensity > MaxI) {
					MaxI = PAlert.data[index].intensity;
					Report = NOW.getTime();
					ReportGET({
						Max  : MaxI,
						Time : NOW.format("YYYY/MM/DD HH:mm:ss"),
					});
				}
			}
			if (PalertT != PAlert.timestamp && Object.keys(PLoc).length != 0) {
				PalertT = PAlert.timestamp;
				if (Pgeojson == null) {
					if (setting["Real-time.show"]) win.show();
					if (setting["Real-time.cover"]) win.setAlwaysOnTop(true);
					win.setAlwaysOnTop(false);
					if (setting["audio.realtime"]) audioPlay("./audio/palert.wav");
				}
				if (Pgeojson != null) map.removeLayer(Pgeojson);
				const colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);
				Pgeojson = L.geoJson.vt(MapData.DmapT, {
					minZoom   : 4,
					maxZoom   : 12,
					tolerance : 10,
					buffer    : 256,
					debug     : 0,
					style     : (properties) => {
						if (properties.COUNTY != undefined) {
							const name = properties.COUNTY + " " + properties.TOWN;
							if (PLoc[name] == 0 || PLoc[name] == undefined)
								return {
									color       : "transparent",
									weight      : 0,
									opacity     : 0,
									fillColor   : "transparent",
									fillOpacity : 0,
								};
							return {
								color       : colors.secondary,
								weight      : 0.8,
								fillColor   : color(PLoc[name]),
								fillOpacity : 1,
							};
						} else
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
					},
				});
				map.addLayer(Pgeojson);
				setTimeout(() => {
					ipcRenderer.send("screenshotEEW", {
						Function : "palert",
						ID       : 1,
						Version  : 1,
						Time     : NOW.getTime(),
						Shot     : 1,
					});
				}, 1250);
			}
		}
	for (let index = 0; index < Object.keys(PGA).length; index++) {
		if (RMT == 0) map.removeLayer(PGA[Object.keys(PGA)[index]]);
		delete PGA[Object.keys(PGA)[index]];
		index--;
	}
	RMT++;
	for (let index = 0; index < Object.keys(pga).length; index++) {
		const Intensity = pga[Object.keys(pga)[index]].Intensity;
		if (NOW.getTime() - pga[Object.keys(pga)[index]].Time > 30000 || PGACancel) {
			delete pga[Object.keys(pga)[index]];
			index--;
		} else {
			PGA[Object.keys(pga)[index]] = L.polygon(PGAjson[Object.keys(pga)[index].toString()], {
				color     : color(Intensity),
				fillColor : "transparent",
			});
			let skip = false;
			if (Object.keys(EEW).length != 0)
				for (let Index = 0; Index < Object.keys(EEW).length; Index++) {
					let SKIP = 0;
					for (let i = 0; i < 4; i++) {
						const dis = Math.sqrt(Math.pow((PGAjson[Object.keys(pga)[index].toString()][i][0] - EEW[Object.keys(EEW)[Index]].lat) * 111, 2) + Math.pow((PGAjson[Object.keys(pga)[index].toString()][i][1] - EEW[Object.keys(EEW)[Index]].lon) * 101, 2));
						if (EEW[Object.keys(EEW)[Index]].km / 1000 > dis) SKIP++;
					}
					if (SKIP >= 4) {
						skip = true;
						break;
					}
				}
			if (skip) continue;
			if (RMT >= 2) map.addLayer(PGA[Object.keys(pga)[index]]);
		}
	}
	if (RMT >= 2) RMT = 0;
	if (Object.keys(pga).length != 0 && !PGAmark)
		PGAmark = true;
	if (PGAmark && Object.keys(pga).length == 0) {
		PGAmark = false;
		RMT = 1;
		RMTlimit = [];
		PGACancel = false;
	}
	if (Date.now() - AllT >= 180000) All = [];
	if (Object.keys(PGA).length == 0) {
		PGAtag = -1;
		PGALimit = 0;
	}
	if (All.length >= 2 && All[0].intensity > PGAtag && Object.keys(pga).length != 0) {
		if (setting["audio.realtime"])
			if (All[0].intensity >= 5 && PGAtag < 5)
				audioPlay("./audio/Shindo2.wav");
			else if (All[0].intensity >= 2 && PGAtag < 2)
				audioPlay("./audio/Shindo1.wav");
			else if (PGAtag == -1)
				audioPlay("./audio/Shindo0.wav");
		setTimeout(() => {
			ipcRenderer.send("screenshotEEW", {
				Function : "station",
				ID       : 1,
				Version  : 1,
				Time     : NOW.getTime(),
				Shot     : 1,
			});
		}, 2250);
		if (setting["Real-time.show"])
			win.show();
		if (setting["Real-time.cover"]) win.setAlwaysOnTop(true);
		win.setAlwaysOnTop(false);
		PGAtag = All[0].intensity;
	}
	const list = [];
	let count = 0;
	if (All.length >= 2)
		if (All.length <= 8)
			for (let Index = 0; Index < All.length; Index++, count++) {
				if (count >= 8) break;
				const container = document.createElement("DIV");
				container.className = IntensityToClassString(All[Index].intensity);
				const location = document.createElement("span");
				location.innerText = `${All[Index].loc}\n${All[Index].pga} gal`;
				container.appendChild(document.createElement("span"));
				container.appendChild(location);
				list.push(container);
			}
		else {
			const Idata = {};
			for (let Index = 0; Index < All.length; Index++, count++) {
				if (Object.keys(Idata).length >= 8) break;
				const city = All[Index].loc.split(" ")[0];
				const CPGA = (Idata[city] == undefined) ? 0 : Idata[city];
				if (All[Index].pga > CPGA) {
					if (Idata[city] == undefined)Idata[city] = {};
					Idata[city].pga = All[Index].pga;
					Idata[city].intensity = All[Index].intensity;
				}
			}
			for (let index = 0; index < Object.keys(Idata).length; index++) {
				const container = document.createElement("DIV");
				container.className = IntensityToClassString(Idata[Object.keys(Idata)[index]].intensity);
				const location = document.createElement("span");
				location.innerText = `${Object.keys(Idata)[index]}\n${Idata[Object.keys(Idata)[index]].pga} gal`;
				container.appendChild(document.createElement("span"));
				container.appendChild(location);
				list.push(container);
			}
		}
	document.getElementById("rt-list").replaceChildren(...list);
}

async function fetchFiles() {
	if (should_check_update) {
		const update = await (await fetch("https://api.github.com/repos/ExpTechTW/TREM/releases")).json();
		const latest = update[0].tag_name.split(".");
		const current = app.getVersion().split(".");
		if ((current[0] * 100 + current[1] * 10 + current[2]) < (latest[0] * 100 + latest[1] * 10 + latest[2])) {
			should_check_update = false;
			dump({ level: 0, message: `New version available: ${update[0].tag_name}`, origin: "VersionChecker" });
			new Notification(`發現新版本：v${update[0].tag_name}`, { body: `v${app.getVersion()} → v${update[0].tag_name}\n點擊來下載最新版本`, icon: "TREM.ico" })
				.onclick = () => shell.openExternal(update[0].html_url);
		}
	}
	Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
	dump({ level: 0, message: "Get Location File", origin: "Location" });
	station = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/station.json")).json();
	dump({ level: 0, message: "Get Station File", origin: "Location" });
	PGAjson = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/API/master/Json/earthquake/pga.json")).json();
	dump({ level: 0, message: "Get PGA Location File", origin: "Location" });
	locationEEW = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
	dump({ level: 0, message: "Get LocationEEW File", origin: "Location" });
	PGAMain();
}

// #region 用戶所在位置
/**
 * 設定用戶所在位置
 * @param {string} town 鄉鎮
 */
async function setUserLocationMarker(town) {
	if (!Location) {
		Location = await (await fetch("https://raw.githubusercontent.com/ExpTechTW/TW-EEW/master/locations.json")).json();
		dump({ level: 0, message: "Get Location File", origin: "Location" });
	}

	[, UserLocationLat, UserLocationLon] = Location[setting["location.city"]][town];

	if (!marker) {
		const icon = L.icon({
			iconUrl  : "./image/here.png",
			iconSize : [20, 20],
		});
		marker = L.marker([UserLocationLat, UserLocationLon], { icon: icon })
			.setZIndexOffset(1)
			.addTo(map);
	} else marker.setLatLng([UserLocationLat, UserLocationLon]);
	dump({ level: 0, message: `User location set to ${setting["location.city"]} ${town} (${UserLocationLat}, ${UserLocationLon})`, origin: "Location" });
	TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
}
// #endregion

// #region 聚焦
TREM.Earthquake.on("focus", ({ center, size } = {}, force = false) => {
	if (!setting["map.autoZoom"])
		if (force) {
			center = [23.608428, 120.799168];
			size = 7.75;
		} else
			return;
	let X = 0;
	if (size >= 6) X = 2.5;
	if (size >= 6.5) X = 1.6;
	if (size >= 7) X = 1.5;
	if (size >= 7.5) X = 0.9;
	if (size >= 8) X = 0.6;
	if (size >= 8.5) X = 0.4;
	if (size >= 9) X = 0.35;
	if (size >= 9.5) X = 0.2;
	if (center) {
		Focus[0] = center[0];
		Focus[1] = center[1] + X;
		Focus[2] = size;
		if (map.getBounds().getCenter().lat.toFixed(2) != center[0].toFixed(2) || map.getBounds().getCenter().lng.toFixed(2) != (center[1] + X).toFixed(2) || size != map.getZoom())
			map.setView([center[0], center[1] + X], size);
	} else if (Focus.length != 0)
		if (map.getBounds().getCenter().lat.toFixed(2) != Focus[0].toFixed(2) || map.getBounds().getCenter().lng.toFixed(2) != Focus[1].toFixed(2) || Focus[2] != map.getZoom())
			map.setView([Focus[0], Focus[1]], Focus[2]);
});
// #endregion

// #region 音頻播放
let AudioT;
let AudioT1;
const audioDOM = new Audio();
const audioDOM1 = new Audio();
audioDOM.addEventListener("ended", () => {
	audioLock = false;
});
audioDOM1.addEventListener("ended", () => {
	audioLock1 = false;
});

function audioPlay(src) {
	audioList.push(src);
	if (!AudioT)
		AudioT = setInterval(() => {
			if (!audioLock) {
				audioLock = true;
				if (audioList.length)
					playNextAudio();
				else {
					clearInterval(AudioT);
					audioLock = false;
					AudioT = null;
				}
			}
		}, 0);
}
function audioPlay1(src) {
	audioList1.push(src);
	if (!AudioT1)
		AudioT1 = setInterval(() => {
			if (!audioLock1) {
				audioLock1 = true;
				if (audioList1.length)
					playNextAudio1();
				else {
					clearInterval(AudioT1);
					audioLock1 = false;
					AudioT1 = null;
				}
			}
		}, 0);
}
function playNextAudio() {
	audioLock = true;
	const nextAudioPath = audioList.shift();
	audioDOM.src = nextAudioPath;
	if (nextAudioPath.startsWith("./audio/1/") && setting["audio.eew"]) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	} else if (!nextAudioPath.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM.play();
	}
}
function playNextAudio1() {
	audioLock1 = true;
	const nextAudioPath = audioList1.shift();
	audioDOM1.src = nextAudioPath;
	audioDOM1.playbackRate = 1.1;
	if (nextAudioPath.startsWith("./audio/1/") && setting["audio.eew"]) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	} else if (!nextAudioPath.startsWith("./audio/1/")) {
		dump({ level: 0, message: `Playing Audio > ${nextAudioPath}`, origin: "Audio" });
		audioDOM1.play();
	}
}
// #endregion

// #region Report Data
async function ReportGET(eew) {
	try {
		const res = await getReportData();
		if (!res) return setTimeout(ReportGET, 1000, eew);
		dump({ level: 0, message: "Reports fetched", origin: "EQReportFetcher" });
		ReportList(res, eew);
	} catch (error) {
		dump({ level: 2, message: "Error fetching reports", origin: "EQReportFetcher" });
		dump({ level: 2, message: error, origin: "EQReportFetcher" });
		return setTimeout(ReportGET, 5000, eew);
	}
}
async function getReportData() {
	try {
		const list = await ExpTechAPI.v1.data.getEarthquakeReports(250);
		return list;
	} catch (error) {
		dump({ level: 2, message: error, origin: "EQReportFetcher" });
		console.error(error);
	}
}
// #endregion

// #region Report 點擊
// eslint-disable-next-line no-shadow
async function ReportClick(time) {
	if (ReportMarkID == time) {
		ReportMarkID = null;
		for (let index = 0; index < MarkList.length; index++)
			map.removeLayer(MarkList[index]);
		TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
	} else {
		ReportMarkID = time;
		for (let index = 0; index < MarkList.length; index++)
			map.removeLayer(MarkList[index]);

		const LIST = [];
		const body = {
			Function : "data",
			Type     : "report",
			Value    : ReportCache[time].earthquakeNo,
		};
		if (
			// 確認是否為無編號地震
			ReportCache[time].earthquakeNo % 1000 == 0
			|| await axios.post(PostAddressIP, body)
				.then((response) => {
					const json = response.data.response;
					if (json == undefined)
						return true;
					else {
						for (let Index = 0; Index < json.Intensity.length; Index++)
							for (let index = 0; index < json.Intensity[Index].station.length; index++) {
								// eslint-disable-next-line no-shadow
								const Station = json.Intensity[Index].station[index];
								let Intensity = Station.stationIntensity.$t;
								if (Station.stationIntensity.unit == "強") Intensity += "+";
								if (Station.stationIntensity.unit == "弱") Intensity += "-";
								const myIcon = L.icon({
									iconUrl  : `./image/${IntensityN(Intensity)}.png`,
									iconSize : [20, 20],
								});
								const ReportMark = L.marker([Station.stationLat.$t, Station.stationLon.$t], { icon: myIcon });
								// eslint-disable-next-line no-shadow
								let PGA = "";
								if (Station.pga != undefined) PGA = `<br>PGA<br>垂直向: ${Station.pga.vComponent}<br>東西向: ${Station.pga.ewComponent}<br>南北向: ${Station.pga.nsComponent}<br><a onclick="openURL('${Station.waveImageURI}')">震波圖</a>`;
								ReportMark.bindPopup(`站名: ${Station.stationName}<br>代號: ${Station.stationCode}<br>經度: ${Station.stationLon.$t}<br>緯度: ${Station.stationLat.$t}<br>震央距: ${Station.distance.$t}<br>方位角: ${Station.azimuth.$t}<br>震度: ${Intensity}<br>${PGA}`);
								map.addLayer(ReportMark);
								ReportMark.setZIndexOffset(1000 + index);
								MarkList.push(ReportMark);
							}
						TREM.Earthquake.emit("focus", { center: [+json.NorthLatitude, +json.EastLongitude], size: 7.75 });
						const myIcon = L.icon({
							iconUrl  : "./image/star.png",
							iconSize : [25, 25],
						});
						const ReportMark = L.marker([Number(json.NorthLatitude), Number(json.EastLongitude)], { icon: myIcon });
						ReportMark.bindPopup(`編號: ${json.No}<br>經度: ${json.EastLongitude}<br>緯度: ${json.NorthLatitude}<br>深度: ${json.Depth}<br>規模: ${json.Scale}<br>位置: ${json.Location}<br>時間: ${json["UTC+8"]}<br><br><a onclick="openURL('${json.Web}')">網頁</a><br><a onclick="openURL('${json.EventImage}')">地震報告</a><br><a onclick="openURL('${json.ShakeImage}')">震度分布</a>`);
						map.addLayer(ReportMark);
						ReportMark.setZIndexOffset(3000);
						MarkList.push(ReportMark);
						return false;
					}
				})
				.catch((error) => {
					console.log(error);
					return false;
				})
		) {
			for (let Index = 0; Index < ReportCache[time].data.length; Index++)
				for (let index = 0; index < ReportCache[time].data[Index].eqStation.length; index++) {
					const data = ReportCache[time].data[Index].eqStation[index];
					const myIcon = L.icon({
						iconUrl  : `./image/${data.stationIntensity}.png`,
						iconSize : [20, 20],
					});
					const level = IntensityI(data.stationIntensity);
					LIST.push({
						Lat       : Number(data.stationLat),
						Long      : Number(data.stationLon),
						Icon      : myIcon,
						Level     : level,
						Intensity : Number(data.stationIntensity),
						Name      : `${ReportCache[time].data[Index].areaName} ${data.stationName}`,
					});
				}

			for (let Index = 0; Index < LIST.length - 1; Index++)
				for (let index = 0; index < LIST.length - 1; index++)
					if (LIST[index].Intensity > LIST[index + 1].Intensity) {
						const Temp = LIST[index];
						LIST[index] = LIST[index + 1];
						LIST[index + 1] = Temp;
					}

			for (let index = 0; index < LIST.length; index++) {
				const ReportMark = L.marker([LIST[index].Lat, LIST[index].Long], { icon: LIST[index].Icon });
				ReportMark.bindPopup(`站名: ${LIST[index].Name}<br>經度: ${LIST[index].Long}<br>緯度: ${LIST[index].Lat}<br>震度: ${LIST[index].Level}`);
				map.addLayer(ReportMark);
				ReportMark.setZIndexOffset(1000 + index);
				MarkList.push(ReportMark);
			}
			TREM.Earthquake.emit("focus", { center: [ReportCache[time].epicenterLat, +ReportCache[time].epicenterLon], size: 7.75 });
			const icon = L.icon({
				iconUrl  : "./image/star.png",
				iconSize : [25, 25],
			});
			const ReportMark = L.marker([Number(ReportCache[time].epicenterLat), Number(ReportCache[time].epicenterLon)], { icon });
			let Num = "無";
			if (ReportCache[time].earthquakeNo.toString().substring(3, 6) != "000") Num = ReportCache[time].earthquakeNo;
			ReportMark.bindPopup(`編號: ${Num}<br>經度: ${ReportCache[time].epicenterLon}<br>緯度: ${ReportCache[time].epicenterLat}<br>深度: ${ReportCache[time].depth}<br>規模: ${ReportCache[time].magnitudeValue}<br>位置: ${ReportCache[time].location}<br>時間: ${ReportCache[time].originTime}`);
			map.addLayer(ReportMark);
			ReportMark.setZIndexOffset(3000);
			MarkList.push(ReportMark);
		}
	}
}
const openURL = url => {
	shell.openExternal(url);

};
// #endregion

// #region Report list
function ReportList(earthquakeReportArr, eew) {
	roll.replaceChildren();
	for (let index = 0; index < earthquakeReportArr.length; index++) {
		if (eew != undefined && index == earthquakeReportArr.length - 1) {
			earthquakeReportArr[index].Max = eew.Max;
			earthquakeReportArr[index].Time = eew.Time;
		}
		addReport(earthquakeReportArr[index]);
	}
	setLocale(setting["general.locale"]);
}

function addReport(report, prepend = false) {
	if (replay != 0 && new Date(report.originTime).getTime() > new Date(replay + (NOW.getTime() - replayT)).getTime()) return;
	const Level = IntensityI(report.data[0].areaIntensity);
	let msg = "";
	if (report.location.includes("("))
		msg = report.location.substring(report.location.indexOf("(") + 1, report.location.indexOf(")")).replace("位於", "");
	else
		msg = report.location;

	let star = "";
	if (report.ID.length != 0) star += "↺ ";
	if (report.earthquakeNo % 1000 != 0) star += "✩ ";

	const Div = document.createElement("div");
	Div.className = "md3-ripple";
	if (report.Time != undefined && report.report == undefined) {
		const report_container = document.createElement("div");
		report_container.className = "report-container locating";

		const report_intenisty_container = document.createElement("div");
		report_intenisty_container.className = "report-intenisty-container";

		const report_intenisty_title_container = document.createElement("div");
		report_intenisty_title_container.className = "report-intenisty-title-container";

		const report_intenisty_title_en = document.createElement("span");
		report_intenisty_title_en.lang = "en";
		report_intenisty_title_en.className = "report-intenisty-title";
		report_intenisty_title_en.innerText = "Max Int.";
		const report_intenisty_title_ja = document.createElement("span");
		report_intenisty_title_ja.lang = "ja";
		report_intenisty_title_ja.className = "report-intenisty-title";
		report_intenisty_title_ja.innerText = "最大震度";
		const report_intenisty_title_ru = document.createElement("span");
		report_intenisty_title_ru.lang = "ru";
		report_intenisty_title_ru.className = "report-intenisty-title";
		report_intenisty_title_ru.innerText = "Макс интенси";
		report_intenisty_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intenisty_title_zh_tw = document.createElement("span");
		report_intenisty_title_zh_tw.lang = "zh-TW";
		report_intenisty_title_zh_tw.className = "report-intenisty-title";
		report_intenisty_title_zh_tw.innerText = "最大震度";

		report_intenisty_title_container.append(report_intenisty_title_en, report_intenisty_title_ja, report_intenisty_title_ru, report_intenisty_title_zh_tw);
		report_intenisty_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intenisty_value = document.createElement("span");
		report_intenisty_value.className = "report-intenisty-value";
		report_intenisty_value.innerText = IntensityI(report.Max);
		report_intenisty_container.append(report_intenisty_title_container, report_intenisty_value);


		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = "震源 調查中";
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.Time.replace(/-/g, "/");
		report_detail_container.append(report_location, report_time);

		report_container.append(report_intenisty_container, report_detail_container);
		Div.prepend(report_container);
		Div.style.backgroundColor = `${color(report.Max)}cc`;
		ripple(Div);
		roll.prepend(Div);
		investigation = true;
	} else {
		const report_container = document.createElement("div");
		report_container.className = "report-container";

		const report_intenisty_container = document.createElement("div");
		report_intenisty_container.className = "report-intenisty-container";

		const report_intenisty_title_container = document.createElement("div");
		report_intenisty_title_container.className = "report-intenisty-title-container";

		const report_intenisty_title_en = document.createElement("span");
		report_intenisty_title_en.lang = "en";
		report_intenisty_title_en.className = "report-intenisty-title";
		report_intenisty_title_en.innerText = "Max Int.";
		const report_intenisty_title_ja = document.createElement("span");
		report_intenisty_title_ja.lang = "ja";
		report_intenisty_title_ja.className = "report-intenisty-title";
		report_intenisty_title_ja.innerText = "最大震度";
		const report_intenisty_title_ru = document.createElement("span");
		report_intenisty_title_ru.lang = "ru";
		report_intenisty_title_ru.className = "report-intenisty-title";
		report_intenisty_title_ru.innerText = "Макс интенси";
		report_intenisty_title_ru.style = "font-size: 14px;line-height: 14px";
		const report_intenisty_title_zh_tw = document.createElement("span");
		report_intenisty_title_zh_tw.lang = "zh-TW";
		report_intenisty_title_zh_tw.className = "report-intenisty-title";
		report_intenisty_title_zh_tw.innerText = "最大震度";

		report_intenisty_title_container.append(report_intenisty_title_en, report_intenisty_title_ja, report_intenisty_title_ru, report_intenisty_title_zh_tw);
		report_intenisty_title_container.childNodes.forEach((node) => node.style.display = node.lang == setting["general.locale"] ? "unset" : "none");

		const report_intenisty_value = document.createElement("span");
		report_intenisty_value.className = "report-intenisty-value";
		report_intenisty_value.innerText = Level;
		report_intenisty_container.append(report_intenisty_title_container, report_intenisty_value);


		const report_detail_container = document.createElement("div");
		report_detail_container.className = "report-detail-container";

		const report_location = document.createElement("span");
		report_location.className = "report-location";
		report_location.innerText = `${star}${msg}`;
		const report_time = document.createElement("span");
		report_time.className = "report-time";
		report_time.innerText = report.originTime.replace(/-/g, "/");
		const report_magnitude = document.createElement("span");
		report_magnitude.className = "report-magnitude";
		report_magnitude.innerText = report.magnitudeValue.toFixed(1);
		const report_depth = document.createElement("span");
		report_depth.className = "report-depth";
		report_depth.innerText = report.depth;
		report_detail_container.append(report_location, report_time, report_magnitude, report_depth);

		report_container.append(report_intenisty_container, report_detail_container);
		ripple(Div);
		Div.append(report_container);
		Div.style.backgroundColor = `${color(report.data[0].areaIntensity)}cc`;
		ReportCache[report.originTime] = report;
		Div.addEventListener("click", (event) => {
			ReportClick(report.originTime);
		});
		Div.addEventListener("contextmenu", (event) => {
			if (replay != 0) return;
			if (report.ID.length != 0) {
				localStorage.TestID = report.ID;
				ipcRenderer.send("testEEW");
			} else {
				replay = new Date(report.originTime).getTime() - 25000;
				replayT = NOW.getTime();
			}
			toggleNav(false);
			document.getElementById("togglenav_btn").classList.add("hide");
			document.getElementById("stopReplay").classList.remove("hide");
		});
		if (prepend) {
			const locating = document.querySelector(".report-detail-container.locating");
			if (locating)
				locating.replaceWith(Div.children[0]);
			else {
				if (investigation) {
					investigation = false;
					roll.removeChild(roll.children[0]);
				}
				roll.prepend(Div);
			}
			if (ReportMarkID != null) {
				ReportMarkID = null;
				for (let index = 0; index < MarkList.length; index++)
					map.removeLayer(MarkList[index]);
			}
			ReportClick(report.originTime);
			ReportTag = NOW.getTime();
		} else
			roll.append(Div);
	}
}

// #endregion

// #region 設定
function openSettingWindow() {
	win.setAlwaysOnTop(false);
	ipcRenderer.send("openChildWindow");
}
// #endregion

// #region PGA
function PGAcount(Scale, distance, Si) {
	let S = Si ?? 1;
	if (!setting["earthquake.siteEffect"]) S = 1;
	// eslint-disable-next-line no-shadow
	const PGA = (1.657 * Math.pow(Math.E, (1.533 * Scale)) * Math.pow(distance, -1.607) * S).toFixed(3);
	return PGA >= 800 ? "7" :
		PGA <= 800 && PGA > 440 ? "6+" :
			PGA <= 440 && PGA > 250 ? "6-" :
				PGA <= 250 && PGA > 140 ? "5+" :
					PGA <= 140 && PGA > 80 ? "5-" :
						PGA <= 80 && PGA > 25 ? "4" :
							PGA <= 25 && PGA > 8 ? "3" :
								PGA <= 8 && PGA > 2.5 ? "2" :
									PGA <= 2.5 && PGA > 0.8 ? "1" :
										"0";
}
// #endregion

// #region Number >> Intensity
function IntensityI(Intensity) {
	return Intensity == 5 ? "5-" :
		Intensity == 6 ? "5+" :
			Intensity == 7 ? "6-" :
				Intensity == 8 ? "6+" :
					Intensity == 9 ? "7" :
						Intensity ?? "?";
}
// #endregion

// #region Intensity >> Number
function IntensityN(level) {
	return level == "5-" ? 5 :
		level == "5+" ? 6 :
			level == "6-" ? 7 :
				level == "6+" ? 8 :
					level == "7" ? 9 :
						Number(level);
}
// #endregion

// #region Intensity >> Class String
function IntensityToClassString(level) {
	return (level == 9) ? "seven" :
		(level == 8) ? "six strong" :
			(level == 7) ? "six" :
				(level == 6) ? "five strong" :
					(level == 5) ? "five" :
						(level == 4) ? "four" :
							(level == 3) ? "three" :
								(level == 2) ? "two" :
									(level == 1) ? "one" :
										"zero";
}
// #endregion

// #region color
function color(Intensity) {
	return ["#666666", "#0165CC", "#01BB02", "#EBC000", "#FF8400", "#E06300", "#FF0000", "#B50000", "#68009E"][Intensity ? Intensity - 1 : Intensity];
}
// #endregion

// #region IPC
ipcMain.once("start", () => {
	try {
		setInterval(() => {
			if (DATAstamp != 0 && Stamp != DATAstamp) {
				Stamp = DATAstamp;
				FCMdata(DATA);
			}
		}, 0);
		dump({ level: 0, message: `Initializing ServerCore >> ${ServerVer} | MD5 >> ${MD5Check}`, origin: "Initialization" });
	} catch (error) {
		showDialog("error", "發生錯誤", `初始化過程中發生錯誤，您可以繼續使用此應用程式，但無法保證所有功能皆能繼續正常運作。\n\n如果這是您第一次看到這個訊息，請嘗試重新啟動應用程式。\n如果這個錯誤持續出現，請到 TREM Discord 伺服器回報問題。\n\n錯誤訊息：${error}`);
		$("#load").delay(1000).fadeOut(1000);
		dump({ level: 2, message: error, origin: "Initialization" });
	}
});

const stopReplay = function() {
	if (Object.keys(EarthquakeList).length != 0) Cancel = true;
	if (Object.keys(pga).length != 0)PGACancel = true;
	if (replay != 0) {
		replay = 0;
		ReportGET();
	}
	All = [];
	const data = {
		Function      : "earthquake",
		Type          : "cancel",
		FormatVersion : 3,
		UUID          : localStorage.UUID,
	};
	axios.post(PostAddressIP, data)
		.catch((error) => {
			dump({ level: 2, message: error, origin: "Verbose" });
		});

	document.getElementById("togglenav_btn").classList.remove("hide");
	document.getElementById("stopReplay").classList.add("hide");
};

ipcMain.on("testEEW", () => {
	Server = [];
	if (localStorage.TestID != undefined) {
		const list = localStorage.TestID.split(",");
		for (let index = 0; index < list.length; index++)
			setTimeout(() => {
				dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
				const data = {
					Function      : "earthquake",
					Type          : "test",
					FormatVersion : 3,
					UUID          : localStorage.UUID,
					ID            : list[index],
				};
				dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
				axios.post(PostAddressIP, data)
					.catch((error) => {
						dump({ level: 2, message: error, origin: "Verbose" });
					});
			}, 100);
		delete localStorage.TestID;
	} else {
		dump({ level: 0, message: "Start EEW Test", origin: "EEW" });
		const data = {
			Function      : "earthquake",
			Type          : "test",
			FormatVersion : 3,
			UUID          : localStorage.UUID,
		};
		dump({ level: 3, message: `Timer status: ${TimerDesynced ? "Desynced" : "Synced"}`, origin: "Verbose" });
		axios.post(PostAddressIP, data)
			.catch((error) => {
				dump({ level: 2, message: error, origin: "Verbose" });
			});
	}
});
ipcRenderer.on("settingError", (event, error) => {
	is_setting_disabled = error;
});
const updateMapColors = async (event, value) => {
	let accent, dark;
	if (typeof value == "boolean") {
		accent = setting["theme.color"];
		dark = value;
	} else {
		accent = value;
		dark = setting["theme.dark"];
	}
	const colors = await getThemeColors(accent, dark);

	map_geoJson.options.style = {
		weight      : 0.8,
		color       : colors.primary,
		fillColor   : colors.surfaceVariant,
		fillOpacity : 1,
	};
	map_geoJson.redraw();
};
ipcRenderer.on("config:theme", updateMapColors);
ipcRenderer.on("config:dark", updateMapColors);
ipcRenderer.on("config:location", (event, value) => {
	setUserLocationMarker(value);
});
// #endregion

// #region EEW
async function FCMdata(data) {
	const json = JSON.parse(data);
	if (Server.includes(json.TimeStamp) || NOW.getTime() - json.TimeStamp > 180000) return;
	Server.push(json.TimeStamp);
	GetData = true;
	if (json.response != "You have successfully subscribed to earthquake information" && json.FormatVersion == 1) {
		const folder = path.join(app.getPath("userData"), "data");
		if (!fs.existsSync(folder))
			fs.mkdirSync(folder);
		const list = fs.readdirSync(folder);
		for (let index = 0; index < list.length; index++) {
			const date = fs.statSync(`${folder}/${list[index]}`);
			if (new Date().getTime() - date.ctimeMs > 3600000) fs.unlinkSync(`${folder}/${list[index]}`);
		}
		const filename = `${NOW.getTime()}.json`;
		fs.writeFileSync(path.join(folder, filename), JSON.stringify(json));
	}
	if (json.TimeStamp != undefined)
		dump({ level: 0, message: `Latency: ${NOW.getTime() - json.TimeStamp}ms`, origin: "API" });
	if (json.Function == "tsunami") {
		dump({ level: 0, message: "Got Tsunami Warning", origin: "API" });
		new Notification("海嘯資訊", { body: `${json["UTC+8"]} 發生 ${json.Scale} 地震\n\n東經: ${json.EastLongitude} 度\n北緯: ${json.NorthLatitude} 度`, icon: "TREM.ico" });
	} else if (json.Function == "TSUNAMI")
		TREM.Earthquake.emit("tsunami", json);
	else if (json.Function == "palert")
		PAlert = json.Data;
	else if (json.Function == "TREM_earthquake")
		trem_alert = json;
	else if (json.Function == "Replay") {
		replay = json.timestamp;
		replayT = NOW.getTime();
		ReportGET();
	} else if (json.Function == "report") {
		if (Pgeojson != null) {
			map.removeLayer(Pgeojson);
			Pgeojson = null;
		}
		dump({ level: 0, message: "Got Earthquake Report", origin: "API" });
		if (setting["report.show"]) {
			win.show();
			if (setting["report.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		if (setting["audio.report"]) audioPlay("./audio/Report.wav");
		new Notification("地震報告", { body: `${json.Location.substring(json.Location.indexOf("(") + 1, json.Location.indexOf(")")).replace("位於", "")}\n${json["UTC+8"]}\n發生 M${json.Scale} 有感地震`, icon: "TREM.ico" });
		const report = await getReportData();
		addReport(report[0], true);
		setTimeout(() => {
			ipcRenderer.send("screenshotEEW", {
				Function : "report",
				ID       : json.ID,
				Version  : 1,
				Time     : NOW.getTime(),
				Shot     : 1,
			});
		}, 5000);
	} else if (json.Function != undefined && json.Function.includes("earthquake") || json.Replay || json.Test) {
		if (replay != 0 && !json.Replay) return;
		if (!json.Replay && !json.Test) {
			if (json.Function == "SCDZJ_earthquake" && !setting["accept.eew.SCDZJ"]) return;
			if (json.Function == "NIED_earthquake" && !setting["accept.eew.NIED"]) return;
			if (json.Function == "JMA_earthquake" && !setting["accept.eew.JMA"]) return;
			if (json.Function == "KMA_earthquake" && !setting["accept.eew.KMA"]) return;
			if (json.Function == "earthquake" && !setting["accept.eew.CWB"]) return;
			if (json.Function == "FJDZJ_earthquake" && !setting["accept.eew.FJDZJ"]) return;
			TREM.Earthquake.emit("eew", json);
		} else
			TREM.Earthquake.emit("eew", json);
	}
}
// #endregion

TREM.Earthquake.on("eew", async (data) => {
	dump({ level: 0, message: "Got EEW", origin: "API" });
	console.debug(data);

	// handler
	Info.ID = data.ID;
	if (EarthquakeList[data.ID] == undefined) EarthquakeList[data.ID] = {};
	EarthquakeList[data.ID].Time = data.Time;
	EarthquakeList[data.ID].ID = data.ID;
	let value = 0;
	let distance = 0;

	const GC = {};
	let level;
	let MaxIntensity = 0;
	for (let index = 0; index < Object.keys(locationEEW).length; index++) {
		const city = Object.keys(locationEEW)[index];
		for (let Index = 0; Index < Object.keys(locationEEW[city]).length; Index++) {
			const town = Object.keys(locationEEW[city])[Index];
			const point = Math.sqrt(Math.pow(Math.abs(locationEEW[city][town][1] + (Number(data.NorthLatitude) * -1)) * 111, 2) + Math.pow(Math.abs(locationEEW[city][town][2] + (Number(data.EastLongitude) * -1)) * 101, 2));
			const Distance = Math.sqrt(Math.pow(Number(data.Depth), 2) + Math.pow(point, 2));
			const Level = PGAcount(data.Scale, Distance, locationEEW[city][town][3]);
			if (UserLocationLat == locationEEW[city][town][1] && UserLocationLon == locationEEW[city][town][2]) {
				if (setting["auto.waveSpeed"])
					if (Distance < 50) {
						Pspeed = 6.5;
						Sspeed = 3.5;
					}
				level = Level;
				value = Math.round((Distance - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed) - 5;
				distance = Distance;
			}
			const Intensity = IntensityN(Level);
			if (Intensity > MaxIntensity) MaxIntensity = Intensity;
			GC[city + town] = Intensity;
		}
	}
	let Alert = true;
	if (IntensityN(level) < Number(setting["eew.Intensity"]) && !data.Replay) Alert = false;
	if (!Info.Notify.includes(data.ID)) {
		let Nmsg = "";
		if (value > 0)
			Nmsg = `${value}秒後抵達`;
		else
			Nmsg = "已抵達 (預警盲區)";
		new Notification("EEW 強震即時警報", { body: `${level.replace("+", "強").replace("-", "弱")}級地震，${Nmsg}\nM ${data.Scale} ${data.Location ?? "未知區域"}\n延遲 ${NOW.getTime() - data.TimeStamp}ms`, icon: "TREM.ico" });
		Info.Notify.push(data.ID);
		// show latest eew
		TINFO = INFO.length;
		clearInterval(ticker);
		ticker = setInterval(() => {
			if (TINFO + 1 >= INFO.length)
				TINFO = 0;
			else TINFO++;
		}, 5000);
		if (setting["eew.show"] && Alert) {
			win.show();
			win.flashFrame(true);
			if (setting["eew.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		EEWT.id = data.ID;
		if (setting["audio.eew"] && Alert) {
			audioPlay("./audio/EEW.wav");
			audioPlay1(`./audio/1/${level.replace("+", "").replace("-", "")}.wav`);
			if (level.includes("+"))
				audioPlay1("./audio/1/intensity-strong.wav");
			else if (level.includes("-"))
				audioPlay1("./audio/1/intensity-weak.wav");
			else
				audioPlay1("./audio/1/intensity.wav");

			if (value > 0 && value < 100) {
				if (value <= 10)
					audioPlay1(`./audio/1/${value.toString()}.wav`);
				else if (value < 20)
					audioPlay1(`./audio/1/x${value.toString().substring(1, 2)}.wav`);
				else {
					audioPlay1(`./audio/1/${value.toString().substring(0, 1)}x.wav`);
					audioPlay1(`./audio/1/x${value.toString().substring(1, 2)}.wav`);
				}
				audioPlay1("./audio/1/second.wav");
			}
		}
	}
	if (EEW[data.ID] == undefined && !Info.Warn.includes(data.ID) && MaxIntensity >= 5) {
		Info.Warn.push(data.ID);
		data.Alert = true;
		if (!EEWAlert) {
			EEWAlert = true;
			if (setting["audio.eew"] && Alert)
				for (let index = 0; index < 5; index++)
					audioPlay("./audio/Alert.wav");
		}
	} else
		data.Alert = false;

	let _time = -1;
	let stamp = 0;
	if (data.ID + data.Version != Info.Alert) {
		if (EEW[data.ID] != undefined)
			if (setting["audio.eew"] && Alert) audioPlay("./audio/Update.wav");
		EEW[data.ID] = {
			lon  : Number(data.EastLongitude),
			lat  : Number(data.NorthLatitude),
			time : 0,
			Time : data.Time,
			id   : data.ID,
			km   : 0,
		};
		Info.Alert = data.ID + data.Version;
		value = Math.round((distance - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed);
		if (Second == -1 || value < Second)
			if (setting["audio.eew"] && Alert) {
				if (t != null) clearInterval(t);
				t = setInterval(() => {
					value = Math.floor((distance - ((NOW.getTime() - data.Time) / 1000) * Sspeed) / Sspeed);
					Second = value;
					if (stamp != value && !audioLock1) {
						stamp = value;
						if (_time >= 0) {
							audioPlay("./audio/1/ding.wav");
							_time++;
							if (_time >= 10)
								clearInterval(t);
						} else if (value < 100) {
							if (arrive.includes(data.ID)) {
								clearInterval(t);
								return;
							}
							if (value > 10)
								if (value.toString().substring(1, 2) == "0") {
									audioPlay1(`./audio/1/${value.toString().substring(0, 1)}x.wav`);
									audioPlay1("./audio/1/x0.wav");
								} else
									audioPlay("./audio/1/ding.wav");

							else if (value > 0)
								audioPlay1(`./audio/1/${value.toString()}.wav`);
							else {
								arrive.push(data.ID);
								audioPlay1("./audio/1/arrive.wav");
								_time = 0;
							}
						}
					}
				}, 50);
			}

	}
	if (ReportMarkID != null) {
		ReportMarkID = null;
		for (let index = 0; index < MarkList.length; index++)
			map.removeLayer(MarkList[index]);

	}
	let speed = 500;
	if (setting["shock.smoothing"]) speed = 100;
	if (EarthquakeList[data.ID].Timer != undefined) clearInterval(EarthquakeList[data.ID].Timer);
	if (EarthquakeList.ITimer != undefined) clearInterval(EarthquakeList.ITimer);

	// AlertBox: 種類
	let classString = "alert-box ";
	if (data.Replay) {
		replay = data.timestamp;
		replayT = NOW.getTime();
	} else
		replay = 0;

	if (data.Test)
		classString += "eew-test";
	else if (data.Alert)
		classString += "eew-alert";
	else
		classString += "eew-pred";

	let find = INFO.findIndex(v => v.ID == data.ID);
	if (find == -1) find = INFO.length;
	INFO[find] = {
		ID              : data.ID,
		alert_number    : data.Version,
		alert_intensity : MaxIntensity,
		alert_location  : data.Location ?? "未知區域",
		alert_time      : new Date(data["UTC+8"]),
		alert_sTime     : new Date(data.Time),
		alert_local     : IntensityN(level),
		alert_magnitude : data.Scale,
		alert_depth     : data.Depth,
		alert_provider  : data.Unit,
		alert_type      : classString,
		"intensity-1"   : `<font color="white" size="7"><b>${IntensityI(MaxIntensity)}</b></font>`,
		"time-1"        : `<font color="white" size="2"><b>${data["UTC+8"]}</b></font>`,
		"info-1"        : `<font color="white" size="4"><b>M ${data.Scale} </b></font><font color="white" size="3"><b> 深度: ${data.Depth} km</b></font>`,
		distance,
	};

	// switch to main view
	$("#mainView_btn")[0].click();
	// remember navrail state
	const navState = !$("#nav-rail").hasClass("hide");
	// hide navrail so the view goes fullscreen
	if (navState) toggleNav(false);
	// hide report to make screen clean
	$(roll).fadeOut(200);
	// show minimap
	$("#map-tw").addClass("show");

	updateText();

	if (ITimer == null)
		ITimer = setInterval(() => {
			updateText();
			if (ticker == null)
				ticker = setInterval(() => {
					if (TINFO + 1 >= INFO.length)
						TINFO = 0;
					else TINFO++;
				}, 5000);
		}, 1000);

	EEWshot = NOW.getTime() - 28500;
	EEWshotC = 1;
	const S1 = 0;
	main(data, S1);
	EarthquakeList[data.ID].Timer = setInterval(() => {
		main(data, S1);
	}, speed);

	const colors = await getThemeColors(setting["theme.color"], setting["theme.dark"]);
	EarthquakeList[data.ID].geojson = L.geoJson.vt(MapData.DmapT, {
		minZoom   : 4,
		maxZoom   : 12,
		tolerance : 10,
		buffer    : 256,
		debug     : 0,
		style     : (properties) => {
			if (properties.COUNTY != undefined) {
				const name = properties.COUNTY + properties.TOWN;
				if (GC[name] == 0 || GC[name] == undefined)
					return {
						color       : colors.primary,
						weight      : 0.4,
						opacity     : 1,
						fillColor   : colors.surfaceVariant,
						fillOpacity : 0.6,
					};
				return {
					color       : colors.primary,
					weight      : 0.4,
					opacity     : 1,
					fillColor   : color(GC[name]),
					fillOpacity : 1,
				};
			} else
				return {
					color       : colors.primary,
					weight      : 0.4,
					opacity     : 1,
					fillColor   : colors.surfaceVariant,
					fillOpacity : 0.6,
				};
		},
	});
	mapTW.addLayer(EarthquakeList[data.ID].geojson);

	setTimeout(() => {
		if (setting["webhook.url"] != "") {
			const Now = NOW.getFullYear() +
				"/" + (NOW.getMonth() + 1) +
				"/" + NOW.getDate() +
				" " + NOW.getHours() +
				":" + NOW.getMinutes() +
				":" + NOW.getSeconds();

			let msg = setting["webhook.body"];
			msg = msg.replace("%Depth%", data.Depth).replace("%NorthLatitude%", data.NorthLatitude).replace("%Time%", data["UTC+8"]).replace("%EastLongitude%", data.EastLongitude).replace("%Scale%", data.Scale);
			if (data.Function == "earthquake")
				msg = msg.replace("%Provider%", "交通部中央氣象局");
			else if (data.Function == "SCDZJ_earthquake")
				msg = msg.replace("%Provider%", "四川省地震局");
			else if (data.Function == "FJDZJ_earthquake")
				msg = msg.replace("%Provider%", "福建省地震局");
			else if (data.Function == "NIED_earthquake")
				msg = msg.replace("%Provider%", "防災科学技術研究所");
			else if (data.Function == "JMA_earthquake")
				msg = msg.replace("%Provider%", "気象庁");
			else if (data.Function == "KMA_earthquake")
				msg = msg.replace("%Provider%", "기상청氣象廳");

			msg = JSON.parse(msg);
			msg.username = "TREM | 臺灣即時地震監測";

			msg.embeds[0].image.url = "";
			msg.embeds[0].footer = {
				text     : `ExpTech Studio ${Now}`,
				icon_url : "https://raw.githubusercontent.com/ExpTechTW/API/master/image/Icon/ExpTech.png",
			};
			dump({ level: 0, message: "Posting Webhook", origin: "Webhook" });
			axios.post(setting["webhook.url"], msg)
				.catch((error) => {
					dump({ level: 2, message: error, origin: "Webhook" });
				});
		}
	}, 2000);
});

TREM.Earthquake.on("tsunami", (data) => {
	if (data.Version == 1) {
		new Notification("海嘯警報", { body: `${data["UTC+8"]} 發生 ${data.Scale} 地震\n\n東經: ${data.EastLongitude} 度\n北緯: ${data.NorthLatitude} 度`, icon: "TREM.ico" });
		if (setting["report.show"]) {
			win.show();
			if (setting["report.cover"]) win.setAlwaysOnTop(true);
			win.setAlwaysOnTop(false);
		}
		if (setting["audio.report"]) audioPlay("./audio/Water.wav");
		TREM.Earthquake.emit("focus", { center: [23.608428, 120.799168], size: 7.75 });
	}
	if (data.Cancel) {
		if (TSUNAMI.E)
			TSUNAMI.E.remove();
		if (TSUNAMI.EN)
			TSUNAMI.EN.remove();
		if (TSUNAMI.ES)
			TSUNAMI.ES.remove();
		if (TSUNAMI.N)
			TSUNAMI.N.remove();
		if (TSUNAMI.WS)
			TSUNAMI.WS.remove();
		if (TSUNAMI.W)
			TSUNAMI.W.remove();
		if (TSUNAMI.warnIcon)
			TSUNAMI.warnIcon.remove();
		TSUNAMI = {};
	} else {
		if (!TSUNAMI.warnIcon) {
			const warnIcon = L.icon({
				iconUrl   : "./image/warn.png",
				iconSize  : [30, 30],
				className : "tsunami",
			});
			TSUNAMI.warnIcon = L.marker([+data.NorthLatitude, +data.EastLongitude], { icon: warnIcon }).addTo(map);
		} else TSUNAMI.warnIcon.setLatLng([+data.NorthLatitude, +data.EastLongitude]);

		if (!TSUNAMI.E) {
			TSUNAMI.E = L.geoJson.vt(MapData.E, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[0].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.E._container, "tsunami");
		} else TSUNAMI.E.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[0].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.EN) {
			TSUNAMI.EN = L.geoJson.vt(MapData.EN, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[1].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.EN._container, "tsunami");
		} else TSUNAMI.EN.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[1].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.ES) {
			TSUNAMI.ES = L.geoJson.vt(MapData.ES, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[2].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.ES._container, "tsunami");
		} else TSUNAMI.ES.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[2].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.N) {
			TSUNAMI.N = L.geoJson.vt(MapData.N, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor.vt(data.Addition[3].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.N._container, "tsunami");
		} else TSUNAMI.N.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[3].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.WS) {
			TSUNAMI.WS = L.geoJson.vt(MapData.WS, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[4].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.WS._container, "tsunami");
		} else TSUNAMI.WS.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[4].areaColor),
			fill    : false,
		});

		if (!TSUNAMI.W) {
			TSUNAMI.W = L.geoJson.vt(MapData.W, {
				minZoom   : 4,
				maxZoom   : 12,
				tolerance : 10,
				buffer    : 256,
				debug     : 0,
				style     : {
					weight  : 10,
					opacity : 1,
					color   : Tcolor(data.Addition[5].areaColor),
					fill    : false,
				},
			}).addTo(map);
			L.DomUtil.addClass(TSUNAMI.W._container, "tsunami");
		} else TSUNAMI.W.setStyle({
			weight  : 10,
			opacity : 1,
			color   : Tcolor(data.Addition[5].areaColor),
			fill    : false,
		});
	}
});

function main(data, S1) {
	if (EarthquakeList[data.ID].Cancel == undefined) {
		if (setting["shock.p"]) {
			const km = Math.sqrt(Math.pow((NOW.getTime() - data.Time) * Pspeed, 2) - Math.pow(Number(data.Depth) * 1000, 2));
			if (km > 0) {
				if (!EarthquakeList[data.ID].CircleP)
					EarthquakeList[data.ID].CircleP = L.circle([+data.NorthLatitude, +data.EastLongitude], {
						color     : "#6FB7B7",
						fillColor : "transparent",
						radius    : km,
					}).addTo(map);
				else
					EarthquakeList[data.ID].CircleP
						.setLatLng([+data.NorthLatitude, +data.EastLongitude])
						.setRadius(km);

				if (!EarthquakeList[data.ID].CirclePTW)
					EarthquakeList[data.ID].CirclePTW = L.circle([data.NorthLatitude, data.EastLongitude], {
						color     : "#6FB7B7",
						fillColor : "transparent",
						radius    : km,
					}).addTo(mapTW);
				else
					EarthquakeList[data.ID].CirclePTW
						.setLatLng([+data.NorthLatitude, +data.EastLongitude])
						.setRadius(km);
			}
		}
		const km = Math.pow((NOW.getTime() - data.Time) * Sspeed, 2) - Math.pow(Number(data.Depth) * 1000, 2);
		if (EarthquakeList[data.ID].Depth != null) map.removeLayer(EarthquakeList[data.ID].Depth);
		if (km > 0) {
			const KM = Math.sqrt(km);
			EEW[data.ID].km = KM;
			if (!EarthquakeList[data.ID].CircleS)
				EarthquakeList[data.ID].CircleS = L.circle([+data.NorthLatitude, +data.EastLongitude], {
					color       : data.Alert ? "red" : "orange",
					fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					fillOpacity : 1,
					radius      : KM,
					renderer    : L.svg(),
					className   : "s-wave-inner",
				}).addTo(map);
			else
				EarthquakeList[data.ID].CircleS
					.setLatLng([+data.NorthLatitude, +data.EastLongitude])
					.setRadius(KM)
					.setStyle(
						{
							color     : data.Alert ? "red" : "orange",
							fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						},
					);

			if (!EarthquakeList[data.ID].CircleSTW)
				EarthquakeList[data.ID].CircleSTW = L.circle([+data.NorthLatitude, +data.EastLongitude], {
					color       : data.Alert ? "red" : "orange",
					fillColor   : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
					fillOpacity : 1,
					radius      : KM,
					renderer    : L.svg(),
				}).addTo(mapTW);
			else
				EarthquakeList[data.ID].CircleSTW
					.setLatLng([+data.NorthLatitude, +data.EastLongitude])
					.setRadius(KM)
					.setStyle(
						{
							color     : data.Alert ? "red" : "orange",
							fillColor : `url(#${data.Alert ? "alert" : "pred"}-gradient)`,
						},
					);
		} else {
			let Progress = 0;
			const num = Math.round(((NOW.getTime() - data.Time) * Sspeed / (data.Depth * 1000)) * 100);
			if (num > 15) Progress = 1;
			if (num > 25) Progress = 2;
			if (num > 35) Progress = 3;
			if (num > 45) Progress = 4;
			if (num > 55) Progress = 5;
			if (num > 65) Progress = 6;
			if (num > 75) Progress = 7;
			if (num > 85) Progress = 8;
			if (num > 98) Progress = 9;
			const myIcon = L.icon({
				iconUrl  : `./image/progress${Progress}.png`,
				iconSize : [50, 50],
			});
			const DepthM = L.marker([Number(data.NorthLatitude), Number(data.EastLongitude) + 0.15], { icon: myIcon });
			EarthquakeList[data.ID].Depth = DepthM;
			map.addLayer(DepthM);
			DepthM.setZIndexOffset(6000);
		}


		// #region Epicenter Cross Icon

		let epicenterIcon;
		let offsetX = 0;
		let offsetY = 0;

		const cursor = INFO.findIndex((v) => v.ID == data.ID) + 1;
		if (cursor <= 4 && INFO.length > 1) {
			epicenterIcon = L.icon({
				iconUrl   : `./image/cross${cursor}.png`,
				iconSize  : [40, 40],
				className : "epicenterIcon",
			});
			if (cursor == 1) offsetY = 0.03;
			if (cursor == 2) offsetX = 0.03;
			if (cursor == 3) offsetY = -0.03;
			if (cursor == 4) offsetX = -0.03;
		} else
			epicenterIcon = L.icon({
				iconUrl   : "./image/cross.png",
				iconSize  : [30, 30],
				className : "epicenterIcon",
			});

		// main map
		if (!EarthquakeList[data.ID].epicenterIcon)
			EarthquakeList[data.ID].epicenterIcon = L.marker([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX], { icon: epicenterIcon, zIndexOffset: 6000 }).addTo(map);
		else
			EarthquakeList[data.ID].epicenterIcon.setLatLng([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]).setIcon(epicenterIcon);

		// mini map
		if (!EarthquakeList[data.ID].epicenterIconTW)
			EarthquakeList[data.ID].epicenterIconTW = L.marker([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX], { icon: epicenterIcon }).addTo(mapTW);
		else
			EarthquakeList[data.ID].epicenterIconTW.setLatLng([+data.NorthLatitude + offsetY, +data.EastLongitude + offsetX]).setIcon(epicenterIcon);

		// #endregion <- Epicenter Cross Icon


		if (NOW.getTime() - EEWshot > 60000)
			EEWshotC = 1;
		if (NOW.getTime() - EEWshot > 30000 && EEWshotC <= 2 && S1 == 1) {
			EEWshotC++;
			EEWshot = NOW.getTime();
			setTimeout(() => {
				ipcRenderer.send("screenshotEEW", {
					Function : data.Function,
					ID       : data.ID,
					Version  : data.Version,
					Time     : NOW.getTime(),
					Shot     : EEWshotC,
				});
			}, 300);
		}
	}
	if (data.Cancel && EarthquakeList[data.ID].Cancel == undefined)
		for (let index = 0; index < INFO.length; index++)
			if (INFO[index].ID == data.ID) {
				INFO[index].alert_provider += " (取消)";
				clear(data.ID);
				data.TimeStamp = NOW.getTime() - 210000;
				EarthquakeList[data.ID].Cancel = true;
				if (Object.keys(EarthquakeList).length == 1) {
					clearInterval(t);
					audioList = [];
					audioList1 = [];
				}
				break;
			}
	if (NOW.getTime() - data.TimeStamp > 180_000 || Cancel) {
		clear(data.ID);

		// remove epicenter cross icons
		EarthquakeList[data.ID].epicenterIcon.remove();
		EarthquakeList[data.ID].epicenterIconTW.remove();

		for (let index = 0; index < INFO.length; index++)
			if (INFO[index].ID == data.ID) {
				TINFO = 0;
				INFO.splice(index, 1);
				break;
			}
		clearInterval(EarthquakeList[data.ID].Timer);
		document.getElementById("box-10").innerHTML = "";
		delete EarthquakeList[data.ID];
		delete EEW[data.ID];
		if (Object.keys(EarthquakeList).length == 0) {
			if (GeoJson != null) mapTW.removeLayer(GeoJson);
			GeoJson = null;
			clearInterval(t);
			audioList = [];
			audioList1 = [];
			Second = -1;
			EEWAlert = false;
			// hide eew alert
			ticker = null;
			Cancel = false;
			if (replay != 0) {
				replay = 0;
				ReportGET();
			}
			INFO = [];
			All = [];
			$("#alert-box").removeClass("show");
			$("#map-legends").removeClass("show");
			// hide minimap
			$("#map-tw").removeClass("show");
			// restore reports
			$(roll).fadeIn(200);
			clearInterval(ITimer);
			ITimer = null;
			document.getElementById("togglenav_btn").classList.remove("hide");
			document.getElementById("stopReplay").classList.add("hide");
		}
	}
}

function Tcolor(text) {
	return (text == "黃色") ? "yellow" :
		(text == "橙色") ? "red" :
			(text == "綠色") ? "transparent" :
				"purple";
}

function clear(ID) {
	if (EarthquakeList[ID].CircleS != undefined) map.removeLayer(EarthquakeList[ID].CircleS);
	if (EarthquakeList[ID].CircleP != undefined) map.removeLayer(EarthquakeList[ID].CircleP);
	if (EarthquakeList[ID].CircleSTW != undefined) mapTW.removeLayer(EarthquakeList[ID].CircleSTW);
	if (EarthquakeList[ID].CirclePTW != undefined) mapTW.removeLayer(EarthquakeList[ID].CirclePTW);
}

function updateText() {
	$("#alert-box")[0].className = `${INFO[TINFO].alert_type} ${IntensityToClassString(INFO[TINFO].alert_intensity)}`;
	$("#alert-local")[0].className = `alert-item ${IntensityToClassString(INFO[TINFO].alert_local)}`;
	$("#alert-provider").text(`${INFO.length > 1 ? `${TINFO + 1} ` : ""}${INFO[TINFO].alert_provider}`);
	$("#alert-number").text(`${INFO[TINFO].alert_number}`);
	$("#alert-location").text(INFO[TINFO].alert_location);
	$("#alert-time").text(INFO[TINFO].alert_time.format("YYYY/MM/DD HH:mm:ss"));
	$("#alert-magnitude").text(INFO[TINFO].alert_magnitude);
	$("#alert-depth").text(INFO[TINFO].alert_depth);
	$("#alert-box").addClass("show");
	$("#map-legends").addClass("show");
	if (GeoJsonID != INFO[TINFO].ID) {
		if (GeoJson != null) mapTW.removeLayer(GeoJson);
		if (EarthquakeList[INFO[TINFO].ID].geojson != undefined) {
			GeoJson = EarthquakeList[INFO[TINFO].ID].geojson;
			mapTW.addLayer(GeoJson);
			GeoJsonID = INFO[TINFO].ID;
		}
	}

	if (EarthquakeList[INFO[TINFO].ID].Cancel != undefined) {
		$("#alert-p").text("X");
		$("#alert-s").text("X");
	} else {
		let num = Math.floor((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Sspeed) / Sspeed);
		if (num <= 0) num = "";
		$("#alert-s").text(num);

		num = Math.floor((INFO[TINFO].distance - ((NOW.getTime() - INFO[TINFO].alert_sTime.getTime()) / 1000) * Pspeed) / Pspeed);
		if (num <= 0) num = "";
		$("#alert-p").text(num);
	}

	// bring waves to front
	if (EarthquakeList[INFO[TINFO].ID].CircleP) EarthquakeList[INFO[TINFO].ID].CircleP.bringToFront();
	if (EarthquakeList[INFO[TINFO].ID].CirclePTW) EarthquakeList[INFO[TINFO].ID].CirclePTW.bringToFront();
	if (EarthquakeList[INFO[TINFO].ID].CircleS) EarthquakeList[INFO[TINFO].ID].CircleS.bringToFront();
	if (EarthquakeList[INFO[TINFO].ID].CircleSTW) EarthquakeList[INFO[TINFO].ID].CircleSTW.bringToFront();

	const Num = Math.round(((NOW.getTime() - INFO[TINFO].Time) * 4 / 10) / INFO[TINFO].Depth);
	const Catch = document.getElementById("box-10");
	if (Num <= 100)
		Catch.innerHTML = `<font color="white" size="6"><b>震波到地表進度: ${Num}%</b></font>`;
	else
		Catch.innerHTML = "";
}