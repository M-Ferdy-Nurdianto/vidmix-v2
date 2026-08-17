const uiPanel = document.getElementById('ui-panel');
const hideBtn = document.getElementById('hide-btn');
const hint = document.getElementById('hint');
const audioPlayer = document.getElementById('audio-player');
const audioInput = document.getElementById('audio-input');
const bgInput = document.getElementById('bg-input');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d', { alpha: false });

const vizStyle = document.getElementById('viz-style');
const vizColor = document.getElementById('viz-color');
const dynamicColor = document.getElementById('dynamic-color');
const barWidthInput = document.getElementById('bar-width');
const barSpacingInput = document.getElementById('bar-spacing');
const barHeightMult = document.getElementById('bar-height-mult');
const particlesToggle = document.getElementById('particles-toggle');
const resolutionToggle = document.getElementById('resolution');
const aspectRatioToggle = document.getElementById('aspect-ratio');
const fastRenderToggle = document.getElementById('fast-render');
const recordBtn = document.getElementById('record-btn');

const widthVal = document.getElementById('width-val');
const spacingVal = document.getElementById('spacing-val');
const heightVal = document.getElementById('height-val');

let audioCtx, analyser, source, streamDestination;
let isPlaying = false;
let bgImage = null;
let particles = [];
let animId;

let smoothedPillarHeights = [];
let globalBeatScale = 1;

barWidthInput.addEventListener('input', e => widthVal.textContent = e.target.value);
barSpacingInput.addEventListener('input', e => spacingVal.textContent = e.target.value);
barHeightMult.addEventListener('input', e => heightVal.textContent = parseFloat(e.target.value).toFixed(1));

audioInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.play();
    }
});

bgInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        const img = new Image();
        img.onload = () => { bgImage = img; };
        img.src = URL.createObjectURL(file);
    } else {
        bgImage = null;
    }
});

function updateCanvasSize() {
    const res = parseInt(resolutionToggle.value);
    const [ratioW, ratioH] = aspectRatioToggle.value.split(':').map(Number);

    let width, height;
    if (ratioW >= ratioH) {
        height = res;
        width = Math.round(height * (ratioW / ratioH));
    } else {
        width = res;
        height = Math.round(width * (ratioH / ratioW));
    }

    canvas.width = width;
    canvas.height = height;
    initParticles();
}

resolutionToggle.addEventListener('change', updateCanvasSize);
aspectRatioToggle.addEventListener('change', updateCanvasSize);



hideBtn.addEventListener('click', () => {
    uiPanel.classList.add('hidden');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 3000);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        uiPanel.classList.remove('hidden');
        hint.classList.remove('show');
    }
});

audioPlayer.addEventListener('play', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; // Higher FFT size gives us much more precise frequency bins!
        analyser.smoothingTimeConstant = 0.0; // Math done custom

        source = audioCtx.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        streamDestination = audioCtx.createMediaStreamDestination();
        analyser.connect(streamDestination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlaying = true;
    if (!animId) loop();
});
audioPlayer.addEventListener('pause', () => isPlaying = false);

class Particle {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + (Math.random() * 50);
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = -(Math.random() * 1.5 + 0.5);
        this.opacity = Math.random() * 0.5 + 0.1;
    }
    update(bassBounce) {
        this.x += this.speedX;
        this.y += this.speedY - (bassBounce * 0.12); // Pop up significantly on beat

        if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
            this.reset();
        }
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        if (!fastRenderToggle.checked) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

function initParticles() {
    particles = [];
    const count = Math.min((canvas.width * canvas.height) / 15000, 200);
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}
// Initialize everything correctly
updateCanvasSize();

function drawBackground() {
    if (bgImage) {
        const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
        const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
        const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

        // Make the background dimming gradient for that dark aesthetic
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0.5)');
        grad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

let rainbowHue = 0;

// Converts 1024 raw linear bins into well-separated Logarithmic bins
function computeLogarithmicBands(dataArray, numBands) {
    const bands = new Array(numBands).fill(0);

    // We ignore the top half of frequencies (above ~11kHz) as it's just pure hiss and noise
    const maxUsableBin = Math.floor(dataArray.length * 0.45);

    for (let i = 0; i < numBands; i++) {
        // Curve formula to map low bands to low frequencies intricately, and bundle high frequencies
        const start = Math.pow(i / numBands, 2.2) * maxUsableBin;
        const end = Math.pow((i + 1) / numBands, 2.2) * maxUsableBin;

        let minBin = Math.floor(start);
        let maxBin = Math.floor(end);
        if (minBin === maxBin) maxBin = minBin + 1; // guarantee at least 1 bin

        let sum = 0;
        let count = 0;
        for (let j = Math.max(1, minBin); j < Math.min(maxUsableBin, maxBin); j++) {
            sum += dataArray[j];
            count++;
        }
        bands[i] = count > 0 ? (sum / count) : 0;
    }
    return bands;
}

function loop() {
    animId = requestAnimationFrame(loop);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : [];
    if (analyser) analyser.getByteFrequencyData(dataArray);

    let rawBass = 0; // Purely for the camera pumping
    if (analyser) {
        for (let i = 1; i <= 8; i++) rawBass += dataArray[i];
        rawBass /= 8;
    }

    drawBackground();

    let targetScale = 1.0 + (Math.max(0, rawBass - 120) / 255) * 0.05; // Only pump on HEAVY hits
    globalBeatScale = (globalBeatScale * 0.8) + (targetScale * 0.2);

    if (particlesToggle.checked) {
        particles.forEach(p => {
            p.update(rawBass * (rawBass > 150 ? 1 : 0));
            p.draw();
        });
    }

    if (analyser) {
        rainbowHue = (rainbowHue + (rawBass * 0.005) + 0.3) % 360;

        ctx.save();

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(globalBeatScale, globalBeatScale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        // Fixed number of distinct bars regardless of screen size! 
        // This ensures the bars represent proper musical keys, not just random graphical points.
        const TOTAL_BARS = 72;
        const logBands = computeLogarithmicBands(dataArray, TOTAL_BARS);

        if (vizStyle.value === 'bars') {
            drawElegantBars(logBands, TOTAL_BARS);
        } else {
            drawAveeCircle(logBands, Math.floor(TOTAL_BARS * 0.8), rawBass);
        }
        ctx.restore();
    }
}

function getVisualizerColor(index, total) {
    if (dynamicColor.checked) {
        return `hsl(${(rainbowHue + (index / total) * 70) % 360}, 100%, 65%)`;
    }
    return vizColor.value;
}

function drawElegantBars(logBands, count) {
    const barWidth = parseFloat(barWidthInput.value);
    const spacing = parseFloat(barSpacingInput.value);
    const mult = parseFloat(barHeightMult.value);

    if (smoothedPillarHeights.length !== count) {
        smoothedPillarHeights = new Array(count).fill(0);
    }

    const totalBarsWidth = count * (barWidth + spacing);

    let startX = (canvas.width - totalBarsWidth) / 2;
    const baseY = canvas.height * 0.85;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < count; i++) {
        // High frequency treble boost for visual balance
        const eqBoost = 1 + (i / count) * 1.5;
        const val = logBands[i] * eqBoost;

        let targetH = (val / 255) * (canvas.height * 0.4) * mult;

        // Exaggerate differences (if it's quiet, make it really quiet. If loud, make it really loud)
        if (targetH > 40) {
            targetH = targetH * 1.25; // emphasize strong beats dramatically
        } else {
            targetH = targetH * 0.7; // suppress noise so distinct bars stand out
        }

        // PUNCHY BEAT ATTACK
        if (targetH > smoothedPillarHeights[i]) {
            smoothedPillarHeights[i] = targetH; // instant 100% Snap!
        } else {
            smoothedPillarHeights[i] -= (smoothedPillarHeights[i] - targetH) * 0.15;
            smoothedPillarHeights[i] -= 2;
        }

        let h = smoothedPillarHeights[i];
        if (h < 2) h = 2; // Fixed min height so they stand elegant
        if (h > canvas.height * 0.75) h = canvas.height * 0.75; // cap max height

        ctx.beginPath();
        ctx.moveTo(startX, baseY);
        ctx.lineTo(startX, baseY - h);

        ctx.strokeStyle = getVisualizerColor(i, count);
        ctx.lineWidth = barWidth;

        if (!fastRenderToggle.checked) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.stroke();
        startX += barWidth + spacing;
    }
}

function drawAveeCircle(logBands, count, bass) {
    const minDim = Math.min(canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const mult = parseFloat(barHeightMult.value);
    const barWidth = parseFloat(barWidthInput.value);

    if (smoothedPillarHeights.length !== count) {
        smoothedPillarHeights = new Array(count).fill(0);
    }

    const baseRadius = minDim * 0.16;
    let radiusPulse = 0;
    if (bass > 130) {
        radiusPulse = (bass - 130) * minDim * 0.001;
    }
    const radius = baseRadius + radiusPulse;

    ctx.lineCap = 'round';
    const rads = (Math.PI * 2) / count;

    // Core circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - (barWidth / 2) - 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 10, 15, 0.7)'; // subtle dark glass core
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let i = 0; i < count; i++) {
        const eqBoost = 1 + (i / count) * 1.5;
        const val = logBands[i] * eqBoost;

        let targetH = (val / 255) * (minDim * 0.25) * mult;
        if (targetH > 25) {
            targetH *= 1.25;
        } else {
            targetH *= 0.7;
        }

        if (targetH > smoothedPillarHeights[i]) {
            smoothedPillarHeights[i] = targetH;
        } else {
            smoothedPillarHeights[i] -= (smoothedPillarHeights[i] - targetH) * 0.15;
            smoothedPillarHeights[i] -= 1;
        }

        let h = smoothedPillarHeights[i];
        if (h < 2) h = 2;

        const angle = i * rads - (Math.PI / 2);

        const x1 = centerX + Math.cos(angle) * (radius);
        const y1 = centerY + Math.sin(angle) * (radius);

        const x2 = centerX + Math.cos(angle) * (radius + h);
        const y2 = centerY + Math.sin(angle) * (radius + h);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        ctx.strokeStyle = getVisualizerColor(i, count);
        ctx.lineWidth = barWidth;

        if (!fastRenderToggle.checked) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
    }
}

// UI Elements Overlay
const exportOverlay = document.getElementById('export-overlay');
const exportProgress = document.getElementById('export-progress');
const exportText = document.getElementById('export-text');
const cancelExportBtn = document.getElementById('cancel-export');

let isExportReroute = false;

recordBtn.addEventListener('click', async () => {
    const file = audioInput.files[0];
    if (!file) {
        alert('Tolong pilih file lagu terlebih dahulu di bagian atas!');
        return;
    }

    try {
        if (!window.WebMMuxer) {
            alert('Mengunduh library muxer... pastikan internet aktif dan coba lagi sebentar lagi.');
            return;
        }

        // Tampilkan overlay loading
        exportOverlay.style.display = 'flex';
        exportText.innerText = '0% - Membaca & Dekode Audio... (Ini butuh beberapa detik)';
        exportProgress.style.width = '0%';
        isExportReroute = false;

        cancelExportBtn.onclick = () => {
            isExportReroute = true;
            exportOverlay.style.display = 'none';
        };

        // 1. Dekode raw audio
        const arrayBuffer = await file.arrayBuffer();
        const baseAudioCtx = new AudioContext(); // temporary decoder
        const decodedBuffer = await baseAudioCtx.decodeAudioData(arrayBuffer);

        const fps = 60;
        const duration = decodedBuffer.duration;
        const totalVideoFrames = Math.floor(duration * fps);
        const sampleRate = decodedBuffer.sampleRate;
        const channels = decodedBuffer.numberOfChannels;

        exportText.innerText = '0% - Persiapan Mulai Render Cepat...';

        // 2. Setup WebM Muxer
        let muxer = new WebMMuxer.Muxer({
            target: new WebMMuxer.ArrayBufferTarget(),
            video: {
                codec: 'V_VP9',
                width: canvas.width,
                height: canvas.height,
                framerate: fps
            },
            audio: {
                codec: 'A_OPUS',
                sampleRate: sampleRate,
                numberOfChannels: channels,
                bitDepth: 16
            },
            firstTimestampBehavior: 'offset'
        });

        // 3. Setup Video Encoder
        const currentPixels = canvas.width * canvas.height;
        let videoBitrate = 8000000;
        if (currentPixels <= 854 * 480) videoBitrate = 2500000;
        else if (currentPixels <= 1280 * 720) videoBitrate = 5000000;
        else if (currentPixels <= 1920 * 1080) videoBitrate = 12000000;
        else videoBitrate = 25000000;

        let videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: e => console.error('VideoEncoder error:', e)
        });
        videoEncoder.configure({
            codec: 'vp09.00.10.08',
            width: canvas.width,
            height: canvas.height,
            bitrate: videoBitrate,
            framerate: fps
        });

        // 4. Setup Audio Encoder
        let audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: e => console.error('AudioEncoder error:', e)
        });
        audioEncoder.configure({
            codec: 'opus',
            sampleRate: sampleRate,
            numberOfChannels: channels,
            bitrate: 128000
        });

        // 5. Salin dan Encode Audio sangat cepat
        const CHUNK_SIZE = 48000;
        for (let i = 0; i < decodedBuffer.length; i += CHUNK_SIZE) {
            let frames = Math.min(CHUNK_SIZE, decodedBuffer.length - i);
            let planarData = new Float32Array(frames * channels);
            for (let c = 0; c < channels; c++) {
                planarData.set(decodedBuffer.getChannelData(c).subarray(i, i + frames), c * frames);
            }
            let audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: frames,
                numberOfChannels: channels,
                timestamp: (i / sampleRate) * 1_000_000,
                data: planarData
            });
            audioEncoder.encode(audioData);
            audioData.close();
        }
        await audioEncoder.flush();
        audioEncoder.close();

        // 6. Jalankan Offline Audio Context untuk mendapatkan visualizer frames
        const offlineCtx = new OfflineAudioContext(channels, decodedBuffer.length, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;

        const offlineAnalyser = offlineCtx.createAnalyser();
        offlineAnalyser.fftSize = 2048;
        offlineAnalyser.smoothingTimeConstant = 0.0;

        source.connect(offlineAnalyser);
        offlineAnalyser.connect(offlineCtx.destination);
        source.start(0);

        let dataArray = new Uint8Array(offlineAnalyser.frequencyBinCount);
        let currentFrame = 1;

        function scheduleNextFrame() {
            if (isExportReroute) return;
            if (currentFrame >= totalVideoFrames) return;

            let time = currentFrame / fps;
            offlineCtx.suspend(time).then(() => {
                if (isExportReroute) return;

                offlineAnalyser.getByteFrequencyData(dataArray);

                // Kalkulasi bass
                let rawBass = 0;
                for (let b = 1; b <= 8; b++) rawBass += dataArray[b];
                rawBass /= 8;

                drawBackground();
                let targetScale = 1.0 + (Math.max(0, rawBass - 120) / 255) * 0.05;
                globalBeatScale = (globalBeatScale * 0.8) + (targetScale * 0.2);

                if (particlesToggle.checked) {
                    particles.forEach(p => {
                        p.update(rawBass * (rawBass > 150 ? 1 : 0));
                        p.draw(); // Canvas 2D
                    });
                }

                rainbowHue = (rainbowHue + (rawBass * 0.005) + 0.3) % 360;
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(globalBeatScale, globalBeatScale);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);

                const TOTAL_BARS = 72;
                const logBands = computeLogarithmicBands(dataArray, TOTAL_BARS);
                if (vizStyle.value === 'bars') {
                    drawElegantBars(logBands, TOTAL_BARS);
                } else {
                    drawAveeCircle(logBands, Math.floor(TOTAL_BARS * 0.8), rawBass);
                }
                ctx.restore();

                // Push VideoFrame secepat-cepatnya
                let frame = new VideoFrame(canvas, { timestamp: currentFrame * 1_000_000 / fps });
                videoEncoder.encode(frame);
                frame.close();

                if (currentFrame % 20 === 0) {
                    let percent = (currentFrame / totalVideoFrames) * 100;
                    exportProgress.style.width = percent + '%';
                    exportText.innerText = Math.floor(percent) + '% - Sedang Merender Super Cepat... 💪';
                }

                currentFrame++;
                scheduleNextFrame();
                offlineCtx.resume();
            }).catch(e => console.error(e));
        }

        // Tembak frame pertama ke looping
        scheduleNextFrame();

        offlineCtx.startRendering().then(async () => {
            if (isExportReroute) {
                exportOverlay.style.display = 'none';
                return;
            }

            exportText.innerText = '99% - Finalisasi Menyimpan Video...';
            await videoEncoder.flush();
            videoEncoder.close();

            muxer.finalize();
            let { buffer } = muxer.target;
            let blob = new Blob([buffer], { type: 'video/webm' });

            // Auto donwload
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visualizer_fast_${canvas.width}x${canvas.height}.webm`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            exportOverlay.style.display = 'none';
            alert('Render Cepat Selesai! 🎉 Video berhasil didownload tanpa menunggu durasi lagu habis.');

            // Reset canvas ke state awal
            initParticles();
        });

    } catch (err) {
        console.error(err);
        alert('Hmm, sepertinya fitur WebCodecs Fast Render tidak didukung atau terjadi error. Error: ' + err.message);
        exportOverlay.style.display = 'none';
    }
});
