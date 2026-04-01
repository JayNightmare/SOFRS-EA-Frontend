// Will grab the music from the ./music and play it on a loop

export function playMusic() {
	const music = document.createElement("audio");
	music.src = "./music/bg-music.mp3";
	music.loop = true;
	music.play();
}

export function stopMusic() {
	const music = document.querySelector("audio");
	music?.pause();
}
