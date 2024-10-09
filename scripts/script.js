window.onload = function () {
  const img = document.getElementById("image");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const images = [
    "images/STScI-01J7492J6AJFB5C8Z8P18T5C18.png", // First image
    "images/big_galaxy.png",
    "images/comet.png",
    "images/young_star.png",
    "images/star_cluster.png",
    "images/ring_nebula.png",
    "images/crab_nebula.png",
    "images/big_cluster.png",
  ];

  const preloadImages = (imageArray) => {
    imageArray.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  };
  
  preloadImages(images);  // Call this function early to preload images
  
  let currentIndex = 0;

  let bassBuffers = {};
  let keyboardBuffers = {};

  function playSample(buffer, gainNode, volumeFactor = 1, fadeDuration = 0.1) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
  
    // Smooth fade in
    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volumeFactor, audioCtx.currentTime + fadeDuration);
  
    source.start();
  
    // Smooth fade out when the sample ends
    source.onended = () => {
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration);
    };
  }
  

  function changeImage(newIndex) {
    if (newIndex < 0) {
      currentIndex = images.length - 1;
    } else if (newIndex >= images.length) {
      currentIndex = 0;
    } else {
      currentIndex = newIndex;
    }

    img.style.opacity = 0;
    setTimeout(() => {
      img.src = images[currentIndex];
      img.style.opacity = 1;
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      
    }, 500);
  }

  document.getElementById("prev").addEventListener("click", () => {
    changeImage(currentIndex - 1);
  });

  document.getElementById("next").addEventListener("click", () => {
    changeImage(currentIndex + 1);
  });

  let audioCtx;
  let oscillators = [];
  let gainNodes = [];
  let delayNode, reverbNode;
  const numOscillators = 4;

  const bassNotes = [
    'a2', 'b2', 'c2sharp', 'c2', 'd2sharp',
    'd2', 'e2', 'f2sharp', 'f2', 'g2sharp',
    'g2', 'a2sharp'
  ];

  const keyboardNotes = [
    'a2', 'a2sharp', 'b2', 'c2',
    'c2sharp', 'd2', 'd2sharp', 'e2',
    'f2', 'f2sharp', 'g2', 'g2sharp'
  ];

  window.addEventListener("click", () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext created!"); // Debugging log
        loadBassSamples();
        loadKeyboardSamples();
        createEffects();
        createOscillators();
        console.log("Audio context initialized.");
    } else {
        console.log("AudioContext already exists.");
    }
});


function loadBassSamples() {
  const bassFolderPath = 'music/bass/';
  keyboardNotes.forEach(note => {
      const bassUrl = `${bassFolderPath}${note}.mp3`;
      fetch(bassUrl)
          .then(response => {
              if (!response.ok) {
                  throw new Error(`Failed to load bass note: ${note}`);
              }
              console.log(`Loaded bass note: ${note}`); // Debugging log
              return response.arrayBuffer();
          })
          .then(buffer => audioCtx.decodeAudioData(buffer, decodedData => {
              bassBuffers[note] = decodedData;
          }))
          .catch(error => console.error(`Error loading bass note ${note}:`, error));
  });
}

function loadKeyboardSamples() {
  const keyboardFolderPath = 'music/keyboard/';
  keyboardNotes.forEach(note => {
      const keyboardUrl = `${keyboardFolderPath}${note}.mp3`;
      fetch(keyboardUrl)
          .then(response => {
              if (!response.ok) {
                  throw new Error(`Failed to load keyboard note: ${note}`);
              }
              console.log(`Loaded keyboard note: ${note}`); // Debugging log
              return response.arrayBuffer();
          })
          .then(buffer => audioCtx.decodeAudioData(buffer, decodedData => {
              keyboardBuffers[note] = decodedData;
          }))
          .catch(error => console.error(`Error loading keyboard note ${note}:`, error));
  });
}


function playbass(note, volumeFactor = 1) {
  const buffer = bassBuffers[note];
  if (buffer) {
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeFactor;  // Set initial volume
    gainNode.connect(audioCtx.destination);
    playSample(buffer, gainNode, volumeFactor, 0.1);  // Smooth transitions
  } else {
    console.warn(`Bass buffer for ${note} not loaded.`);
  }
}

function playkeyboard(note, volumeFactor = 1) {
  const buffer = keyboardBuffers[note];
  if (buffer) {
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeFactor;  // Set initial volume
    gainNode.connect(audioCtx.destination);
    playSample(buffer, gainNode, volumeFactor, 0.1);  // Smooth transitions
  } else {
    console.warn(`Keyboard buffer for ${note} not loaded.`);
  }
}


  function createEffects() {
    delayNode = audioCtx.createDelay();
    delayNode.delayTime.value = 0.3;
    const feedbackGain = audioCtx.createGain();
    feedbackGain.gain.value = 0.4;
    reverbNode = audioCtx.createConvolver();
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    feedbackGain.connect(audioCtx.destination);
    reverbNode.connect(audioCtx.destination);
  }

  function stopOscillators() {
    oscillators.forEach((oscillator, index) => {
      oscillator.stop();
      oscillator.disconnect();
      gainNodes[index].disconnect();
    });
    oscillators = [];
    gainNodes = [];
  }
  

  function createOscillators() {
    stopOscillators();  // Stop existing oscillators before creating new ones
    
    for (let i = 0; i < numOscillators; i++) {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
      oscillator.connect(gainNode);
      gainNode.connect(delayNode);
      gainNode.connect(reverbNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      oscillator.start();
      oscillators.push(oscillator);
      gainNodes.push(gainNode);
    }
  }
  
  img.addEventListener("mousemove", onMouseMove);

  let lastPlayTime = 0;
  const playInterval = 200;  // 200ms minimum time between sound plays
  
  function onMouseMove(event) {
    const currentTime = Date.now();
    if (currentTime - lastPlayTime < playInterval) return;  // Prevent too frequent sound triggering
    lastPlayTime = currentTime;
  
    if (!canvas.width || !canvas.height) return;
  
    const x = event.offsetX;
    const y = event.offsetY;
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
  
    const red = pixelData[0];
    const green = pixelData[1];
    const blue = pixelData[2];
    const brightness = (red + green + blue) / 3;
  
    const redNote = mapColorToBass(red);
    const greenNote = mapColorToKeyboard(green);
    const blueNote = mapColorToKeyboard(blue);
  
    const volumeFactor = brightness / 255;
  
    playbass(redNote, volumeFactor);
    playkeyboard(greenNote, volumeFactor);
    playkeyboard(blueNote, volumeFactor);
  }
  
  

// Function to map the red channel to bass notes
function mapColorToBass(red) {
  const bassNotes = ['c2', 'c2sharp', 'd2', 'd2sharp', 'e2', 'f2', 'f2sharp', 'g2', 'g2sharp', 'a2', 'a2sharp', 'b2'];
  return bassNotes[Math.floor(red / 20)];  // Divides the 0-255 red range into 13 parts
}

// Function to map the green/blue channels to keyboard notes (they both use the same range)
function mapColorToKeyboard(colorValue) {
  const keyboardNotes = ['c2', 'c2sharp', 'd2', 'd2sharp', 'e2', 'f2', 'f2sharp', 'g2', 'g2sharp', 'a2', 'a2sharp', 'b2'];
  return keyboardNotes[Math.floor(colorValue / 20)];  // Divides the 0-255 color range into 13 parts
}

  function updateChord(notes, brightness) {
    const volumeFactor = 0.05;
    notes.forEach((note, index) => {
      if (index < oscillators.length) {
        const frequency = Math.max(Math.min(getFrequency(note), 1000), 100);
        const oscillator = oscillators[index];
        const gainNode = gainNodes[index];
        oscillator.frequency.setTargetAtTime(frequency, audioCtx.currentTime, 0.1);
        let volume = Math.min(Math.max((brightness / 255) * volumeFactor, 0.01 * volumeFactor), 1 * volumeFactor);
        if (brightness < 50) {
          volume *= 0.1;
        }
        gainNode.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
      }
    });
  }

  function getFrequency(note) {
    const frequencies = {
      C2: 65.41, G2: 98.00, C3: 130.81, E3: 164.81,
      B2: 123.47, D3: 146.83, F3: 174.61, A3: 220.00,
      G3: 196.00, B3: 246.94, D4: 293.66, F4: 349.23,
      A4: 440.00, C4: 261.63, E4: 329.63, G4: 392.00,
      B4: 493.88, C5: 523.25
    };
    return frequencies[note] || 261.63;
  }

  function testOscillator() {
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1); // Play for 1 second
}

window.addEventListener("click", () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Testing Oscillator sound"); // Debugging log
        testOscillator();
    }
});

};
