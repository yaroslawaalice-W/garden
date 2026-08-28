/*
 * © 2026 Schultzschultz. Created for 'Schultzschultz Creative Coding Masterclass'.
 * For educational use only. All rights reserved.
 *
 * ---------------------------
 * Interface – Interface Class
 * ---------------------------
 *
 * This file manages the floating control panel (buttons, toggle, sliders) and
 * updates the global variables in sketch.js accordingly.
 *
 * Note: The actual drawing and animation logic is in sketch.js. This file only
 * handles the user interface and interaction.
 */

class Interface {

  constructor() {
    this.init();
  }

  // Attaches all event listeners to the HTML controls.
  init() {
    this._initCollapsible();
    this._closeSectionsOnMobile();
    this._initMobileLayout();
    this._initClearButton();
    this._initExportButtons();
    this._initTextureToggle();
    this._initLetGrowToggle();
    this._initFlowerSizeSlider();
    this._initStrokeWeightSlider();
    this._initRefreshButton();
    this._initMobileActions();
  }

  // ––– Collapsible Sections (Button) –––
  // Toggle the visibility of the section body and rotate the arrow icon.
  _initCollapsible() {
    document.querySelectorAll('.section-header').forEach(function (header) {
      header.addEventListener('click', function () {
        var body = document.getElementById(header.dataset.target);
        var arrow = header.querySelector('.arrow');
        var isOpen = !body.classList.contains('hidden');
        body.classList.toggle('hidden', isOpen);   // Hide if open, show if hidden
        arrow.classList.toggle('open', !isOpen);   // Rotate the arrow icon accordingly
      });
    });
  }

  _closeSectionsOnMobile() {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
    if (!isTouchDevice && !isSmallScreen) {
      return;
    }

    document.getElementById('interface').classList.add('mobile-interface');

    document.querySelectorAll('.section:not(.garden-section)').forEach(function (section) {
      var body = section.querySelector('.section-body');
      var arrow = section.querySelector('.arrow');
      body.classList.add('hidden');
      arrow.classList.remove('open');
    });
  }

  _initMobileLayout() {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
    const interfaceElement = document.getElementById('interface');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    if ((!isTouchDevice && !isSmallScreen) || !interfaceElement || !canvasWrapper) {
      return;
    }

    const updateLayout = () => {
      const interfaceHeight = interfaceElement.getBoundingClientRect().height;
      canvasWrapper.style.setProperty('--mobile-interface-space', `${interfaceHeight + 16}px`);

      if (typeof myCanvas !== 'undefined' && myCanvas) {
        updateCanvasAreaSize();
        resizeCanvas(canvasAreaWidth, canvasAreaHeight);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    if ('ResizeObserver' in window) {
      new ResizeObserver(updateLayout).observe(interfaceElement);
    }
  }

  // ––– Clear canvas (Button) –––
  _initClearButton() {
    document.getElementById('clearBtn').addEventListener('click', function () {
      clearCanvas(); // Erase all the drawn stems and flowers
    });
  }

  _initRefreshButton() {
    document.getElementById('refreshBtn').addEventListener('click', function () {
      clearCanvas();
    });
  }

  _initMobileActions() {
    const refreshButton = document.getElementById('refreshMobileBtn');
    const importButton = document.getElementById('importMobileBtn');
    const importInput = document.getElementById('mobileImportInput');

    refreshButton.addEventListener('click', function () {
      clearCanvas();
    });

    importButton.addEventListener('click', function () {
      importInput.click();
    });

    importInput.addEventListener('change', function () {
      const importedFile = importInput.files[0];
      if (!importedFile) {
        return;
      }

      if (importedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setBackgroundImage(reader.result);
        reader.readAsDataURL(importedFile);
      }

      if (importedFile.type.startsWith('video/')) {
        const importedVideoUrl = URL.createObjectURL(importedFile);
        setBackgroundVideo(importedVideoUrl, true);
      }

      importInput.value = '';
    });
  }

  // ––– Export buttons –––
  _initExportButtons() {
    document.getElementById('downloadImageBtn').addEventListener('click', function () {
      exportFullArtwork();
    });

    document.getElementById('downloadVideoBtn').addEventListener('click', function () {
      toggleVideoRecording();
    });

    document.getElementById('downloadFlowersBtn').addEventListener('click', function () {
      exportDrawnElements();
    });

    setVideoRecordingButtonState(false);
  }

  // ––– Texture fill (Toggle) –––
  // Switches whether new flowers are filled with a texture image instead of a color.
  _initTextureToggle() {
    var toggle = document.getElementById('textureToggle');
    var status = document.getElementById('textureStatus');

    toggle.checked = textureFillEnabled; // Match the sketch's starting value
    status.textContent = textureFillEnabled ? 'Texture on' : 'Texture off';

    toggle.addEventListener('change', function () {
      toggleTextureFill(); // Flip the global textureFillEnabled flag in sketch.js
      status.textContent = textureFillEnabled ? 'Texture on' : 'Texture off';
    });
  }

  // ––– Let grow (Toggle) –––
  // Switches whether new flowers recursively sprout their own child stems and flowers.
  _initLetGrowToggle() {
    var toggle = document.getElementById('letGrowToggle');
    var status = document.getElementById('letGrowStatus');

    toggle.checked = letGrowEnabled; // Match the sketch's starting value
    status.textContent = letGrowEnabled ? 'Let grow on' : 'Let grow off';

    toggle.addEventListener('change', function () {
      toggleLetGrow(); // Flip the global letGrowEnabled flag in sketch.js
      status.textContent = letGrowEnabled ? 'Let grow on' : 'Let grow off';
    });
  }

  // ––– Flower size (Slider) –––
  _initFlowerSizeSlider() {
    var slider = document.getElementById('flowerSizeSlider');
    var val = document.getElementById('flowerSizeVal');

    slider.value = flowerSize; // Start the slider at the sketch's default flower size
    val.textContent = flowerSize + 'px';

    slider.addEventListener('input', function () {
      flowerSize = parseInt(slider.value, 10); // Update the global used by sketch.js
      val.textContent = slider.value + 'px';
    });
  }

  // ––– Stroke weight (Slider) –––
  _initStrokeWeightSlider() {
    var slider = document.getElementById('strokeWeightSlider');
    var val = document.getElementById('strokeWeightVal');

    slider.value = traceStrokeWeight; // Start the slider at the sketch's default stroke weight
    val.textContent = traceStrokeWeight + 'px';

    slider.addEventListener('input', function () {
      traceStrokeWeight = parseInt(slider.value, 10); // Update the global used by sketch.js
      val.textContent = slider.value + 'px';
    });
  }

}

function setVideoRecordingButtonState(isRecording) {
  const button = document.getElementById('downloadVideoBtn');
  if (!button) {
    return;
  }

  button.textContent = isRecording ? 'stop' : 'record';
  button.classList.toggle('btn-recording', isRecording);
}

// Build the interface once the page (and sketch.js globals) are ready.
window.addEventListener('DOMContentLoaded', function () {
  new Interface();
});
