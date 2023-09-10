let socket = new ReconnectingWebSocket("ws://" + location.host + "/ws");

// stolen
const modsImgs = {
    'nm': './static/nomod.png',
    'ez': './static/selection-mod-easy@2x.png',
    'nf': './static/selection-mod-nofail@2x.png',
    'ht': './static/selection-mod-halftime@2x.png',
    'hr': './static/selection-mod-hardrock@2x.png',
    'sd': './static/selection-mod-suddendeath@2x.png',
    'pf': './static/selection-mod-perfect@2x.png',
    'dt': './static/selection-mod-doubletime@2x.png',
    'nc': './static/selection-mod-nightcore@2x.png',
    'hd': './static/selection-mod-hidden@2x.png',
    'fl': './static/selection-mod-flashlight@2x.png',
    'rx': './static/selection-mod-relax@2x.png',
    'ap': './static/selection-mod-autopilot@2x.png',
    'so': './static/selection-mod-spunout@2x.png',
    'at': './static/selection-mod-autoplay@2x.png',
    'cn': './static/selection-mod-cinema@2x.png',
    'v2': './static/selection-mod-scorev2@2x.png',
    'tp': './static/selection-mod-target@2x.png',
};


// this probably doesn't need to be here
document.getElementById("timer").innerHTML = `
<div class="base-timer">
  <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g class="base-timer__circle">
      <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
      <path
        id="base-timer-path-remaining"
        stroke-dasharray="283"
        class="base-timer__path-remaining"
        d="
          M 50, 50
          m -45, 0
          a 45,45 0 1,0 90,0
          a 45,45 0 1,0 -90,0
        "
      ></path>
    </g>
  </svg>
</div>
`;

let mapBG = document.getElementById("mapBG");
let mapTitle = document.getElementById("mapTitle");
let mapDifficulty = document.getElementById("mapDifficulty");
let mapArtist = document.getElementById("mapArtist");
let playerContainer = document.getElementById("playerContainer");
let playerTeamLeft = document.getElementById("left");
let playerTeamRight = document.getElementById("right");
let timer = document.getElementById('timer');
let timeText = document.getElementById('timeText');
let averageScore = document.getElementById("averageScore");
let chats = document.getElementById("chats");

// set up playerView divs
// this is hard-coded for 8 players
for (let i = 0; i < 8; i++) {
	// roflcopter
	const playerView = document.createElement("div");
	playerView.id = "playerView" + i.toString();
	playerView.classList.add("playerView");

	const playerScore = document.createElement("div");
	playerScore.id = "playerScore" + i.toString();
	playerScore.classList.add("score");
	playerView.appendChild(playerScore);

	const playerComboContainer = document.createElement("div");
	playerComboContainer.classList.add("combo");
	playerComboContainer.classList.add("combo-scale");
	playerComboContainer.id = "playerCombo" + i.toString();
	playerView.appendChild(playerComboContainer);

	const playerComboShadowContainer = document.createElement("div");
	playerComboShadowContainer.classList.add("comboShadow");
	playerComboShadowContainer.classList.add("comboShadow-scale");
	playerComboShadowContainer.id = "playerComboShadow" + i.toString();
	playerView.appendChild(playerComboShadowContainer);

	const playerAccContainer = document.createElement("div");
	playerAccContainer.classList.add("acc");
	playerAccContainer.id = "playerAcc" + i.toString();
	playerView.appendChild(playerAccContainer);

	const playerMod = document.createElement("div");
	playerMod.classList.add("mods");
	playerMod.id = "playerMods" + i.toString();
	// clients 0-3 on the left, 4-7 on the right
	playerView.appendChild(playerMod);
	if (i < 4) {
		playerTeamLeft.appendChild(playerView);
	} else {
		playerTeamRight.appendChild(playerView);
	}
}

socket.onopen = () => {
    console.log("Successfully Connected");
};

const counterProps = { 
	useEasing: true, 
	useGrouping: true, 
	separator: ",", 
	decimal: "." 
}

const counterPropsCombo = { 
	useEasing: true, 
	useGrouping: true, 
	separator: "", 
	decimal: "." ,
	suffix: "x"
}

const counterPropsAcc = { 
	useEasing: true, 
	useGrouping: true, 
	separator: "", 
	decimal: "." ,
	suffix: "%"
}
const counterPropsScore = { 
	useEasing: true, 
	useGrouping: true, 
	separator: "", 
	decimal: ".", 
	formattingFn: (n) => { return n.toString().padStart(8,"0") } 
}

let animation = {
    averageScore:  new CountUp('averageScore', 0, 0, 0, .2, counterProps),
	playerScores: [],
	playerCombos: [],
	playerComboShadows: [],
	playerAccs: [],
}

for (let i = 0; i < 8; i++) {
	animation.playerScores.push(new CountUp('playerScore' + i.toString(), 0, 0, 0, 0.2, counterPropsScore))
	animation.playerCombos.push(new CountUp('playerCombo' + i.toString(), 0, 0, 0, 0.2, counterPropsCombo))
	animation.playerComboShadows.push(new CountUp('playerComboShadow' + i.toString(), 0, 0, 0, 0.2, counterPropsCombo))
	animation.playerAccs.push(new CountUp('playerAcc' + i.toString(), 0, 0, 2, 0.2, counterPropsAcc))
}

socket.onclose = event => {
    console.log("Socket Closed Connection: ", event);
    socket.send("Client Closed!");
};

socket.onerror = error => {
    console.log("Socket Error: ", error);
};


// half of these are unused and I can't be assed to remove them
let tempImg;
let tempMapName;
let tempMapDiff;
let tempMapArtist;
let tempTime;
let tempTimeMax;
let tempState;
let chatLen = 0;
let tempClass = 'unknown';
let scoreVisible;
let scoreAverage = 0;
let scoreSD = 0;
let playerScores = [0, 0, 0, 0, 0, 0, 0, 0];
let playerAcc = [0, 0, 0, 0, 0, 0, 0, 0];
let playerCombos = [0, 0, 0, 0, 0, 0, 0, 0];
let playerMods = ["", "", "", "", "", "", "", ""];
let totalScore = 0;

socket.onmessage = event => {
    let data = JSON.parse(event.data);
	if(tempState !== data.tourney.manager.ipcState) {
		tempState = data.tourney.manager.ipcState;
		scoreVisible = data.tourney.manager.bools.scoreVisible;
		if (tempState == 1) {
			// lobby state
			chats.style.opacity = 1;
			playerContainer.style.opacity = 0;
			averageScore.style.opacity = 0;
			document.getElementById("footerGameplay").style.opacity = 0;
			document.getElementById("footerLobby").style.opacity = 1;
			document.getElementById("overlay").style.opacity = 0;
		} else if (tempState == 3) {
			// ingame state
			chats.style.opacity = 0;
			playerContainer.style.opacity = 1;
			averageScore.style.opacity = 1;
			document.getElementById("footerGameplay").style.opacity = 1;
			document.getElementById("footerLobby").style.opacity = 0;
			document.getElementById("overlay").style.opacity = 1;
		} else if (tempState == 4) {
			// score screen state
			chats.style.opacity = 0;
			playerContainer.style.opacity = 0;
			averageScore.style.opacity = 1;
			document.getElementById("footerGameplay").style.opacity = 1;
			document.getElementById("footerLobby").style.opacity = 0;
			document.getElementById("overlay").style.opacity = 0;
		} else {
			// fallback: assume you are in lobby state
			chats.style.opacity = 1;
			playerContainer.style.opacity = 0;
			averageScore.style.opacity = 0;
			document.getElementById("footerGameplay").style.opacity = 0;
			document.getElementById("footerLobby").style.opacity = 1;
			document.getElementById("overlay").style.opacity = 0;
		}
	}

	if (tempImg !== data.menu.bm.path.full) {
        tempImg = data.menu.bm.path.full;
        data.menu.bm.path.full = data.menu.bm.path.full.replace(/#/g,'%23').replace(/%/g,'%25').replace(/\\/g,'/');
        mapBG.style.backgroundImage = `url('http://` + location.host + `/Songs/${data.menu.bm.path.full}')`;
    }
    if (tempMapName !== data.menu.bm.metadata.title) {
        tempMapName = data.menu.bm.metadata.title;
        mapTitle.innerHTML = tempMapName;

    }
    if (tempMapDiff !== data.menu.bm.metadata.difficulty) {
        tempMapDiff = data.menu.bm.metadata.difficulty;
        mapDifficulty.innerHTML = tempMapDiff;
    }
    if (tempMapArtist !== data.menu.bm.metadata.artist) {
        tempMapArtist = data.menu.bm.metadata.artist;
        mapArtist.innerHTML = tempMapArtist;
    }
	if (tempTime !== data.menu.bm.time.current || tempTimeMax !== data.menu.bm.time.full) {
        tempTime = data.menu.bm.time.current;
        if (tempTimeMax !== data.menu.bm.time.full) {
            tempTimeMax = data.menu.bm.time.full;
        }
		let displayTime = tempTime;
		// pin the timer to 0 until the first player hits a note
		// the timer won't update if the first player is a turd
		// this also looks pretty bad if the map has a long intro

		if (data.tourney.ipcClients[0].gameplay.combo.max == 0) {
			displayTime = 0;
		}
        correctedTime = displayTime / tempTimeMax;
		// update the timer
        const circleDasharray = `${(
            (correctedTime - (1 / tempTimeMax) * (1 - correctedTime)) * 283
        ).toFixed(0)} 283`;
        document
            .getElementById("base-timer-path-remaining")
            .setAttribute("stroke-dasharray", circleDasharray);
		let mapTimeAfterMod = displayTime;
		// correct for dt
		if (data.tourney.ipcClients[0].gameplay.mods.str.toLowerCase().includes("dt")) {
			mapTimeAfterMod = mapTimeAfterMod/1.5;
		}
		let timeString = millisToMinutesAndSeconds(mapTimeAfterMod);
		timeText.innerHTML = timeString;
    }

	if(scoreVisible) {
		let totalScore = 0;
		let numScores = 0;
		let meanDiffs = 0;
		for (let i = 0; i < data.tourney.ipcClients.length; i++) {
			let playerView = document.getElementById("playerView" + i.toString());
			if (data.tourney.ipcClients[i].gameplay.name) { 
				// only display the view for the player if someone is in the lobby slot
				playerView.style.opacity = 1;
				let score = data.tourney.ipcClients[i].gameplay.score;
				let combo = data.tourney.ipcClients[i].gameplay.combo.current;
				let accuracy = data.tourney.ipcClients[i].gameplay.accuracy;
				if (combo == "") {
					combo = 0;
				}
				// calculate z score for each player based on stats from previous update cycle
				// something is probably wrong here but it looks ok on stream
				totalScore += score;
				playerScores[i] = score;
				meanDiffs += Math.pow(score - scoreAverage, 2)
				numScores++;
				let zScore;
				if (scoreSD == 0) {
					zScore = 1;
				} else {
					zScore = (score - scoreAverage)/scoreSD;
				}

				// scale color with stolen functions
				let colorScale = zScore * (100/1.5);
				// don't investigate what happens here
				let color = perc2color(colorScale);
				let playerScore = document.getElementById("playerScore" + i.toString());
				playerScore.style.color = color;
				animation.playerScores[i].update(score);
				
				if (playerCombos[i] != combo) {
					// some hacks to make the combo animation
					animation.playerCombos[i].update(combo);
					animation.playerComboShadows[i].update(combo);
					let playerCombo = document.getElementById("playerCombo" + i.toString());
					let playerComboShadow = document.getElementById("playerComboShadow" + i.toString());
					playerCombo.classList.remove('combo-scale')
					playerComboShadow.classList.remove('comboShadow-scale')
					void playerCombo.offsetWidth;
					void playerComboShadow.offsetWidth;
					playerCombo.classList.add('combo-scale');
					playerComboShadow.classList.add('comboShadow-scale');
					playerCombos[i] = combo;
				}

				animation.playerAccs[i].update(accuracy);
				let mods = data.tourney.ipcClients[i].gameplay.mods.str;
				// update mod images for non-nf mods 
				if (mods != playerMods[i]) {
					playerMods[i] = mods;
					let tempMods = mods.toLowerCase().replace('nf','');
					let modsArr = tempMods.match(/.{1,2}/g);
					let playerViewMods = document.getElementById("playerMods" + i.toString());
					playerViewMods.replaceChildren();
					for(let j = 0; j < modsArr.length; j++){
						let mod = document.createElement('div');
						mod.setAttribute('class','mod');
						let modImg = document.createElement('img');
						modImg.setAttribute('src', modsImgs[modsArr[j]]);
						mod.appendChild(modImg);
						playerViewMods.appendChild(mod);
					}
				}
			} else {
				playerView.style.opacity = 0;
			}
		}

		// store SD and average for next update cycle
		scoreSD = Math.sqrt(meanDiffs/numScores);
		let tempScoreAverage = totalScore/numScores;

		animation.averageScore.update(tempScoreAverage);

	}
	if(!scoreVisible) {
		if(chatLen != data.tourney.manager.chat.length) {
			// There's new chats that haven't been updated
			
			if(chatLen == 0 || (chatLen > 0 && chatLen > data.tourney.manager.chat.length)) {
				// Starts from bottom
				chats.innerHTML = "";
				chatLen = 0;
			}
			
			// Add the chats
			for(var i=chatLen; i < data.tourney.manager.chat.length; i++) {

				tempClass = data.tourney.manager.chat[i].team;
			
				// Chat variables
				let chatParent = document.createElement('div');
				chatParent.setAttribute('class', 'chat');

				let chatTime = document.createElement('div');
				chatTime.setAttribute('class', 'chatTime');

				let chatName = document.createElement('div');
				chatName.setAttribute('class', 'chatName');

				let chatText = document.createElement('div');
				chatText.setAttribute('class', 'chatText');
				
				chatTime.innerText = data.tourney.manager.chat[i].time;
				chatName.innerText = data.tourney.manager.chat[i].name + ":\xa0";
				chatText.innerText = data.tourney.manager.chat[i].messageBody;
				
				chatName.classList.add(tempClass);
				
				chatParent.append(chatTime);
				chatParent.append(chatName);
				chatParent.append(chatText);
				chats.append(chatParent);
				
			}
			
			// Update the Length of chat
			chatLen = data.tourney.manager.chat.length;
			
			// Update the scroll so it's sticks at the bottom by default
			chats.scrollTop = chats.scrollHeight;
		}
	}
}

function perc2color(input) {
	// scale a color from red to green
	// Since this function is stolen, and I have never bothered to read the code,
	// I have no idea what the function does when you pass NaN or non-finite numbers
	// for the purposes of this overlay, it's probably ok to interpret these as 100%

	let perc = input
	if (perc < 0) {
		perc = 0;
	}
	if (perc > 100 || isNaN(perc) || !isFinite(perc)) {
		perc = 100;
	}
	var r, g, b = 0;
	if(perc < 50) {
		r = 255;
		g = Math.round(5.1 * perc);
	}
	else {
		g = 255;
		r = Math.round(510 - 5.10 * perc);
	}
	var h = r * 0x10000 + g * 0x100 + b * 0x1;
	return '#' + ('000000' + h.toString(16)).slice(-6);
}

function millisToMinutesAndSeconds(millis) {
	// format milliseconds as minutes:seconds
	var minutes = Math.floor(millis / 60000);
	var seconds = ((millis % 60000) / 1000).toFixed(0);
	return (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}