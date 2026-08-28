
// ----------------------------
// The path to the background image used as the "base" of the artwork.
// A "path" is like an address that tells the computer where to find a file.
const backgroundImagePath = 'assets/test illustration 01-2-2_09_09.png';

// The file paths for the flower textures used when texture-fill mode is turned on.
const textureImagePaths = ['assets/texture1.jpg', 'assets/texture2.jpg', 'assets/texture3.jpg'];

// Visual settings for the line and flower.
// These control how the lines and flowers look on screen.
const defaultTraceStrokeWeight = 8; // The starting thickness of drawn lines (in pixels).
const minStrokeWeight = 8; // The minimum line thickness (in pixels).
const maxStrokeWeight = 30; // The maximum line thickness (in pixels).
const defaultFlowerSize = 50; // The starting size of each flower (in pixels).
const flowerNoiseSpeed = 0.01; // How fast flowers move around (smaller number = slower movement).

// Reference to the canvas so it can receive dropped files.
// A "canvas" is the drawing area on the screen.
let myCanvas; // Stores the main drawing canvas.
let canvasAreaWidth = 0; // The current width of the canvas (fills the whole window).
let canvasAreaHeight = 0; // The current height of the canvas (fills the whole window).
let flowerSize = defaultFlowerSize; // The current flower size, set by the interface panel.
let traceStrokeWeight = defaultTraceStrokeWeight; // The current line thickness, set by the interface panel.

// Textures that can be used as a flower fill instead of a flat color.
let textureImages = []; // Stores the loaded texture images.
let textureFillEnabled = false; // Is texture-fill mode currently turned on?

// "Let grow": when enabled, every drawn flower recursively sprouts its own child
// stems and flowers, so the garden keeps growing on its own after each stroke.
let letGrowEnabled = false; // Is auto-growth currently turned on?
const maxGrowthDepth = 3; // How many generations of child stems/flowers can grow from one stroke.
const growthShrinkFactor = 0.62; // Each new generation's stem gets a little thinner by this much.
const maxGrowthPointOnStem = 0.7; // New flowers only grow within this fraction (0-70%) of a stem, measured from its start.
const maxChildStemAngle = 20; // Child stems can turn up to 20 degrees from their parent stem.
const growthSessionDuration = 1000; // Collect manually drawn flowers for 20 seconds.
const growthDelayDuration = 2000; // Wait one minute after a collection session before growing.
const dotBloomSessionDuration = 1000; // Collect child dots for one second.
const dotBloomDelayDuration = 1000; // Wait one second before dots bloom into flowers.

// The image that sits behind everything.
// These store the background picture (or video) that the user drags across.
let backgroundImage; // Stores the background image file.
let backgroundVideo; // Stores the background video file (if the user loads one).
let backgroundVideoObjectUrl = null; // Stores the location of the video file.
let videoSampler; // A tiny helper canvas used to read pixel colors from the video.

// A separate drawing layer holds the stem currently being drawn.
// A "layer" is like a transparent sheet where we draw on top of the background image.
let drawingLayer; // Stores the layer for the stem currently being drawn.

// Each completed plant keeps its stem and animated flower together in creation order.
let plants = []; // A list that holds all completed stem and flower pairs.
let isVideoRecording = false; // Is the canvas currently being recorded?
let activeVideoRecorder = null; // The active MediaRecorder instance.
let activeVideoStream = null; // The canvas capture stream used for recording.

// Stores the drawn background image bounds when using fit/contain mode.
// These numbers track where the background image is positioned and how big it is.
let imageDrawX = 0; // The X position (left edge) of the background image.
let imageDrawY = 0; // The Y position (top edge) of the background image.
let imageDrawWidth = 0; // The width of the background image on screen.
let imageDrawHeight = 0; // The height of the background image on screen.

// Tracks whether the user is currently drawing.
// "true" means the user is drawing, "false" means they are not.
let isTracing = false; // Is the user currently drawing? (starts as not drawing).
let isTouching = false; // Is the user currently drawing with a touch?
let inputX = 0; // The current X position for mouse or touch input.
let inputY = 0; // The current Y position for mouse or touch input.

// The last mouse positions used to make a line.
// These remember where the cursor was so we can draw a line from point to point.
let previousX = 0; // The X position where the previous line segment ended.
let previousY = 0; // The Y position where the previous line segment ended.
let stemStartX = 0; // The X position of the very first point of the current stem (where the mouse was pressed).
let stemStartY = 0; // The Y position of the very first point of the current stem (where the mouse was pressed).
let lastTraceX = 0; // The X position of the most recent line endpoint.
let lastTraceY = 0; // The Y position of the most recent line endpoint.
let currentTracePoints = []; // The points that make up the stem currently being drawn.
let growthSession = []; // Flowers collected during the current 20-second session.
let growthSessionTimer = null; // Timer that closes the collection session.
let growthDelayTimers = []; // Delayed growth timers that can be cancelled when clearing.
let dotBloomSession = []; // Child dots waiting to bloom.
let dotBloomSessionTimer = null; // Timer that closes the dot session.
let dotBloomDelayTimers = []; // Delayed dot-bloom timers that can be cancelled when clearing.

// Stores the color at the last traced point.
// When the user releases the mouse, we remember the color to make a matching flower.
let lastTraceColor; // The color that was sampled from under the mouse when drawing stopped.

// ----------------------------
// 2. Load assets before setup
// ----------------------------
// This function runs BEFORE everything else.
// "preload" means to load (get ready) things in advance.
// The background image is loaded here so it is ready to use in setup().
// A "function" is a set of instructions that runs when we call its name.
function preload() {
  // Load the background image from the file path.
  // loadImage() reads the image file and stores it in memory.
  backgroundImage = loadImage(backgroundImagePath);

  // Load the texture images used for the texture-fill flowers.
  textureImages = textureImagePaths.map((texturePath) => loadImage(texturePath));
}

// ----------------------------
// 3. Set up the canvas and UI
// ----------------------------
// This function runs ONCE at the start to get everything ready.
// "UI" stands for "User Interface" - the buttons, sliders, and visual elements.
function setup() {
  // Create the main canvas (the drawing area), sized to fill the whole window.
  // "createCanvas" creates a rectangular area where we can draw.
  updateCanvasAreaSize();
  myCanvas = createCanvas(canvasAreaWidth, canvasAreaHeight);
  // Place the canvas inside its own wrapper, behind the floating interface panel.
  myCanvas.parent('canvas-wrapper');

  // Tell the canvas to accept files that the user drags onto it.
  // "drop" means when the user drags and drops a file on the canvas.
  // "handleDrop" is a function we created to handle dropped files.
  myCanvas.drop(handleDrop);

  // Extra setup for older browsers that may not support drop events.
  // "addEventListener" means "listen for an event" (in this case, when something is dragged over).
  // This prevents the browser from doing its default action (opening the file).
  document.body.addEventListener('dragover', (event) => event.preventDefault());

  // Listen for when the user drops a file on the page.
  document.body.addEventListener('drop', (event) => {
    // Stop the browser from doing its default action.
    event.preventDefault();
    // Get the first file that was dropped.
    // "files[0]" means the first file in the list (the first one dropped).
    const droppedFile = event.dataTransfer.files[0];

    // Check if the dropped file is an image.
    // "startsWith('image/')" checks if the file type starts with 'image/'.
    // This is true for .jpg, .png, .gif, and other image formats.
    if (droppedFile?.type.startsWith('image/')) {
      // Create a "FileReader" to read the file from the computer.
      const reader = new FileReader();
      // When the file finishes loading, run this function.
      reader.onload = () => setBackgroundImage(reader.result);
      // Start reading the file as data (a special computer format).
      reader.readAsDataURL(droppedFile);
    }

    // Check if the dropped file is a video.
    // This is true for .mp4, .webm, and other video formats.
    if (droppedFile?.type.startsWith('video/')) {
      // Create a reference to the dropped video file.
      // "URL.createObjectURL" makes a temporary address for the file.
      const droppedVideoUrl = URL.createObjectURL(droppedFile);
      // Set the video as the new background.
      // "true" means we want to clean up this temporary address later.
      setBackgroundVideo(droppedVideoUrl, true);
    }
  });

  // Make sure images are drawn starting from their top-left corner.
  // This keeps everything properly lined up with where the cursor is.
  // "CORNER" means we measure from the corner (top-left) of the image.
  imageMode(CORNER);

  // Create a separate transparent layer for drawing lines and flowers.
  // This layer sits on top of the background image.
  drawingLayer = createGraphics(canvasAreaWidth, canvasAreaHeight);
  // Make sure the layer starts empty (clear it).
  drawingLayer.clear();

  // Create a tiny helper image (only 1x1 pixel) to quickly read colors from videos.
  // This small image helps us find what color is under the cursor.
  videoSampler = createGraphics(1, 1);
}

// ----------------------------
// 4. Mouse drop handler
// ----------------------------
// This function runs when the user drops a file onto the canvas.
// It figures out if the dropped file is an image or video, then handles it.
function handleDrop(file) {
  // Check if the dropped file is an image.
  // If it is, load it as the new background.
  if (file.type === 'image') {
    // p5 gives us the dropped file as data that we can use as an image.
    // Pass this data to the setBackgroundImage function.
    setBackgroundImage(file.data);
  }

  // Check if the dropped file is a video.
  if (file.type === 'video') {
    // If the file came from the user's computer, use a special reference to it.
    // This is more efficient than trying to send the whole file.
    if (file.file) {
      // Create a temporary address for the video file.
      const droppedVideoUrl = URL.createObjectURL(file.file);
      // Set this video as the new background.
      // "true" means we want to clean up later.
      setBackgroundVideo(droppedVideoUrl, true);
      // Stop here (don't run the next line).
      return;
    }

    // If we got here, use the video data directly.
    setBackgroundVideo(file.data, false);
  }
}

// This function sets a new background image.
// It handles loading the image and clearing old drawings.
function setBackgroundImage(imageSource) {
  // Stop drawing if the user is currently drawing.
  // We do this to avoid confusion when the background suddenly changes.
  isTracing = false;
  // Erase all the lines that were already drawn.
  clearCanvas();
  // Remove any background video that might be playing.
  removeBackgroundVideo();

  // Remove the old background image.
  // "null" means "nothing" - we're emptying the variable.
  backgroundImage = null;
  // Load the new image file.
  // When the image finishes loading, store it in backgroundImage.
  // The "=>" arrow means "then do this" (run this code when loading is done).
  loadImage(imageSource, (loadedImage) => {
    // Save the newly loaded image so we can use it.
    backgroundImage = loadedImage;
  });
}

// This function sets a new background video.
// It's similar to setBackgroundImage but for videos instead.
function setBackgroundVideo(videoSource, shouldRevokeObjectUrl) {
  // Stop drawing if the user is currently drawing.
  isTracing = false;
  // Erase all the lines that were already drawn.
  clearCanvas();
  // Remove any background image that might be showing.
  backgroundImage = null;
  // Remove any old video that might still be playing.
  removeBackgroundVideo();

  // Create a new video and tell it what to do when it's ready.
  // "createVideo" loads a video file and prepares it for playback.
  backgroundVideo = createVideo(videoSource, () => {
    // When the video is ready, make it play on repeat (loop).
    backgroundVideo.loop();
  });
  // Hide the default video player controls (we're drawing on it, not showing it normally).
  backgroundVideo.hide();
  // Turn off the sound (set volume to 0).
  backgroundVideo.volume(0);

  // If we need to clean up this temporary video reference later, remember it.
  // This prevents the computer's memory from getting full.
  if (shouldRevokeObjectUrl) {
    // Store the video address so we can delete it later.
    backgroundVideoObjectUrl = videoSource;
  }
}

// This function removes the background video and cleans up memory.
// "Clean up" means to remove things we no longer need.
function removeBackgroundVideo() {
  // Check if there is a video currently playing.
  if (backgroundVideo) {
    // Stop the video from playing.
    backgroundVideo.stop();
    // Remove the video from the screen and memory.
    backgroundVideo.remove();
    // Set the variable to null (nothing).
    backgroundVideo = null;
  }

  // Check if we have a temporary video reference that needs to be cleaned up.
  if (backgroundVideoObjectUrl) {
    // Delete the temporary reference to free up memory.
    // "revoke" means to take away or remove.
    URL.revokeObjectURL(backgroundVideoObjectUrl);
    // Clear the variable.
    backgroundVideoObjectUrl = null;
  }
}

// ----------------------------
// 5. Draw loop
// ----------------------------
// This function runs over and over, many times per second.
// It updates everything on the screen (like a movie, frame by frame).
function draw() {
  // Fill the entire screen with black to erase the previous frame.
  // This prevents old drawings from staying on the screen.
  background(0);

  // Draw the background image (or video) in the center, fitting it nicely.
  // "Fit" means making it as big as possible without stretching it.
  displayImageFit();

  // Draw completed stems and flowers together, from oldest to newest.
  drawPlants();

  // Keep the stem currently being drawn above all completed plants.
  if (isTracing) {
    image(drawingLayer, 0, 0);
  }

  // Check if the user is currently drawing and their mouse button is held down.
  // If true, draw a new line segment.
  // A "conditional" is an "if" statement that checks if something is true or false.
  // Also stop extending the line while the cursor has moved over the interface panel.
  if (isTracing && (mouseIsPressed || isTouching) && !isPointOverInterface(inputX, inputY)) {
    // Get the color from any drawable (stem/flower) at the mouse position.
    // If nothing is drawn there, sample from the background image.
    const sampledColor = getColorAtPosition(inputX, inputY);

    // Flip the color so it's the opposite (light becomes dark, dark becomes light).
    // This makes the drawn line stand out against the background.
    const invertedSampledColor = invertColor(sampledColor);

    // Set up how the line should look (what color and thickness).
    drawingLayer.stroke(invertedSampledColor); // Use the inverted color for the line.
    // Use the stroke weight set by the interface panel's slider.
    drawingLayer.strokeWeight(traceStrokeWeight); // Set how thick the line should be based on the slider.
    drawingLayer.strokeCap(ROUND); // Make the line ends rounded instead of pointy.

    // Draw a line from where the mouse was to where it is now.
    // This creates smooth curves as the user drags the mouse.
    drawingLayer.line(previousX, previousY, inputX, inputY);

    // Remember the current mouse position for the next line segment.
    // Next frame, the line will start from here.
    previousX = inputX; // Save the current X position.
    previousY = inputY; // Save the current Y position.
    lastTraceX = inputX; // Also save it as the last traced position.
    lastTraceY = inputY; // This is used to place the flower when the user stops drawing.
    lastTraceColor = invertedSampledColor; // Save the color to use for the flower later.
    currentTracePoints.push({ x: inputX, y: inputY });
  }
}

// ----------------------------
// 6. Clear the drawing layer
// ----------------------------
// This function erases all the lines and flowers the user has drawn.
function clearCanvas() {
  if (growthSessionTimer !== null) {
    clearTimeout(growthSessionTimer);
    growthSessionTimer = null;
  }
  growthDelayTimers.forEach(clearTimeout);
  growthDelayTimers = [];
  growthSession = [];

  if (dotBloomSessionTimer !== null) {
    clearTimeout(dotBloomSessionTimer);
    dotBloomSessionTimer = null;
  }
  dotBloomDelayTimers.forEach(clearTimeout);
  dotBloomDelayTimers = [];
  dotBloomSession = [];

  // Make the drawing layer completely empty (transparent).
  // "clear" means to erase everything on a layer.
  drawingLayer.clear();

  // Also remove all completed stems and flowers.
  // "=" and "[]" means "set this variable to an empty list".
  plants = [];
}

// This function turns texture-fill mode on or off.
// When it's on, new flowers get a random texture image as their fill instead of a color.
// The interface panel's toggle switch calls this directly when the user clicks it.
function toggleTextureFill() {
  // "!" flips true to false and false to true.
  textureFillEnabled = !textureFillEnabled;
}

// ----------------------------
// 7. Read a pixel color from the background image (or video)
// ----------------------------
// This helper function tries to read a non-transparent pixel from a graphics layer.
// Returns the color if found, or null if the pixel is transparent or out of bounds.
function getColorFromGraphics(gfx, x, y) {
  // Make sure the coordinates are within the graphics bounds.
  if (x < 0 || x >= gfx.width || y < 0 || y >= gfx.height) {
    // Out of bounds, return null (no color found).
    return null;
  }

  // Get the pixel color at the position.
  const pixelColor = gfx.get(x, y);
  // Check the alpha (transparency) channel - if it's greater than 0, the pixel is not transparent.
  if (alpha(pixelColor) > 0) {
    // Return the non-transparent color.
    return pixelColor;
  }
  // The pixel is transparent, so return null.
  return null;
}

// This function reads the color at a position, checking drawable layers (stems and flowers) first.
// If no drawable is found at that position, it falls back to reading from the background image.
function getColorAtPosition(x, y) {
  // First, try to get the color from the current drawing layer (the stem being drawn).
  const currentLayerColor = getColorFromGraphics(drawingLayer, x, y);
  if (currentLayerColor !== null) {
    // Found a non-transparent pixel in the current stem layer.
    return currentLayerColor;
  }

  // Next, check existing plants in reverse order (newest first, so they have priority).
  // A "for loop" that counts backward through the plants array.
  for (let i = plants.length - 1; i >= 0; i -= 1) {
    // Try to get the color from this plant's stem layer.
    const plantColor = getColorFromGraphics(plants[i].stemLayer, x, y);
    if (plantColor !== null) {
      // Found a non-transparent pixel in this plant's stem.
      return plantColor;
    }
  }

  // No drawable (stem or flower) was found at this position.
  // Fall back to reading the color from the background image (or video).
  return getImageColor(x, y);
}

// This function gets the color of the pixel at position (x, y) from the background image or video.
// It works with both images and videos.
function getImageColor(x, y) {
  // Check if there is a video playing and it has loaded properly.
  // "&&" means "AND" - all conditions must be true.
  // "videoWidth > 0" means the video has width (it's loaded).
  const hasVideo = backgroundVideo
    && backgroundVideo.elt.videoWidth > 0
    && backgroundVideo.elt.videoHeight > 0;
  // Check if there is an image loaded and it has loaded properly.
  const hasImage = backgroundImage
    && backgroundImage.width > 0
    && backgroundImage.height > 0;

  // If we don't have an image or video yet, return black.
  // "!" means "NOT" - the opposite.
  // "!hasVideo && !hasImage" means "if there is NO video AND NO image".
  if (!hasVideo && !hasImage) {
    // Return black (RGB value 0, 0, 0).
    return color(0);
  }

  // If the image hasn't been positioned on screen yet, return a simple color.
  // "||" means "OR" - either condition can be true.
  if (imageDrawWidth <= 0 || imageDrawHeight <= 0) {
    // If we have an image, get the top-left pixel; otherwise return black.
    // "?" and ":" is a shorthand for if/else.
    return hasImage ? backgroundImage.get(0, 0) : color(0);
  }

  // Make sure the coordinates are within the image area (not outside).
  // "constrain" keeps a number within a minimum and maximum.
  const clampedX = constrain(x, imageDrawX, imageDrawX + imageDrawWidth);
  const clampedY = constrain(y, imageDrawY, imageDrawY + imageDrawHeight);

  // Convert the screen position to the position in the original image file.
  // The image file may be smaller than how we're displaying it, so we need to "map" (translate) the coordinates.
  // Get the original width and height of the image or video file.
  const sourceWidth = hasVideo ? backgroundVideo.elt.videoWidth : backgroundImage.width;
  const sourceHeight = hasVideo ? backgroundVideo.elt.videoHeight : backgroundImage.height;
  // Map the clamped screen coordinates to the source image coordinates.
  // "map" converts from one range of numbers to another.
  const mappedX = map(clampedX, imageDrawX, imageDrawX + imageDrawWidth, 0, sourceWidth - 1);
  const mappedY = map(clampedY, imageDrawY, imageDrawY + imageDrawHeight, 0, sourceHeight - 1);

  // Get and return the color from the pixel at the mapped coordinates.
  if (hasVideo) {
    // If it's a video, use a different method to read the pixel.
    videoSampler.imageMode(CORNER); // Set up the sampling area.
    // Draw a tiny 1x1 piece of the video to our sampler.
    // "round()" converts a decimal to a whole number.
    videoSampler.image(backgroundVideo, 0, 0, 1, 1, round(mappedX), round(mappedY), 1, 1);
    // Read the color of that single pixel.
    return videoSampler.get(0, 0);
  }

  // If it's an image (not a video), get the pixel color directly.
  return backgroundImage.get(round(mappedX), round(mappedY));
}

// ----------------------------
// 8. Invert a color
// ----------------------------
// This function takes a color and makes it the opposite.
// Red becomes cyan, blue becomes yellow, etc.
function invertColor(sourceColor) {
  // Colors are made of three channels: Red, Green, and Blue (RGB).
  // Each channel has a value from 0-255.
  // To invert, we subtract each channel from 255.
  // For example: if red is 100, inverted red is 255 - 100 = 155.
  return color(
    255 - red(sourceColor), // Invert the red channel.
    255 - green(sourceColor), // Invert the green channel.
    255 - blue(sourceColor) // Invert the blue channel.
  );
}

// ----------------------------
// 9. Draw background image (or video) centered on screen
// ----------------------------
// This function draws the background image or video in the middle of the screen.
// It makes it as large as possible without stretching or squishing it.
function displayImageFit() {
  // Start measuring from the corner (top-left) of images.
  imageMode(CORNER);

  // Check if there's a video loaded and ready.
  const hasVideo = backgroundVideo
    && backgroundVideo.elt.videoWidth > 0
    && backgroundVideo.elt.videoHeight > 0;
  // Check if there's an image loaded and ready.
  const hasImage = backgroundImage
    && backgroundImage.width > 0
    && backgroundImage.height > 0;

  // If there's no image or video loaded yet, don't try to draw anything.
  if (!hasVideo && !hasImage) {
    // Reset the image bounds (no image to display).
    imageDrawWidth = 0;
    imageDrawHeight = 0;
    // Stop running this function (return means "exit the function").
    return;
  }

  // Decide which source to use: the video or the image.
  const source = hasVideo ? backgroundVideo : backgroundImage;
  // Get the original width and height of the source.
  const sourceWidth = hasVideo ? backgroundVideo.elt.videoWidth : backgroundImage.width;
  const sourceHeight = hasVideo ? backgroundVideo.elt.videoHeight : backgroundImage.height;

  // Add 50px margins on top and bottom (100px total vertical space reserved).
  const topMargin = 50;
  const bottomMargin = 50;
  const availableHeight = height - topMargin - bottomMargin;

  // Calculate how much to scale (resize) the image to fit on screen with margins.
  // "min" finds the smallest number. We never make it bigger than 1 (original size).
  // Now we account for the available height (minus the 50px top and bottom).
  const scaleToFit = min(1, min(width / sourceWidth, availableHeight / sourceHeight));
  // Calculate the display width and height.
  imageDrawWidth = sourceWidth * scaleToFit;
  imageDrawHeight = sourceHeight * scaleToFit;
  // Calculate the X and Y positions to center the image on screen.
  // Center horizontally as before.
  imageDrawX = (width - imageDrawWidth) / 2;
  // For vertical: add the top margin, then center within the available height.
  imageDrawY = topMargin + (availableHeight - imageDrawHeight) / 2;

  // Draw the image (or video) at the calculated position and size.
  image(source, imageDrawX, imageDrawY, imageDrawWidth, imageDrawHeight);
}

// ----------------------------
// 10. Mouse events
// ----------------------------
// Checks whether a page position (in the same coordinate space as mouseX/mouseY)
// falls on top of the floating interface panel, so canvas drawing can ignore it.
function isPointOverInterface(x, y) {
  const interfaceElement = document.getElementById('interface');
  if (!interfaceElement) {
    return false;
  }
  const bounds = interfaceElement.getBoundingClientRect();
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

// This function runs when the user clicks the mouse button.
function mousePressed() {
  // Check if the user clicked with the left mouse button.
  // "!=" means "not equal to" (the opposite of ==).
  if (mouseButton !== LEFT || isPointOverInterface(mouseX, mouseY)) {
    // Stop this function without doing anything.
    return;
  }

  inputX = mouseX;
  inputY = mouseY;

  // The user clicked on the drawing area, so start drawing mode.
  isTracing = true; // Set to true to indicate we're drawing.

  // Save the position where the user clicked (the start of the stroke/line).
  previousX = mouseX; // Remember the X position.
  previousY = mouseY; // Remember the Y position.
  stemStartX = mouseX; // Remember the stem's first point (used later for "Let grow").
  stemStartY = mouseY; // Remember the stem's first point (used later for "Let grow").
  lastTraceX = mouseX; // Also save as the last trace position.
  lastTraceY = mouseY; // This will be the position where the flower is drawn.
  currentTracePoints = [{ x: mouseX, y: mouseY }];

  // Sample the color from the background image at this position.
  // Invert it so the line will stand out.
  lastTraceColor = invertColor(getImageColor(mouseX, mouseY));
}

function touchStarted() {
  const firstTouch = touches[0];

  if (!firstTouch || isPointOverInterface(firstTouch.x, firstTouch.y)) {
    return true;
  }

  isTouching = true;
  inputX = firstTouch.x;
  inputY = firstTouch.y;
  isTracing = true;
  previousX = inputX;
  previousY = inputY;
  stemStartX = inputX;
  stemStartY = inputY;
  lastTraceX = inputX;
  lastTraceY = inputY;
  currentTracePoints = [{ x: inputX, y: inputY }];
  lastTraceColor = invertColor(getImageColor(inputX, inputY));

  return false;
}

function touchMoved() {
  const firstTouch = touches[0];

  if (!firstTouch || !isTouching) {
    return true;
  }

  inputX = firstTouch.x;
  inputY = firstTouch.y;

  return false;
}

function touchEnded() {
  if (!isTouching) {
    return true;
  }

  isTouching = false;
  mouseReleased();

  return false;
}

// This function runs when the user releases (lets go of) the mouse button.
function mouseReleased() {
  // If the user wasn't drawing, do nothing.
  // We only want to create a flower if they were drawing.
  if (!isTracing) {
    return;
  }

  // Stop drawing mode.
  isTracing = false; // Set to false to indicate we're no longer drawing.

  // Create a flower with a color that contrasts with the underlying color.
  // Get the color (from stem/flower or background) at the spot where the user released the mouse.
  const backgroundPixelColor = getColorAtPosition(lastTraceX, lastTraceY);
  // Create a flower color that looks nice against that background.
  const flowerColor = getFlowerColorWithHueContrast(backgroundPixelColor);
  // Randomly choose how many petals the flower should have (between 3 and 10).
  // "floor" rounds down to a whole number.
  // "random" picks a random number.
  const petalCount = floor(random(3, 9));
  // Get the size from the slider, or use the default size if there's no slider.
  // "?" and ":" mean "if slider exists, use it; otherwise use default".
  // Get the current flower size from the interface panel's slider, if one has been created yet.
  const currentFlowerSize = flowerSize || defaultFlowerSize;
  // Calculate how far the flower should move around its center.
  // Dividing by 2 gives us half the size (that's the maximum distance it will move).
  const movementHalfRange = currentFlowerSize / 2;

  // If texture-fill mode is on, build a version of the flower filled with a random texture image
  // instead of a flat color. Otherwise, this stays empty and the flower uses "flowerColor".
  const flowerTextureSprite = textureFillEnabled && textureImages.length > 0
    ? createTexturedFlowerSprite(currentFlowerSize, petalCount, random(textureImages))
    : null;

  // Create a color for the flower center that contrasts with the petals.
  // We use the inverted color (opposite) for visual appeal (same as in drawFlower).
  const centerColor = invertColor(flowerColor);

  // Keep the completed stem and its flower together, so newer plants are foreground.
  // "push" means "add to the end of the list".
  plants.push({
    stemLayer: drawingLayer,
    // The background image's on-screen position/size when this plant was drawn.
    // Comparing this to the current bounds lets us rescale and reposition the plant on resize.
    imageBounds: { x: imageDrawX, y: imageDrawY, width: imageDrawWidth, height: imageDrawHeight },
    noiseOffsetX: random(1000),
    noiseOffsetY: random(1000),
    flower: {
      // The X position where the flower should be centered.
      originalX: lastTraceX,
      // The Y position where the flower should be centered.
      originalY: lastTraceY,
      // How far the flower can move from its center position.
      movementHalfRange,
      // A random number to make the flower's movement unique (different from other flowers).
      noiseOffsetX: random(1000),
      // Another random number for vertical movement.
      noiseOffsetY: random(1000),
      // The size of this flower (in pixels).
      size: currentFlowerSize,
      // The color of the flower petals (unused when a texture sprite is set).
      color: flowerColor,
      // The color of the flower center circle.
      centerColor,
      // A ready-made image of the flower filled with a texture, or null to use "color" instead.
      textureSprite: flowerTextureSprite,
      // How many petals this flower has.
      petalCount
    }
  });

  // Prepare a fresh transparent layer for the next stem.
  const midpoint = getPointOnTrace(currentTracePoints, 0.5);
  const midpointStemColor =
    getColorFromGraphics(drawingLayer, midpoint.x, midpoint.y) || lastTraceColor;
  drawingLayer = createGraphics(canvasAreaWidth, canvasAreaHeight);
  drawingLayer.clear();

  // If "Let grow" is enabled, collect this flower for the current timed session.
  if (letGrowEnabled) {
    addFlowerToGrowthSession(
      stemStartX,
      stemStartY,
      lastTraceX,
      lastTraceY,
      currentFlowerSize,
      flowerColor,
      midpointStemColor,
      currentTracePoints
    );
  }
}

function addFlowerToGrowthSession(startX, startY, endX, endY, size, baseColor, stemColor, tracePoints) {
  if (growthSession.length === 0) {
    growthSessionTimer = setTimeout(closeGrowthSession, growthSessionDuration);
  }

  growthSession.push({
    startX,
    startY,
    endX,
    endY,
    size,
    baseColor,
    stemColor,
    tracePoints: tracePoints.slice()
  });
}

function closeGrowthSession() {
  growthSessionTimer = null;
  const sessionToGrow = growthSession;
  growthSession = [];

  const growthDelayTimer = setTimeout(() => {
    for (let flowerIndex = 0; flowerIndex < sessionToGrow.length; flowerIndex += 1) {
      const flower = sessionToGrow[flowerIndex];
      growPlantFrom(
        flower.startX,
        flower.startY,
        flower.endX,
        flower.endY,
        flower.size,
        flower.baseColor,
        flower.stemColor,
        0,
        null,
        flower.tracePoints
      );
    }
    growthDelayTimers = growthDelayTimers.filter((timer) => timer !== growthDelayTimer);
  }, growthDelayDuration);
  growthDelayTimers.push(growthDelayTimer);
}

function addDotToBloomSession(dotPlant) {
  if (dotBloomSession.length === 0) {
    dotBloomSessionTimer = setTimeout(closeDotBloomSession, dotBloomSessionDuration);
  }
  dotBloomSession.push(dotPlant);
}

function closeDotBloomSession() {
  dotBloomSessionTimer = null;
  const dotsToBloom = dotBloomSession;
  dotBloomSession = [];

  const dotBloomDelayTimer = setTimeout(() => {
    for (let dotIndex = 0; dotIndex < dotsToBloom.length; dotIndex += 1) {
      const dotPlant = dotsToBloom[dotIndex];
      const flower = dotPlant.flower;
      flower.isDot = false;
      if (textureFillEnabled && textureImages.length > 0) {
        flower.textureSprite = createTexturedFlowerSprite(flower.size, flower.petalCount, random(textureImages));
      }
    }
    dotBloomDelayTimers = dotBloomDelayTimers.filter((timer) => timer !== dotBloomDelayTimer);
  }, dotBloomDelayDuration);
  dotBloomDelayTimers.push(dotBloomDelayTimer);
}

// This function switches "Let grow" auto-growth mode on or off.
function toggleLetGrow() {
  // "!" flips true to false and false to true.
  letGrowEnabled = !letGrowEnabled;
}

// ----------------------------
// 5b. Recursive plant growth ("Let grow")
// ----------------------------
// This function grows new flowers along a parent stem, then calls itself again with each
// brand-new stem as the next parent, to grow further generations. This is RECURSION: the
// function calling itself with a smaller version of the same problem, until "depth" reaches
// the limit. Every child stem always starts somewhere on its own parent stem, and inherits
// that parent's "stemColor" unchanged, so the whole plant stays one consistent stem color.
function growPlantFrom(parentStemStartX, parentStemStartY, parentStemEndX, parentStemEndY, size, baseColor, stemColor, depth, parentBendAmount = null, parentTracePoints = null) {
  // Stop recursion so child stems do not keep spawning more stems.
  if (depth > 0) {
    return;
  }

  // How long the parent stem is, so child stems can be sized relative to it.
  const parentStemLength = dist(parentStemStartX, parentStemStartY, parentStemEndX, parentStemEndY);

  // Each time, a random amount of new stems can grow: max 3, no direct buds.
  const newFlowerCount = floor(random(1, 4));
  for (let flowerIndex = 0; flowerIndex < newFlowerCount; flowerIndex += 1) {
    // Pick a random point somewhere in the first 70% of the parent stem, measured from its start.
    const growthAmount = random(0, maxGrowthPointOnStem);
    const growthPoint = parentTracePoints
      ? getPointOnTrace(parentTracePoints, growthAmount)
      : getStemPoint(
        parentStemStartX,
        parentStemStartY,
        parentStemEndX,
        parentStemEndY,
        growthAmount,
        parentBendAmount
      );
    const growthX = growthPoint.x;
    const growthY = growthPoint.y;

    // Every new flower stays the same size as its parent.
    const childSize = size;
    const childPetalCount = floor(random(3, 9));
    const childColor = baseColor;

    // Create a child stem only; no direct buds on the parent stem.
    const parentAngle = getStemDirectionAngle(
      parentStemStartX,
      parentStemStartY,
      parentStemEndX,
      parentStemEndY,
      growthAmount,
      parentBendAmount,
      parentTracePoints
    );
    const angle = parentAngle + random(-radians(maxChildStemAngle), radians(maxChildStemAngle));
    const childStemLength = (parentStemLength > 0 ? parentStemLength : size * 2) / 2;
    const newStemEndX = growthX + cos(angle) * childStemLength;
    const newStemEndY = growthY + sin(angle) * childStemLength;
    const childStrokeWeight = max(minStrokeWeight * 0.4, traceStrokeWeight * pow(growthShrinkFactor, depth + 1));
    const childBendAmount = random(-childStemLength * 0.35, childStemLength * 0.35);

    // Draw the new stem and flower...
    const childDot = createGrownPlant(growthX, growthY, newStemEndX, newStemEndY, childColor, stemColor, childSize, childPetalCount, childStrokeWeight, childBendAmount, true);
    addDotToBloomSession(childDot);
  }
}

function getStemDirectionAngle(startX, startY, endX, endY, amount, bendAmount, tracePoints) {
  const sampleDistance = 0.01;
  const beforeAmount = max(0, amount - sampleDistance);
  const afterAmount = min(1, amount + sampleDistance);
  const beforePoint = tracePoints
    ? getPointOnTrace(tracePoints, beforeAmount)
    : getStemPoint(startX, startY, endX, endY, beforeAmount, bendAmount);
  const afterPoint = tracePoints
    ? getPointOnTrace(tracePoints, afterAmount)
    : getStemPoint(startX, startY, endX, endY, afterAmount, bendAmount);

  return atan2(afterPoint.y - beforePoint.y, afterPoint.x - beforePoint.x);
}

function getPointOnTrace(tracePoints, amount) {
  if (tracePoints.length < 2) {
    return tracePoints[0] || { x: 0, y: 0 };
  }

  let totalLength = 0;
  for (let pointIndex = 1; pointIndex < tracePoints.length; pointIndex += 1) {
    totalLength += dist(
      tracePoints[pointIndex - 1].x,
      tracePoints[pointIndex - 1].y,
      tracePoints[pointIndex].x,
      tracePoints[pointIndex].y
    );
  }

  const targetLength = totalLength * amount;
  let travelledLength = 0;
  for (let pointIndex = 1; pointIndex < tracePoints.length; pointIndex += 1) {
    const previousPoint = tracePoints[pointIndex - 1];
    const currentPoint = tracePoints[pointIndex];
    const segmentLength = dist(
      previousPoint.x,
      previousPoint.y,
      currentPoint.x,
      currentPoint.y
    );

    if (travelledLength + segmentLength >= targetLength) {
      const segmentAmount = segmentLength === 0
        ? 0
        : (targetLength - travelledLength) / segmentLength;
      return {
        x: lerp(previousPoint.x, currentPoint.x, segmentAmount),
        y: lerp(previousPoint.y, currentPoint.y, segmentAmount)
      };
    }
    travelledLength += segmentLength;
  }

  return tracePoints[tracePoints.length - 1];
}

// Return a point on the visible stem curve, or on its endpoint line when no bend exists.
function getStemPoint(startX, startY, endX, endY, amount, bendAmount) {
  if (bendAmount === null) {
    return {
      x: lerp(startX, endX, amount),
      y: lerp(startY, endY, amount)
    };
  }

  const stemDeltaX = endX - startX;
  const stemDeltaY = endY - startY;
  const stemLength = dist(startX, startY, endX, endY);
  if (stemLength === 0) {
    return { x: startX, y: startY };
  }

  const perpendicularX = -stemDeltaY / stemLength;
  const perpendicularY = stemDeltaX / stemLength;
  const midX = (startX + endX) / 2 + perpendicularX * bendAmount;
  const midY = (startY + endY) / 2 + perpendicularY * bendAmount;
  const firstBlend = 3 * (1 - amount) * amount * amount;
  const secondBlend = 3 * (1 - amount) * (1 - amount) * amount;

  return {
    x: startX * pow(1 - amount, 3) + midX * secondBlend + midX * firstBlend + endX * pow(amount, 3),
    y: startY * pow(1 - amount, 3) + midY * secondBlend + midY * firstBlend + endY * pow(amount, 3)
  };
}

// This function draws a stem as a soft curve instead of a straight line, by bending it
// through a randomly offset midpoint (like a bezier curve bulging to one side).
function drawCurvedStem(layer, startX, startY, endX, endY, bendAmount = null) {
  // Find the direction and length of the straight line between the two points.
  const stemDeltaX = endX - startX;
  const stemDeltaY = endY - startY;
  const stemLength = dist(startX, startY, endX, endY);

  // Nothing to curve if the stem has no length (e.g. a bud with no stem of its own).
  if (stemLength === 0) {
    return;
  }

  // Find the perpendicular direction (90 degrees off the stem) to bend the curve sideways.
  const perpendicularX = -stemDeltaY / stemLength;
  const perpendicularY = stemDeltaX / stemLength;

  // Bend the middle of the stem sideways by a random amount, so every stem curves differently.
  const resolvedBendAmount = bendAmount === null
    ? random(-stemLength * 0.35, stemLength * 0.35)
    : bendAmount;
  const midX = (startX + endX) / 2 + perpendicularX * resolvedBendAmount;
  const midY = (startY + endY) / 2 + perpendicularY * resolvedBendAmount;

  // Use the bent midpoint as both bezier control points to create one smooth curve.
  layer.bezier(startX, startY, midX, midY, midX, midY, endX, endY);
}

// This function draws a gently curved stem between two points and adds a matching flower at
// the end, then stores them together as a new plant (the same shape mouseReleased() creates).
function createGrownPlant(startX, startY, endX, endY, flowerColor, stemColor, size, petalCount, strokeWeightValue, bendAmount = null, isDot = false) {
  // Draw the stem on its own transparent layer, just like a manually traced stem.
  const stemLayer = createGraphics(canvasAreaWidth, canvasAreaHeight);
  stemLayer.clear();
  stemLayer.stroke(stemColor);
  stemLayer.strokeWeight(strokeWeightValue);
  stemLayer.strokeCap(ROUND);
  stemLayer.noFill();
  drawCurvedStem(stemLayer, startX, startY, endX, endY, bendAmount);

  // Optionally fill the dot or flower with a random texture instead of a flat color.
  let flowerTextureSprite = null;
  if (textureFillEnabled && textureImages.length > 0) {
    const chosenTexture = random(textureImages);
    flowerTextureSprite = isDot
      ? createTexturedDotSprite(size, chosenTexture)
      : createTexturedFlowerSprite(size, petalCount, chosenTexture);
  }
  // Create a color for the flower center that contrasts with the petals.
  const centerColor = invertColor(flowerColor);

  // Keep the new stem and flower together, same shape as the manually drawn plants.
  const grownPlant = {
    stemLayer,
    imageBounds: { x: imageDrawX, y: imageDrawY, width: imageDrawWidth, height: imageDrawHeight },
    noiseOffsetX: random(1000),
    noiseOffsetY: random(1000),
    flower: {
      originalX: endX,
      originalY: endY,
      stemStartX: startX,
      stemStartY: startY,
      movementHalfRange: size / 2,
      noiseOffsetX: random(1000),
      noiseOffsetY: random(1000),
      size,
      color: flowerColor,
      centerColor,
      textureSprite: flowerTextureSprite,
      petalCount,
      isDot
    }
  };
  plants.push(grownPlant);
  return grownPlant;
}

function createTexturedDotSprite(size, textureImage) {
  const spriteSize = ceil(size);
  const sprite = createGraphics(spriteSize, spriteSize);
  sprite.clear();
  sprite.noStroke();
  sprite.fill(255);
  sprite.ellipse(spriteSize / 2, spriteSize / 2, size * 0.5, size * 0.5);
  sprite.drawingContext.globalCompositeOperation = 'source-in';
  sprite.image(textureImage, 0, 0, spriteSize, spriteSize);
  sprite.drawingContext.globalCompositeOperation = 'source-over';
  return sprite;
}

// This function draws a flower shape onto a small transparent image, then fills it with a
// texture image instead of a flat color (using the same shape as drawFlower).
function createTexturedFlowerSprite(size, petalCount, textureImage) {
  // Make the sprite a bit bigger than the flower so rotated petals aren't cut off.
  const spriteSize = ceil(size * 1.6);
  const spriteCenter = spriteSize / 2;

  // Create a small transparent image to draw the flower shape into.
  const sprite = createGraphics(spriteSize, spriteSize);
  sprite.clear();

  // Draw the flower shape in solid white; this shape acts as a stencil (a mask).
  sprite.push();
  sprite.translate(spriteCenter, spriteCenter);
  sprite.noStroke();
  sprite.fill(255);
  const petalLength = size * 0.54;
  const petalWidth = size * 0.4;
  const centerSize = size * 0.5;
  for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
    sprite.push();
    sprite.rotate((TWO_PI / petalCount) * petalIndex);
    sprite.ellipse(0, -size * 0.24, petalWidth, petalLength);
    sprite.pop();
  }
  // Draw the center circle in white (it will be filled separately with random color later).
  sprite.ellipse(0, 0, centerSize, centerSize);
  sprite.pop();

  // "source-in" keeps only the parts of the next drawing that overlap the white shape above,
  // which effectively fills the flower shape with the texture image.
  sprite.drawingContext.globalCompositeOperation = 'source-in';
  
  // Use a random crop from the texture image for variety.
  // "random" picks a random number within the given range.
  // We calculate random crop dimensions (between 30-70% of the texture size).
  const textureWidth = textureImage.width;
  const textureHeight = textureImage.height;
  const cropWidthPercent = random(0.3, 0.7); // Use 30-70% of texture width
  const cropHeightPercent = random(0.3, 0.7); // Use 30-70% of texture height
  const cropWidth = textureWidth * cropWidthPercent;
  const cropHeight = textureHeight * cropHeightPercent;
  
  // Pick a random starting position in the texture image.
  // Make sure the crop stays within the texture bounds.
  const maxSourceX = max(0, textureWidth - cropWidth);
  const maxSourceY = max(0, textureHeight - cropHeight);
  const sourceX = random(0, maxSourceX);
  const sourceY = random(0, maxSourceY);
  
  // Draw the random crop of the texture, stretching it to fill the sprite.
  // sprite.image(image, dx, dy, dw, dh, sx, sy, sw, sh)
  // The crop is stretched to fill the entire sprite size for the flower.
  sprite.image(
    textureImage,           // The texture image to draw from
    0,                      // Destination X (fill from left edge)
    0,                      // Destination Y (fill from top edge)
    spriteSize,             // Destination width (fill entire sprite)
    spriteSize,             // Destination height (fill entire sprite)
    sourceX,                // Source X (random crop start)
    sourceY,                // Source Y (random crop start)
    cropWidth,              // Source width (random crop size)
    cropHeight              // Source height (random crop size)
  );
  sprite.drawingContext.globalCompositeOperation = 'source-over';

  return sprite;
}

// This function creates a flower color that looks good against the background color.
// "Hue" is the type of color (red, blue, green, etc.).
// "Contrast" means to make something stand out by being very different.
function getFlowerColorWithHueContrast(baseColor) {
  // Calculate how different the flower color should be from the background.
  // Multiplying by 360 converts to degrees on the color wheel.
  // 0.4 means about 40% of the way around the color wheel (144 degrees).
  const hueContrastDegrees = 0.4 * 360;

  // Save the current drawing settings so we can change them temporarily.
  // "push" means "remember the current state".
  push();
  // Change to HSB color mode (Hue, Saturation, Brightness).
  // This makes it easier to create colors with contrast.
  colorMode(HSB, 360, 100, 100, 255);

  // Get the hue (color type) of the background.
  const baseHue = hue(baseColor);
  // Randomly decide if we should go clockwise or counterclockwise on the color wheel.
  // "<" means "less than". If the random number is less than 0.5, use -1; otherwise use 1.
  const contrastDirection = random() < 0.5 ? -1 : 1;
  // Calculate the target hue by moving along the color wheel.
  // "%" is modulo (remainder), which wraps the value around (so 361 becomes 1).
  const targetHue = (baseHue + (contrastDirection * hueContrastDegrees)) % 360;
  // Slightly randomize the hue to make each flower a bit different.
  // "-15" to "15" means a small variation of ±15 degrees.
  const randomizedHue = (targetHue + random(-20, 20) + 360) % 360;
  // Randomize how vibrant (saturated) the color should be.
  // 60-100 means fairly vibrant colors.
  const randomizedSaturation = random(60, 100);
  // Randomize how bright the color should be.
  // 55-100 means from medium brightness to very bright.
  const randomizedBrightness = random(55, 100);

  // Create the final flower color using the randomized values.
  const contrastedFlowerColor = color(
    randomizedHue, // The hue (which color on the wheel).
    randomizedSaturation, // How vibrant the color is.
    randomizedBrightness, // How bright the color is.
    255 // The opacity (255 means fully opaque, not transparent).
  );

  // Restore the drawing settings we saved earlier.
  // "pop" means "remember this state back".
  pop();
  // Send back the final flower color.
  return contrastedFlowerColor;
}

// ----------------------------
// 11. Create and draw a flower shape
// ----------------------------
// This function draws a flower with petals arranged in a circle.
// It takes several pieces of information (called "parameters").
function drawFlower(target, x, y, size, flowerColor, petalCount) {
  // Calculate the dimensions (sizes) of the petals based on the flower size.
  // "*" means multiply. 0.54 means 54% of the original size.
  const petalLength = size * 0.54; // How long each petal is.
  const petalWidth = size * 0.4; // How wide each petal is.
  const centerSize = size * 0.5; // How big the center circle is.

  // Create a color for the flower center that contrasts with the petals.
  // We use the inverted color (opposite) for visual appeal.
  const oppositeColor = invertColor(flowerColor);

  // Save the current drawing state (colors, transformations, etc.).
  // "push" means "remember the current state".
  target.push();
  // Move the origin (0, 0) to the flower's position.
  // This makes it easier to draw the petals around the center.
  target.translate(x, y);
  // Don't draw an outline around the petals (only fill them).
  target.noStroke();
  // Set the fill color to the flower color.
  target.fill(flowerColor);

  // Draw each petal around the center point.
  // A "for loop" repeats code multiple times.
  // This loop runs once for each petal.
  for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
    // Save the drawing state before rotating.
    target.push();
    // Rotate the coordinate system so the next petal points in a new direction.
    // "TWO_PI" is a full circle (360 degrees in radians).
    // Dividing by petalCount spreads the petals evenly around.
    target.rotate((TWO_PI / petalCount) * petalIndex);
    // Draw an oval (ellipse) for this petal.
    // It's positioned above the center (0, -size * 0.24).
    target.ellipse(0, -size * 0.24, petalWidth, petalLength);
    // Restore the drawing state (undo the rotation).
    target.pop();
  }

  // Draw the center of the flower.
  // "ellipse" with equal width and height creates a circle.
  target.fill(oppositeColor); // Use the contrasting color.
  target.ellipse(0, 0, centerSize, centerSize); // Draw at the center (0, 0).

  // Restore the previous drawing state.
  // This undoes the translate, so future drawings aren't affected.
  target.pop();
}

function drawDot(target, x, y, size, dotColor) {
  target.push();
  target.translate(x, y);
  target.noStroke();
  target.fill(dotColor);
  target.ellipse(0, 0, size * 0.5, size * 0.5);
  target.pop();
}

// This function draws each plant in creation order, so newer stems and flowers are foreground.
function drawPlants() {
  // Loop through each completed plant.
  for (const plant of plants) {
    const creationBounds = plant.imageBounds;

    // Work out how much the background image has grown/shrunk and moved since this plant
    // was drawn, so the stem and flower can be rescaled and repositioned to match it.
    // Falls back to no change (scale 1, no offset) if we have no valid bounds to compare.
    const canScaleToImage = creationBounds.width > 0 && imageDrawWidth > 0;
    const scale = canScaleToImage ? imageDrawWidth / creationBounds.width : 1;
    const offsetX = canScaleToImage ? imageDrawX - creationBounds.x * scale : 0;
    const offsetY = canScaleToImage ? imageDrawY - creationBounds.y * scale : 0;

    const flower = plant.flower;
    // Generate smooth, natural-looking random movement using Perlin noise.
    // "noise" creates a value between 0 and 1 that changes smoothly over time.
    // We add frameCount (which increases each frame) to make it move over time.
    const stemNoiseValueX = noise(plant.noiseOffsetX + frameCount * flowerNoiseSpeed);
    const stemNoiseValueY = noise(plant.noiseOffsetY + frameCount * flowerNoiseSpeed);
    const flowerNoiseValueX = noise(flower.noiseOffsetX + frameCount * flowerNoiseSpeed);
    const flowerNoiseValueY = noise(flower.noiseOffsetY + frameCount * flowerNoiseSpeed);
    const scaledMovementHalfRange = flower.movementHalfRange * scale;
    const stemXOffset = map(stemNoiseValueX, 0, 1, -scaledMovementHalfRange * 0.5, scaledMovementHalfRange * 0.5);
    const stemYOffset = map(stemNoiseValueY, 0, 1, -scaledMovementHalfRange * 0.5, scaledMovementHalfRange * 0.5);
    const xOffset = map(flowerNoiseValueX, 0, 1, -scaledMovementHalfRange, scaledMovementHalfRange);
    const yOffset = map(flowerNoiseValueY, 0, 1, -scaledMovementHalfRange, scaledMovementHalfRange);

    // Keep the stem root much more stable while the upper stem still sways naturally.
    const stemAnchorRatio = 0.15;
    const stemLayerWidth = plant.stemLayer.width * scale;
    const stemLayerHeight = plant.stemLayer.height * scale;
    const stemShiftX = stemXOffset * stemAnchorRatio;
    const stemShiftY = stemYOffset * stemAnchorRatio;
    image(
      plant.stemLayer,
      offsetX + stemShiftX,
      offsetY + stemShiftY,
      stemLayerWidth,
      stemLayerHeight
    );

    // Map the flower's original position and size into the current image bounds.
    const scaledOriginalX = flower.originalX * scale + offsetX;
    const scaledOriginalY = flower.originalY * scale + offsetY;
    const scaledSize = flower.size * scale;
    // Calculate the actual position by adding the offset to the original position.
    const animatedX = scaledOriginalX + xOffset; // X position with movement.
    const animatedY = scaledOriginalY + yOffset; // Y position with movement.

    if (flower.isDot) {
      if (flower.textureSprite) {
        const scaledSpriteSize = flower.textureSprite.width * scale;
        const spriteHalf = scaledSpriteSize / 2;
        image(flower.textureSprite, animatedX - spriteHalf, animatedY - spriteHalf, scaledSpriteSize, scaledSpriteSize);
      } else {
        drawDot(this, animatedX, animatedY, scaledSize, flower.color);
      }
    // If this flower has a texture sprite, draw that image instead of the plain color version.
    } else if (flower.textureSprite) {
      const scaledSpriteSize = flower.textureSprite.width * scale;
      const spriteHalf = scaledSpriteSize / 2;
      image(flower.textureSprite, animatedX - spriteHalf, animatedY - spriteHalf, scaledSpriteSize, scaledSpriteSize);
      // Draw the center circle with the random contrasting color on top.
      push();
      translate(animatedX, animatedY);
      noStroke();
      fill(flower.centerColor);
      const centerSize = scaledSize * 0.5;
      ellipse(0, 0, centerSize, centerSize);
      pop();
    } else {
      // Draw the flower at its new animated position, scaled to match the image.
      drawFlower(this, animatedX, animatedY, scaledSize, flower.color, flower.petalCount);
    }
  }
}

// ----------------------------
// 12. Handle resizing the window
// ----------------------------
// This function runs whenever the user resizes their browser window.
// It makes sure the canvas (drawing area) always fills the whole window.
// This function saves the entire artwork as a PNG image.
function exportFullArtwork() {
  saveCanvas(myCanvas, 'garden-art', 'png');
}

// This function creates a transparent PNG containing all drawn elements, including stems and flowers,
// while leaving the background image out of the export.
function exportDrawnElements() {
  const drawnElementsLayer = createGraphics(canvasAreaWidth, canvasAreaHeight);
  drawnElementsLayer.clear();

  if (isTracing) {
    drawnElementsLayer.image(drawingLayer, 0, 0);
  }

  for (const plant of plants) {
    const flower = plant.flower;
    const creationBounds = plant.imageBounds;
    const canScaleToImage = creationBounds.width > 0 && imageDrawWidth > 0;
    const scale = canScaleToImage ? imageDrawWidth / creationBounds.width : 1;
    const offsetX = canScaleToImage ? imageDrawX - creationBounds.x * scale : 0;
    const offsetY = canScaleToImage ? imageDrawY - creationBounds.y * scale : 0;

    const stemNoiseValueX = noise(plant.noiseOffsetX + frameCount * flowerNoiseSpeed);
    const stemNoiseValueY = noise(plant.noiseOffsetY + frameCount * flowerNoiseSpeed);
    const flowerNoiseValueX = noise(flower.noiseOffsetX + frameCount * flowerNoiseSpeed);
    const flowerNoiseValueY = noise(flower.noiseOffsetY + frameCount * flowerNoiseSpeed);
    const scaledMovementHalfRange = flower.movementHalfRange * scale;
    const stemXOffset = map(stemNoiseValueX, 0, 1, -scaledMovementHalfRange * 0.5, scaledMovementHalfRange * 0.5);
    const stemYOffset = map(stemNoiseValueY, 0, 1, -scaledMovementHalfRange * 0.5, scaledMovementHalfRange * 0.5);
    const xOffset = map(flowerNoiseValueX, 0, 1, -scaledMovementHalfRange, scaledMovementHalfRange);
    const yOffset = map(flowerNoiseValueY, 0, 1, -scaledMovementHalfRange, scaledMovementHalfRange);

    const stemAnchorRatio = 0.15;
    const stemLayerWidth = plant.stemLayer.width * scale;
    const stemLayerHeight = plant.stemLayer.height * scale;
    const stemShiftX = stemXOffset * stemAnchorRatio;
    const stemShiftY = stemYOffset * stemAnchorRatio;
    drawnElementsLayer.image(
      plant.stemLayer,
      offsetX + stemShiftX,
      offsetY + stemShiftY,
      stemLayerWidth,
      stemLayerHeight
    );

    const scaledOriginalX = flower.originalX * scale + offsetX;
    const scaledOriginalY = flower.originalY * scale + offsetY;
    const scaledSize = flower.size * scale;
    const animatedX = scaledOriginalX + xOffset;
    const animatedY = scaledOriginalY + yOffset;

    if (flower.isDot) {
      if (flower.textureSprite) {
        const scaledSpriteSize = flower.textureSprite.width * scale;
        const spriteHalf = scaledSpriteSize / 2;
        drawnElementsLayer.image(flower.textureSprite, animatedX - spriteHalf, animatedY - spriteHalf, scaledSpriteSize, scaledSpriteSize);
      } else {
        drawDot(drawnElementsLayer, animatedX, animatedY, scaledSize, flower.color);
      }
    } else if (flower.textureSprite) {
      const scaledSpriteSize = flower.textureSprite.width * scale;
      const spriteHalf = scaledSpriteSize / 2;
      drawnElementsLayer.image(flower.textureSprite, animatedX - spriteHalf, animatedY - spriteHalf, scaledSpriteSize, scaledSpriteSize);
      drawnElementsLayer.push();
      drawnElementsLayer.translate(animatedX, animatedY);
      drawnElementsLayer.noStroke();
      drawnElementsLayer.fill(flower.centerColor);
      drawnElementsLayer.ellipse(0, 0, scaledSize * 0.5, scaledSize * 0.5);
      drawnElementsLayer.pop();
    } else {
      drawFlower(drawnElementsLayer, animatedX, animatedY, scaledSize, flower.color, flower.petalCount);
    }
  }

  saveCanvas(drawnElementsLayer, 'garden-drawn-elements', 'png');
}

// This function toggles recording mode: first press starts recording, second press stops and downloads.
function toggleVideoRecording() {
  if (isVideoRecording) {
    if (activeVideoRecorder && activeVideoRecorder.state !== 'inactive') {
      activeVideoRecorder.stop();
    }
    return;
  }

  if (!myCanvas || typeof MediaRecorder === 'undefined' || !myCanvas.canvas.captureStream) {
    window.alert('This browser does not support canvas recording in the current session.');
    return;
  }

  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) {
    window.alert('No supported video format is available for recording on this browser.');
    return;
  }

  const stream = myCanvas.canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  isVideoRecording = true;
  activeVideoRecorder = recorder;
  activeVideoStream = stream;
  setVideoRecordingButtonState(true);

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'garden-recording.mp4';
    link.click();
    URL.revokeObjectURL(downloadUrl);

    if (activeVideoStream) {
      activeVideoStream.getTracks().forEach((track) => track.stop());
    }

    isVideoRecording = false;
    activeVideoRecorder = null;
    activeVideoStream = null;
    setVideoRecordingButtonState(false);
  };

  recorder.start();
}

// This helper chooses the best recording mime type the browser supports.
function getSupportedVideoMimeType() {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return null;
}

function windowResized() {
  // Recalculate the available window size.
  updateCanvasAreaSize();
  // Resize the canvas to match the new available space.
  resizeCanvas(canvasAreaWidth, canvasAreaHeight);
}

// This function measures the available wrapper so the canvas stays clear of the interface.
function updateCanvasAreaSize() {
  const canvasWrapper = document.getElementById('canvas-wrapper');
  canvasAreaWidth = canvasWrapper ? canvasWrapper.clientWidth : windowWidth;
  canvasAreaHeight = canvasWrapper ? canvasWrapper.clientHeight : windowHeight;
}