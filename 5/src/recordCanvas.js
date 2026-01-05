// Adapted from: https://gist.github.com/aduh95/4443b1bd50d64b9b794ec5e0f290ebda

function recordCanvas(canvas, time) {
  const frameRate = 60;
  const mimeType = "video/webm;codecs=vp9";
  
  const chunks = [];
  function saveChunks(evt) {
    // store our final video's chunks
    if (evt.data.size > 0) {
      chunks.push(evt.data);
    }
  }

  function exportVideo() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(chunks, {
        type: mimeType,
      })
    );
    a.download = "images.webm";
    a.id = "download_button";
    a.append("Download video");
    document.body.append(a);
    console.log(a);
  }

  const recorder = new MediaRecorder(canvas.captureStream(frameRate), {
    mimeType,
    videoBitsPerSecond: 10000000
  });
  recorder.ondataavailable = saveChunks;
  recorder.onstop = exportVideo;
  recorder.start();

  setTimeout(() => {
    recorder.stop();
  }, time);
}

export { recordCanvas };