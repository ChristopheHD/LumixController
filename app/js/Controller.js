'use strict';
require('./config');
var $ = require('jquery');
var Lumix = require('./Lumix');

var canvas = document.querySelector('#canvas');
var context = canvas.getContext('2d');

class Controller {
  constructor() {
    var camera = new Lumix();

    camera.initialize();
    camera.startStream();

    this.camera = camera;

    // Bolt optimization: Use createImageBitmap for high-performance decoding
    this.currentBitmap = null;
    this.isDecoding = false;
    this.lastProcessedCount = -1;

    // Performance metrics
    this.frameTimeSum = 0;
    this.frameCount = 0;

    //Attach events
    $('.capture').click(() => this.startCountdown());

    this.render();
  }

  startCountdown() {
    if (this.isCountingDown) return;
    this.isCountingDown = true;

    var count = 3;
    captureButton.disabled = true;
    captureButton.textContent = '🎂 Preparing...';

    countdownElement.classList.remove('hidden');
    countdownElement.textContent = count;

    var interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownElement.textContent = count;
      } else {
        clearInterval(interval);
        countdownElement.classList.add('hidden');
        this.isCountingDown = false;
        this.triggerFlash();
        this.capture();
      }
    }, 1000);
  }

  triggerFlash() {
    flashElement.classList.remove('hidden');
    flashElement.classList.add('flash-animation');

    // Remove class and hide after animation completes
    setTimeout(() => {
      flashElement.classList.remove('flash-animation');
      flashElement.classList.add('hidden');
    }, 500);
  }

  render() {
    const startTime = performance.now();

    this.displayImage(this.camera.getPreviewImage());

    requestAnimationFrame(this.render.bind(this));

    // Optional: Log performance periodically
    if (this.frameCount > 0 && this.frameCount % 300 === 0) {
      console.log(`Average UI render loop time: ${(this.frameTimeSum / this.frameCount).toFixed(2)}ms`);
    }
    this.frameTimeSum += (performance.now() - startTime);
    this.frameCount++;
  }

  async displayImage(imgData) {
    // imgData is now a Buffer/Uint8Array
    if (imgData && !this.isDecoding && this.camera.server.count !== this.lastProcessedCount) {
      this.isDecoding = true;
      this.lastProcessedCount = this.camera.server.count;

      try {
        // Bolt optimization: createImageBitmap decodes the image off the main thread.
        // We create a Blob from the binary data.
        const blob = new Blob([imgData], { type: 'image/jpeg' });
        const bitmap = await createImageBitmap(blob);

        // Clean up previous bitmap to prevent memory leaks
        if (this.currentBitmap) {
          this.currentBitmap.close();
        }

        this.currentBitmap = bitmap;
        context.drawImage(this.currentBitmap, 0, 0, this.currentBitmap.width, this.currentBitmap.height, 0, 0, canvas.width, canvas.height);
      } catch (e) {
        console.error('Error decoding preview image:', e);
      } finally {
        this.isDecoding = false;
      }
    } else if (this.currentBitmap) {
      // If no new data, just redraw the existing bitmap to keep the canvas populated
      context.drawImage(this.currentBitmap, 0, 0, this.currentBitmap.width, this.currentBitmap.height, 0, 0, canvas.width, canvas.height);
    }
  }

  capture() {
    console.log('Capture Start');
    captureButton.disabled = true;
    captureButton.textContent = '🎂 Capturing...';

    this.camera.capture((err, ok) => {
      console.log('Capture Attempt');
      if (err) {
        console.log('Failed to take a picture');
        captureButton.disabled = false;
        captureButton.textContent = 'Capture';
        return;
      }

      // Attempt to download last photo taken
      this.attempt((cb) => {
        this.camera.getLastPhoto(cb);
      }, (err, data) => {
        console.log('Get Last Photo Attempt');

        captureButton.disabled = false;
        captureButton.textContent = 'Capture';

        if (err) {
          console.log('Failed to download last photo');
          if (err.url) {
            console.log('Last taken URL: ', err.url);
          }
          this.camera.startStream();
          
          return;
        }

        // Save photo
        var previewImageData = data.toString('base64');
        console.log('Photo downloaded successfully, length:', previewImageData.length);
        
        this.camera.startStream();
      }, 3);

    });
  }

  attempt(fn, callback, tries) {
    fn((err, res) => {
      if (err) {
        //Retry
        if (tries === 0) {
          return callback(err, res);
        } else {
          return this.attempt(fn, callback, tries - 1);
        }
      }
      return callback(err, res);
    });
  }

}

module.exports = Controller;
