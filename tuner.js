function determineNote(noteFreq) {
  const standardTuningFrequencies = [
    { note: "1E", freq: 329.63 },

    { note: "2B", freq: 246.94 },

    { note: "3G", freq: 196.0 },

    { note: "4D", freq: 146.83 },

    { note: "5A", freq: 110.0 },

    { note: "6E", freq: 82.41 },
  ];

  const diffRange = 15;

  const acceptableError = 4;

  const matchedFreq = standardTuningFrequencies.find((freqObj) => {
    return Math.abs(freqObj.freq - noteFreq) <= diffRange;
  });

  if (!matchedFreq) return;

  if (Math.abs(matchedFreq.freq - noteFreq) <= acceptableError)
    return console.log("Cool, onto next string", matchedFreq);

  if (matchedFreq.freq > noteFreq) {
    console.log(
      `Tune up by ${matchedFreq.freq - noteFreq} Hz to match ${
        matchedFreq.note
      }`
    );
  } else {
    console.log(
      `Tune down by ${noteFreq - matchedFreq.freq} Hz to match ${
        matchedFreq.note
      }`
    );
  }
}

function init() {
  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      // First get ahold of the legacy getUserMedia, if present
      const getUserMedia =
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(
          new Error("getUserMedia is not implemented in this browser")
        );
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // Set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  let source, stream;

  // Set up the different audio nodes we will use for the app
  const analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  analyser.fftSize = 8192 * 2;

  const frequencyResolution = audioCtx.sampleRate / analyser.fftSize;

  // Maximum freq for standard guitar tuning
  const MAX_FREQ = 330;

  // Main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia supported.");
    const constraints = { audio: true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        console.log("Sample rate = ", audioCtx.sampleRate);
        // analyser.connect(audioCtx.destination);
        visualize();
      })
      .catch(function (err) {
        console.log("The following gUM error occured: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  function visualize() {
    const bufferLengthAlt = analyser.frequencyBinCount;

    // See comment above for Float32Array()
    const dataArrayAlt = new Uint8Array(bufferLengthAlt);

    const computeFrequency = function () {
      drawVisual = setTimeout(computeFrequency, 300);

      analyser.getByteFrequencyData(dataArrayAlt);

      let max = 0;

      for (let i = 0; i < MAX_FREQ / frequencyResolution; i++) {
        if (dataArrayAlt[i] > dataArrayAlt[max]) max = i;
      }

      const noteFreq = max * frequencyResolution;

      determineNote(noteFreq);
    };

    computeFrequency();
  }
}
document.onclick = init;
