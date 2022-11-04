const { region } = require("../Resources/Resources");
const intensities = [
	{ value: 0, label: "0", get text() { return TREM.Localization.getString("Intensity_Zero"); } },
	{ value: 1, label: "1", get text() { return TREM.Localization.getString("Intensity_One"); } },
	{ value: 2, label: "2", get text() { return TREM.Localization.getString("Intensity_Two"); } },
	{ value: 3, label: "3", get text() { return TREM.Localization.getString("Intensity_Three"); } },
	{ value: 4, label: "4", get text() { return TREM.Localization.getString("Intensity_Four"); } },
	{ value: 5, label: "5-", get text() { return TREM.Localization.getString("Intensity_Five_Weak"); } },
	{ value: 6, label: "5+", get text() { return TREM.Localization.getString("Intensity_Five_Strong"); } },
	{ value: 7, label: "6-", get text() { return TREM.Localization.getString("Intensity_Six_Weak"); } },
	{ value: 8, label: "6+", get text() { return TREM.Localization.getString("Intensity_Six_Strong"); } },
	{ value: 9, label: "7", get text() { return TREM.Localization.getString("Intensity_Seven"); } },
];
const twoPointDistance = ({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }) => (((lat1 - lat2) * 111) ** 2 + ((lon1 - lon2) * 101) ** 2) ** 0.5;
const twoSideDistance = (side1, side2) => (side1 ** 2 + side2 ** 2) ** 0.5;
const pga = (magnitde, distance, siteEffect = 1) => (1.657 * Math.pow(Math.E, (1.533 * magnitde)) * Math.pow(distance, -1.607) * siteEffect).toFixed(3);
const PGAToIntensity = (value) => intensities[value >= 800 ? 9 :
	value <= 800 && value > 440 ? 8 :
		value <= 440 && value > 250 ? 7 :
			value <= 250 && value > 140 ? 6 :
				value <= 140 && value > 80 ? 5 :
					value <= 80 && value > 25 ? 4 :
						value <= 25 && value > 8 ? 3 :
							value <= 8 && value > 2.5 ? 2 :
								value <= 2.5 && value > 0.8 ? 1 :
									0];

/**
 * @param {string} regionname
 */
const findRegions = (textToSearch) => {
	const matches = textToSearch.matchAll(/(?:(基隆市|臺北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|臺中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|高雄市|屏東縣|臺東縣|花蓮縣|宜蘭縣|澎湖縣|金門縣|連江縣).*?(中正區|七堵區|暖暖區|仁愛區|中山區|安樂區|信義區|松山區|信義區|大安區|中山區|中正區|大同區|萬華區|文山區|南港區|內湖區|士林區|北投區|板橋區|三重區|中和區|永和區|新莊區|新店區|樹林區|鶯歌區|三峽區|淡水區|汐止區|瑞芳區|土城區|蘆洲區|五股區|泰山區|林口區|深坑區|石碇區|坪林區|三芝區|石門區|八里區|平溪區|雙溪區|貢寮區|金山區|萬里區|烏來區|桃園區|中壢區|大溪區|楊梅區|蘆竹區|大園區|龜山區|八德區|龍潭區|平鎮區|新屋區|觀音區|復興區|東區|北區|香山區|竹北市|竹東鎮|新埔鎮|關西鎮|湖口鄉|新豐鄉|芎林鄉|橫山鄉|北埔鄉|寶山鄉|峨眉鄉|尖石鄉|五峰鄉|苗栗市|苑裡鎮|通霄鎮|竹南鎮|頭份市|後龍鎮|卓蘭鎮|大湖鄉|公館鄉|銅鑼鄉|南庄鄉|頭屋鄉|三義鄉|西湖鄉|造橋鄉|三灣鄉|獅潭鄉|泰安鄉|中區|東區|南區|西區|北區|西屯區|南屯區|北屯區|豐原區|東勢區|大甲區|清水區|沙鹿區|梧棲區|后里區|神岡區|潭子區|大雅區|新社區|石岡區|外埔區|大安區|烏日區|大肚區|龍井區|霧峰區|太平區|大里區|和平區|彰化市|鹿港鎮|和美鎮|線西鄉|伸港鄉|福興鄉|秀水鄉|花壇鄉|芬園鄉|員林市|溪湖鎮|田中鎮|大村鄉|埔鹽鄉|埔心鄉|永靖鄉|社頭鄉|二水鄉|北斗鎮|二林鎮|田尾鄉|埤頭鄉|芳苑鄉|大城鄉|竹塘鄉|溪州鄉|南投市|埔里鎮|草屯鎮|竹山鎮|集集鎮|名間鄉|鹿谷鄉|中寮鄉|魚池鄉|國姓鄉|水里鄉|信義鄉|仁愛鄉|斗六市|斗南鎮|虎尾鎮|西螺鎮|土庫鎮|北港鎮|古坑鄉|大埤鄉|莿桐鄉|林內鄉|二崙鄉|崙背鄉|麥寮鄉|東勢鄉|褒忠鄉|臺西鄉|元長鄉|四湖鄉|口湖鄉|水林鄉|東區|西區|太保市|朴子市|布袋鎮|大林鎮|民雄鄉|溪口鄉|新港鄉|六腳鄉|東石鄉|義竹鄉|鹿草鄉|水上鄉|中埔鄉|竹崎鄉|梅山鄉|番路鄉|大埔鄉|阿里山鄉|新營區|鹽水區|白河區|柳營區|後壁區|東山區|麻豆區|下營區|六甲區|官田區|大內區|佳里區|學甲區|西港區|七股區|將軍區|北門區|新化區|善化區|新市區|安定區|山上區|玉井區|楠西區|南化區|左鎮區|仁德區|歸仁區|關廟區|龍崎區|永康區|東區|南區|北區|安南區|安平區|中西區|鹽埕區|鼓山區|左營區|楠梓區|三民區|新興區|前金區|苓雅區|前鎮區|旗津區|小港區|鳳山區|林園區|大寮區|大樹區|大社區|仁武區|鳥松區|岡山區|橋頭區|燕巢區|田寮區|阿蓮區|路竹區|湖內區|茄萣區|永安區|彌陀區|梓官區|旗山區|美濃區|六龜區|甲仙區|杉林區|內門區|茂林區|桃源區|那瑪夏區|屏東市|潮州鎮|東港鎮|恆春鎮|萬丹鄉|長治鄉|麟洛鄉|九如鄉|里港鄉|鹽埔鄉|高樹鄉|萬巒鄉|內埔鄉|竹田鄉|新埤鄉|枋寮鄉|新園鄉|崁頂鄉|林邊鄉|南州鄉|佳冬鄉|琉球鄉|車城鄉|滿州鄉|枋山鄉|三地門鄉|霧臺鄉|瑪家鄉|泰武鄉|來義鄉|春日鄉|獅子鄉|牡丹鄉|臺東市|成功鎮|關山鎮|卑南鄉|鹿野鄉|池上鄉|東河鄉|長濱鄉|太麻里鄉|大武鄉|綠島鄉|海端鄉|延平鄉|金峰鄉|達仁鄉|蘭嶼鄉|花蓮市|鳳林鎮|玉里鎮|新城鄉|吉安鄉|壽豐鄉|光復鄉|豐濱鄉|瑞穗鄉|富里鄉|秀林鄉|萬榮鄉|卓溪鄉|宜蘭市|羅東鎮|蘇澳鎮|頭城鎮|礁溪鄉|壯圍鄉|員山鄉|冬山鄉|五結鄉|三星鄉|大同鄉|南澳鄉|馬公市|湖西鄉|白沙鄉|西嶼鄉|望安鄉|七美鄉|金城鎮|金沙鎮|金湖鎮|金寧鄉|烈嶼鄉|烏坵鄉|南竿鄉|北竿鄉|莒光鄉|東引鄉))|(基隆市|臺北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|臺中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|高雄市|屏東縣|臺東縣|花蓮縣|宜蘭縣|澎湖縣|金門縣|連江縣)/g);
	const results = [];
	for (const match of matches) {
		if (match[1] && match[2])
			results.push({ city: match[1], town: match[2], code: region[match[1]][match[2]].code, latitude: region[match[1]][match[2]].latitude, longitude: region[match[1]][match[2]].longitude });
		if (match[3])
			results.push({ city: match[3], town: null, code: region[match[3]].code, latitude: region[match[1]][match[2]].latitude, longitude: region[match[1]][match[2]].longitude });
	}
	return results;
};

module.exports = {
	twoPointDistance,
	twoSideDistance,
	pga,
	PGAToIntensity,
	findRegions,
};