/**
 * Orignal GA framework github repo: https://github.com/kittykatattack/ga
 * 
 * It is highly optimized just for this game in terms of size and functionality
 * i.e removed non-essentials and added some extra features.
 * some highlights are::
 * GA.create takes arguments as objects now,
 * onAnimationComplete callback added,
 * strict check in updateFunctions,
 * Assets load fn. & sprite gotoAndStop fn modified just for this game
 * extra plugins added(see at the end)
 * and more... 
 * 
 */
//`GA` is the global instance of the program.
export var GA = GA || {};

//### GA.create
//The entire Ga program exists inside the `Ga.create` method. It
//creates and returns a new instance of Ga, along with all the core
//game engine functions. However, Ga won't actually start until you
//call the `start` method from the applicaiton code, as you can see in
//all the examples (in the `examples` folder).
/**
 * 
 * @param {object} o 
 * width,
 * height,
 * view,
 * setup,
 * assets,
 * load,
 * keyCodes,
 * @returns 
 */
GA.create = function (o) {
  //The `ga` object is returned by this function. All the game
  //engine's methods and properties are going to be attached to it.
  var ga = {};

  /*
  ### Initialize the game engine
  All of Ga's intializtion code happens here.
  */

  //Make the canvas element and add it to the DOM.
  var dips = 1; //window.devicePixelRatio;
  ga.canvas = document.createElement("canvas");
  ga.canvas.style.backgroundColor = "black";
  ga.canvas.setAttribute("width", o.width * dips);
  ga.canvas.setAttribute("height", o.height * dips);
  ga.canvas.setAttribute("id", "gameCanvas");
  o.view.appendChild(ga.canvas);

  //Create the context as a property of the canvas.
  ga.canvas.ctx = ga.canvas.getContext("2d");

  //Make the `stage`. The `stage` is the root container group
  //for all the sprites and other groups.
  ga.stage = makeStage();

  //Make the keyboard keys (arrow keys and space bar.)
  ga.key = makeKeys(o.keyCodes);

  //Set the game `state`.
  ga.state = undefined;

  //Set the user-defined `load` and `setup` states.
  ga.load = o.load || undefined;
  ga.setup = o.setup || undefined;

  //The `setup` function is required, so throw an error if it's
  //missing.
  if (ga.setup === undefined) {
    throw new Error(
      "Please supply the setup function in the constructor"
    );
  }

  //Get the user-defined array that lists the assets
  //that have to load.
  ga.assetFilePaths = o.assets || undefined;

  //A Boolean to let us pause the game.
  ga.paused = false;

  //The upper-limit frames per second that the game should run at.
  //Ga defaults to 60 fps.
  //Use the `fps` getter/setter to modify this value.
  ga._fps = 60;
  ga._startTime = Date.now();
  ga._frameDuration = 1000 / ga._fps;
  ga._lag = 0;

  //Set sprite rendering position interpolation to
  //`true` by default
  ga.interpolate = true;

  //An array that stores functions which should be run inside
  //Ga's core `update` game loop. Just push any function you write
  //into this array, and ga will run it in a continuous loop.
  ga.updateFunctions = [];

  //The game's screen's scale.
  ga.scale = 1;

  /*
  ### Core game engine methods
  This next sections contains all the important methods that the game engine needs to do its work.
  */

  //### gameLoop
  //The engine's game loop. Ga uses a fixed timestep for logic update
  //and rendering. This is mainly for simplicity. I'll probably
  //migrate to a "fixed timestep / variable rendering" with
  //interpolation in the
  //next major update. For a working example, see:
  //jsbin.com/tolime/1/edit
  //If the `fps` isn't set, the maximum framerate is used.
  //Use Ga's `fps` getter/setter (in the code ahead) to change the framerate
  //
  function gameLoop() {
    requestAnimationFrame(gameLoop, ga.canvas);
    if (ga._fps === undefined) {

      //Run the code for each frame.
      update();
      ga.render(ga.canvas, 0);

    }

    //If `fps` has been set, clamp the frame rate to that upper limit.
    else {

      //Calculate the time that has elapsed since the last frame
      var current = Date.now(),
        elapsed = current - ga._startTime;

      if (elapsed > 1000) elapsed = ga._frameDuration;

      //For interpolation:
      ga._startTime = current;

      //Add the elapsed time to the lag counter
      ga._lag += elapsed;

      //Update the frame if the lag counter is greater than or
      //equal to the frame duration
      while (ga._lag >= ga._frameDuration) {

        //Capture the sprites' previous positions for rendering
        //interpolation
        capturePreviousSpritePositions();

        //Update the logic
        update();

        //Reduce the lag counter by the frame duration
        ga._lag -= ga._frameDuration;
      }

      //Calculate the lag offset and use it to render the sprites
      var lagOffset = ga._lag / ga._frameDuration;
      ga.render(ga.canvas, lagOffset);
    }
  }

  //### capturePreviousSpritePositions
  //This function is run in the game loop just before the logic update
  //to store all the sprites' previous positions from the last frame.
  //It allows the render function to interpolate the sprite positions
  //for ultra-smooth sprite rendering at any frame rate
  function capturePreviousSpritePositions() {
    ga.stage.children.forEach(function (sprite) {
      setPosition(sprite);
    });

    function setPosition(sprite) {
      sprite._previousX = sprite.x;
      sprite._previousY = sprite.y;
      if (sprite.children && sprite.children.length > 0) {
        sprite.children.forEach(function (child) {
          setPosition(child);
        });
      }
    }
  }

  //### update
  //The things that should happen in the game loop.
  function update() {

    //Render the canvas.
    //ga.render(ga.canvas);

    //Run the current game `state` function if it's been defined and
    //the game isn't `paused`.
    if (ga.state && !ga.paused) {
      ga.state();
    }

    /*
    Loop through all the functions in the `updateFunctions` array
    and run any functions it contains. You can add any of your
    own custom functions to this array like this:

        var customFunction = function() {console.log("I'm in the game loop!);}
        ga.updateFunctions.push(customFunction);

    See the see the code in the `particleEffect` and `enableFullscreen`
    section of the `plugins.js` file to see typical examples of how code can be
    added to the game loop like this.
    */

    if (ga.updateFunctions.length !== 0 && !ga.paused) {
      for (var l = 0; l < ga.updateFunctions.length; l++) {
        var updateFunction = ga.updateFunctions[l];
        if (updateFunction) {
          updateFunction();
        }
      }
    }
  }

  //### start
  //The `start` method that gets the whole engine going. This needs to
  //be called by the user from the game application code, right after
  //Ga is instantiated.
  ga.start = function () {
    if (ga.assetFilePaths) {

      //Use the supplied file paths to load the assets then run
      //the user-defined `setup` function.
      ga.assets.whenLoaded = function () {

        //Clear the game `state` function for now to stop the loop.
        ga.state = undefined;

        //Call the `setup` function that was supplied by the user in
        //Ga's constructor.
        ga.setup();
      };
      ga.assets.load(ga.assetFilePaths);

      //While the assets are loading, set the user-defined `load`
      //function as the game state. That will make it run in a loop.
      //You can use the `load` state to create a loading progress bar.
      if (ga.load) {
        ga.state = ga.load;
      }
    }

    //If there aren't any assets to load,
    //just run the user-defined `setup` function.
    else {
      ga.setup();
    }

    //Start the game loop.
    gameLoop();
  };

  //Getters and setters for various game engine properties.
  Object.defineProperties(ga, {

    //### fps
    //The `fps` getter/setter. Use it to set the frame rate.
    fps: {
      get: function () {
        return ga._fps;
      },
      set: function (value) {
        ga._fps = value;
        ga._startTime = Date.now();
        ga._frameDuration = 1000 / ga._fps;
      },
      enumerable: true,
      configurable: true
    },

    //### backgroundColor
    //Set the background color.
    backgroundColor: {
      set: function (value) {
        ga.canvas.style.backgroundColor = value;
      },
      enumerable: true,
      configurable: true
    }
  });



  /*
  Sprites
  - `group`: This is a generic parent container is just used to group related sprites together.
  Its `width` and `height` can be assigned manually but, if they aren't, the group's `width`
  and `height` will match the area taken up by its children.
  - `stage`: this is a special group that is created by the Ga engine when it's initialized. The
  `stage` is the root container that contains everything in the game.

  Use these building blocks for making most of the kinds of things you'll need in your games.
  When sprites are created, they're assigned all of their basic properties with the help of a method called
  `makeDisplayObject`. This gives the sprites all their default properties. After `makeDisplayObject` runs,
  each sprite type is customized but their own constructor methods.
  */

  //### makeDisplayObject
  //`makeDisplayObject` assigns properties that are common for all the sprite types.
  function makeDisplayObject(o) {

    //Initialize the position
    o.x = 0;
    o.y = 0;

    //Initialize the velocity.
    o.vx = 0;
    o.vy = 0;

    //Initialize the `width` and `height`.
    o.width = 0;
    o.height = 0;

    //The sprite's width and height scale factors.
    o.scaleX = 1;
    o.scaleY = 1;

    //The sprite's pivot point, which is its center of rotation.
    //This is a percentage between 0.01 and 0.99.
    o.pivotX = 0.5;
    o.pivotY = 0.5;

    //The sprite's rotation and visibility.
    o.rotation = 0;
    o.visible = true;

    //Leave the sprite's `parent` as `undefined` for now.
    //(Most will be added as children to the `stage` at a later step.)
    o.parent = undefined;

    //Is this the `stage` object? This will be `false` for every
    //sprite, except the `stage`.
    o.stage = false;

    //The sprite's private properties that are just used for internal
    //calculations. All these properties will be changed or accessed through a matching getter/setter
    o._alpha = 1;

    //The sprite's depth layer.
    o._layer = 0;

    //properties to store the x and y positions from the previous
    //frame. Use for rendering interpolation
    o._previousX = undefined;
    o._previousY = undefined;

    //Add the sprite's container properties so that you can have
    //a nested parent/child scene graph hierarchy.
    //Create a `children` array that contains all the
    //in this container.

    o.children = [];
    //The `addChild` method lets you add sprites to this container.

    o.addChild = function (sprite) {

      //Remove the sprite from its current parent, if it has one, and
      //the parent isn't already this object
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }

      //Make this object the sprite's parent and
      //add it to this object's `children` array.
      sprite.parent = o;
      o.children.push(sprite);

      //Calculate the sprite's new width and height
      //o.calculateSize();
    };

    //The `removeChild` method lets you remove a sprite from its
    //parent container.
    o.removeChild = function (sprite) {
      if (sprite.parent === o) {
        o.children.splice(o.children.indexOf(sprite), 1);
      } else {
        throw new Error(sprite + "is not a child of " + o);
      }

      //Calculate the sprite's new width and height
      //o.calculateSize();
    };

    //`add` and `remove` convenience methods let you add and remove
    //many sprites at the same time.
    //o.add = function (spritesToAdd) {
      //var sprites = Array.prototype.slice.call(arguments);
      //if (sprites.length > 1) {
        //sprites.forEach(function (sprite) {
          //o.addChild(sprite);
        //});
      //} else {
        //o.addChild(sprites[0]);
      //}
    //};
    //o.remove = function (spritesToRemove) {
      //var sprites = Array.prototype.slice.call(arguments);
      //if (sprites.length > 1) {
        //sprites.forEach(function (sprite) {
          //o.removeChild(sprite);
        //});
      //} else {
        //o.removeChild(sprites[0]);
      //}
    //};

    //A `setPosition` convenience function to let you set the
    //x any y position of a sprite with one line of code.
    o.setPosition = function (x, y) {
      o.x = x;
      o.y = y;
    };

    //Getters and setters for the sprite's internal properties.
    Object.defineProperties(o, {

      //`gx` and `gy` getters and setters represent the sprite's
      //global coordinates.
      gx: {
        get: function () {
          if (this.parent) {

            //The sprite's global x position is a combination of
            //its local x value and its parent's global x value
            return this.x + this.parent.gx;
          } else {
            return this.x;
          }
        },
        enumerable: true,
        configurable: true
      },
      gy: {
        get: function () {
          if (this.parent) {
            return this.y + this.parent.gy;
          } else {
            return this.y;
          }
        },
        enumerable: true,
        configurable: true
      },

      //A `position` getter. It's a convenience that lets you get and
      //set the sprite's position as an object with x and y values.
      position: {
        get: function () {
          return {
            x: o.x,
            y: o.y
          };
        },
        enumerable: true,
        configurable: true
      },

      //An `alpha` getter/setter. The sprite's `alpha` (transparency) should match its
      //parent's `alpha` value.
      alpha: {
        get: function () {

          //Find out the sprite's alpha relative to its parent's alpha
          var relativeAlpha = o.parent._alpha * o._alpha;
          return relativeAlpha;
        },
        set: function (value) {
          o._alpha = value;
        },
        enumerable: true,
        configurable: true
      },

      //The sprite's `halfWidth` and `halfHeight`.
      halfWidth: {
        get: function () {
          return o.width / 2;
        },
        enumerable: true,
        configurable: true
      },
      halfHeight: {
        get: function () {
          return o.height / 2;
        },
        enumerable: true,
        configurable: true
      },

      //The sprite's center point.
      centerX: {
        get: function () {
          return o.x + o.halfWidth;
        },
        enumerable: true,
        configurable: true
      },
      centerY: {
        get: function () {
          return o.y + o.halfHeight;
        },
        enumerable: true,
        configurable: true
      },

    });
  }

  //### remove
  //`remove` is a global convenience method that will
  //remove any sprite, or an argument list of sprites, from its parent.
  //ga.remove = function (spritesToRemove) {
    //var sprites = Array.prototype.slice.call(arguments);

    ////Remove sprites that's aren't in an array
    //if (!(sprites[0] instanceof Array)) {
      //if (sprites.length > 1) {
        //sprites.forEach(function (sprite) {
          //sprite.parent.removeChild(sprite);
        //});
      //} else {
        //sprites[0].parent.removeChild(sprites[0]);
      //}
    //}

    ////Remove sprites in an array of sprites
    //else {
      //var spritesArray = sprites[0];
      //if (spritesArray.length > 0) {
        //for (var i = spritesArray.length - 1; i >= 0; i--) {
          //var sprite = spritesArray[i];
          //sprite.parent.removeChild(sprite);
          //spritesArray.splice(spritesArray.indexOf(sprite), 1);
        //}
      //}
    //}
  //};

  //### makeStage
  //`makeStage` is called when Ga initializes. It creates a group
  //object called `stage` which will become the parent of all the other sprites
  //and groups.
  function makeStage() {
    var o = {};
    makeDisplayObject(o);

    //Flag this as being the `stage` object. There can
    //only be one stage
    o.stage = true;

    //Set the stage to the same height and width as the canvas
    //and position it at the top left corner
    o.width = ga.canvas.width;
    o.height = ga.canvas.height;
    o.x = 0;
    o.y = 0;

    //The stage has no parent
    o.parent = undefined;
    return o;
  }

  //### group
  //A `group` is a special kind of display object that doesn't have any
  //visible content. Instead, you can use it as a parent container to
  //group other sprites. Supply any number of
  //sprites to group as arguments, or don't supply any arguments if
  //you want to create an empty group. (You can always add sprites to
  //the group later using `addChild`).
  ga.group = function (spritesToGroup) {
    var o = {};

    //Make the group a display object.
    makeDisplayObject(o);

    //Add custom `addChild` and `removeChild` methods that calculate
    //the size of group based on its contents
    o.addChild = function (sprite) {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.parent = o;
      o.children.push(sprite);
      o.calculateSize();
    };
    o.removeChild = function (sprite) {
      if (sprite.parent === o) {
        o.children.splice(o.children.indexOf(sprite), 1);
      } else {
        throw new Error(sprite + "is not a child of " + o);
      }
      o.calculateSize();
    };

    o.calculateSize = function () {
      //Calculate the width based on the size of the largest child
      //that this sprite contains
      if (o.children.length > 0) {

        //Some temporary private variables to help track the new
        //calculated width and height
        o._newWidth = 0;
        o._newHeight = 0;

        //Find the width and height of the child sprites furthest
        //from the top left corner of the group
        o.children.forEach(function (child) {

          //Find child sprites that combined x value and width
          //that's greater than the current value of `_newWidth`
          if (child.x + child.width > o._newWidth) {

            //The new width is a combination of the child's
            //x position and its width
            o._newWidth = child.x + child.width;
          }
          if (child.y + child.height > o._newHeight) {
            o._newHeight = child.y + child.height;
          }
        });

        //Apply the `_newWidth` and `_newHeight` to this sprite's width
        //and height
        o.width = o._newWidth;
        o.height = o._newHeight;
      }
    };

    //Add the group to the `stage`
    ga.stage.addChild(o);

    //Group any sprites that were passed to the group's arguments
    //(Important!: This bit of code needs to happen after adding the group to the stage)
    if (spritesToGroup) {
      var sprites = Array.prototype.slice.call(arguments);
      sprites.forEach(function (sprite) {
        if (!Array.isArray(sprite)) {
          o.addChild(sprite);
        } else {
          sprite.forEach(function (sp) {
            o.addChild(sp);
          });
        }
      });
    }

    //Return the group
    return o;
  };

  //### rectangle
  //`rectangle` creates and returns a basic rectangular shape.
  //arguments: width, height, fillColor, borderColor, widthOfBorder,
  //xPosition, yPosition.
  ga.rectangle = function (width, height, fillStyle, strokeStyle, lineWidth, x, y) {
    var o = {};

    //Make this a display object.
    makeDisplayObject(o);

    //Add a mask property.
    o.mask = false;

    //Set the defaults.
    o.width = width || 32;
    o.height = height || 32;
    o.fillStyle = fillStyle || "red";
    o.strokeStyle = strokeStyle || "none";
    o.lineWidth = lineWidth || 0;
    o.x = x || 0;
    o.y = y || 0;

    //Add the sprite to the stage.
    ga.stage.addChild(o);

    //Add a `render` method that explains to the canvas how to draw
    //a rectangle.
    o.render = function (ctx) {
      ctx.strokeStyle = o.strokeStyle;
      ctx.lineWidth = o.lineWidth;
      ctx.fillStyle = o.fillStyle;
      ctx.beginPath();

      //Draw the rectangle around the context's center `0` point.
      ctx.rect(-o.width * o.pivotX, -o.height * o.pivotY,
        o.width,
        o.height
      );
      if (o.mask === true) {
        ctx.clip();
      } else {
        if (o.strokeStyle !== "none") ctx.stroke();
        if (o.fillStyle !== "none") ctx.fill();
      }
    };

    //Return the rectangle.
    return o;
  };

  //### sprite
  //`sprite` creates and returns a sprite using a JavaScript Image object, a tileset
  //`frame`, a `filmstrip`, or a frame from a texture atlas (in
  //standard Texture Packer format).
  //arguments: sourceString.
  ga.sprite = function (source) {
    var o = {};

    //If no `source` is provided, alert the user.
    if (source === undefined) throw new Error("Sprites require a source");

    //Make this a display object.
    makeDisplayObject(o);
    o.frames = [];
    o.loop = true;
    o._currentFrame = 0;
    o.onAnimationComplete = undefined;

    //This next part is complicated. The code has to figure out what
    //the source is referring to, and then assign its properties
    //correctly to the sprite's properties. Read carefully!
    o.setTexture = function (source) {
      //If the source is just an ordinary string, use it to create the
      //sprite.
      if (!source.image) {
        var isSourceArray = source instanceof Array;
        o.tilesetFrame = isSourceArray ? o.tilesetFrame : ga.assets[source];
        o.frames = isSourceArray ? source: o.frames;

        var imgData = isSourceArray ? ga.assets[source[0]]: o.tilesetFrame;
        o.source = imgData.source;
        o.sourceX = imgData.x;
        o.sourceY = imgData.y;
        o.width = imgData.w;
        o.height = imgData.h;
        o.sourceWidth = imgData.w;
        o.sourceHeight = imgData.h;
      }

      //If the source contains an `image` sub-property, this must
      //be a `frame` object that's defining the rectangular area of an inner sub-image
      //Use that sub-image to make the sprite. If it doesn't contain a
      //`data` property, then it must be a single frame.
      //else if (source.image && !source.data) {
        ////Throw an error if the source is not an image file.
        //if (!(ga.assets[source.image].source instanceof Image)) {
          //throw new Error(source.image + " is not an image file");
        //}
        //o.source = ga.assets[source.image].source;
        //o.sourceX = source.x;
        //o.sourceY = source.y;
        //o.width = source.width;
        //o.height = source.height;
        //o.sourceWidth = source.width;
        //o.sourceHeight = source.height;
      //}

      ////If the source contains an `image` sub-property
      ////and a `data` property, then it contains multiple frames
      //else if (source.image && source.data) {
        //o.source = ga.assets[source.image].source;
        //o.frames = source.data;

        ////Set the sprite to the first frame
        //o.sourceX = o.frames[0][0];
        //o.sourceY = o.frames[0][1];
        //o.width = source.width;
        //o.height = source.height;
        //o.sourceWidth = source.width;
        //o.sourceHeight = source.height;
      //}
    };

    //Use `setTexture` to change a sprite's source image
    //while the game is running
    o.setTexture(source);

    //Add a `gotoAndStop` method to go to a specific frame.
    o.gotoAndStop = function (frameNumber) {
      if (o.frames.length > 0) {
        var framesData = ga.assets[o.frames[frameNumber]];
        //If each frame is an array, then the frames were made from an
        //ordinary Image object using the `frames` method.
        //if (o.frames[0] instanceof Array) {
          //o.sourceX = o.frames[frameNumber][0];
          //o.sourceY = o.frames[frameNumber][1];
        //}

        //If each frame isn't an array, and it has a sub-object called `frame`,
        //then the frame must be a texture atlas id name.
        //In that case, get the source position from the `frame` object.
        if (framesData) {
          o.source = framesData.source;
          o.sourceX = framesData.x;
          o.sourceY = framesData.y;
          o.sourceWidth = framesData.w;
          o.sourceHeight = framesData.h;
          o.width = framesData.w;
          o.height = framesData.h;
        }

        //Set the `_currentFrame` value.
        o._currentFrame = frameNumber;
      } else {
        throw new Error("Frame number " + frameNumber + "doesn't exist");
      }
    };

    //Set the sprite's getters
    o.x = 0;
    o.y = 0;

    //If the sprite has more than one frame, add a state player
    if (o.frames.length > 0) {
      ga.addStatePlayer(o);

      //Add a getter for the `_currentFrames` property.
      Object.defineProperty(o, "currentFrame", {
        get: function () {
          return o._currentFrame;
        },
        enumerable: false,
        configurable: false
      });
    }

    //Add the sprite to the stage
    ga.stage.addChild(o);

    //A `render` method that describes how to draw the sprite
    o.render = function (ctx) {
      ctx.drawImage(
        o.source,
        o.sourceX, o.sourceY,
        o.sourceWidth, o.sourceHeight, -o.width * o.pivotX, -o.height * o.pivotY,
        o.width, o.height
      );
    };

    //Return the sprite
    return o;
  };

  //A convenience method that lets you access JSON files by their file names.
  //ga.json = function (jsonFileName) {
    //return ga.assets[jsonFileName];
  //};

  //### addStatePlayer
  //`addStatePlayer` adds a state manager and keyframe animation player for
  //sprites with more than one frame. Its called automatically when
  //`sprite`s are created.
  ga.addStatePlayer = function (sprite) {
    var frameCounter = 0,
      numberOfFrames = 0,
      startFrame = 0,
      endFrame = 0,
      timerInterval = undefined,
      playing = false;

    ////The `play` function plays all the sprites frames.
    //function play() {
      //playSequence([0, sprite.frames.length - 1]);
    //}

    //The `stop` function stops the animation at the current frame.
    function stop() {
      reset();
      sprite.gotoAndStop(sprite.currentFrame);
    }

    //The `playSequence` function, to play a sequence of frames.
    function playSequence(sequenceArray) {

      //Reset any possible previous animations.
      reset();

      //Figure out how many frames there are in the range.
      startFrame = sequenceArray[0];
      endFrame = sequenceArray[1];
      numberOfFrames = endFrame - startFrame;

      //Compensate for two edge cases:
      //1. if the `startFrame` happens to be `0`.
      if (startFrame === 0) {
        numberOfFrames += 1;
        frameCounter += 1;
      }

      //2. if only a two-frame sequence was provided.
      if (numberOfFrames === 1) {
        numberOfFrames = 2;
        frameCounter += 1;
      }

      //Calculate the frame rate. Set a default fps of 12.
      if (!sprite.fps) sprite.fps = 12;
      var frameRate = 1000 / sprite.fps;

      //Set the sprite to the starting frame.
      sprite.gotoAndStop(startFrame);

      //If the state isn't already playing, start it.
      if (!playing) {
        timerInterval = setInterval(advanceFrame.bind(this), frameRate);
        playing = true;
      }
    }

    //`advanceFrame` is called by `setInterval` to display the next frame
    //in the sequence based on the `frameRate`. When frame sequence
    //reaches the end, it will either stop it or loop it.
    function advanceFrame() {

      //Advance the frame if `frameCounter` is less than
      //the state's total frames.
      if (frameCounter < numberOfFrames) {

        //Advance the frame.
        sprite.gotoAndStop(sprite.currentFrame + 1);

        //Update the frame counter.
        frameCounter += 1;
      } else {

        //If we've reached the last frame and `loop`
        //is `true`, then start from the first frame again.
        if (sprite.loop) {
          sprite.gotoAndStop(startFrame);
          frameCounter = 1;
        } else {
          if (sprite.onAnimationComplete) {
            sprite.onAnimationComplete();
          }
        }
      }
    }

    function reset() {

      //Reset `playing` to `false`, set the `frameCounter` to 0,
      //and clear the `timerInterval`.
      if (timerInterval !== undefined && playing === true) {
        playing = false;
        frameCounter = 0;
        startFrame = 0;
        endFrame = 0;
        numberOfFrames = 0;
        clearInterval(timerInterval);
      }
    }

    //Add the `play`, `playing`, `stop` and `playSequence` methods to the sprite.
    //sprite.play = play;
    sprite.stop = stop;
    sprite.playing = playing;
    sprite.playSequence = playSequence;
  };


  /*
  Rendering
  -------

  The render method that displays all the sprites on the canvas.
  Ga uses it inside the game loop to render the sprites like this:

      ga.render(canvasContext);

  */

  ga.render = function (canvas, lagOffset) {

    //Get a reference to the context.
    var ctx = canvas.ctx;

    //Clear the canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //Display the all the sprites.
    for (var i = 0; i < ga.stage.children.length; i++) {
      var sprite = ga.stage.children[i];

      //Only draw sprites if they're visible and inside the
      //area of the canvas.
      displaySprite(sprite);
    }

    function displaySprite(sprite) {
      if (
        sprite.visible && sprite.gx < canvas.width + sprite.width && sprite.gx + sprite.width >= -sprite.width && sprite.gy < canvas.height + sprite.height && sprite.gy + sprite.height >= -sprite.height
      ) {

        //Save the current context state.
        ctx.save();

        //ctx.setTransform(1,0,0,1,0,0);
        //Calculate the sprites' interpolated render positions if
        //`ga.interpolate` is `true` (It is true by default)
        sprite.renderX = ga.interpolate && sprite._previousX !== undefined ? (sprite.x - sprite._previousX) * lagOffset + sprite._previousX : sprite.x;
        sprite.renderY = ga.interpolate && sprite._previousY !== undefined ? (sprite.y - sprite._previousY) * lagOffset + sprite._previousY : sprite.y;

        //Draw the sprite
        ctx.translate(
          sprite.renderX + (sprite.width * sprite.pivotX),
          sprite.renderY + (sprite.height * sprite.pivotY)
        );
        /*
        var cos = Math.cos(sprite.rotation),
            sin = Math.sin(sprite.rotation),
            scaleX = sprite.scaleX,
            scaleY = sprite.scaleY,
            translateX = sprite.renderX + (sprite.width * sprite.pivotX),
            translateY = sprite.renderY + (sprite.height * sprite.pivotY);

        ctx.setTransform(
          scaleX + cos,
          sin, -sin,
          scaleY - cos,
          translateX,
          translateY
        );
        */
        //(scaleX+cos, skewX+sin, skewY-sin, scaleY-cos, translateX, translateY);

        //Set the alpha
        ctx.globalAlpha = sprite.alpha;

        //Rotate the sprite using its `rotation` value.
        ctx.rotate(sprite.rotation);

        //Scale the sprite using its `scaleX` and scaleY` properties.
        ctx.scale(sprite.scaleX, sprite.scaleY);

        //Use the sprite's custom `render` method to figure out how to
        //draw the sprite. This is only run if the sprite actually has
        //a `render` method. Most do, but `group` sprites don't and
        //neither does the `stage` object.
        if (sprite.render) sprite.render(ctx);

        //If the sprite contains child sprites in its
        //`children` array, display them by calling this very same
        //`displaySprite` function again.
        if (sprite.children && sprite.children.length > 0) {

          //Reset the context back to the parent sprite's top left corner
          ctx.translate(-sprite.width * sprite.pivotX, -sprite.height * sprite.pivotY);
          /*
        ctx.setTransform(
          -scaleX - cos,
          -sin, sin,
          -scaleY + cos,
          -translateX,
          -translateY
        );
        */
          for (var j = 0; j < sprite.children.length; j++) {

            //Find the sprite's child
            var child = sprite.children[j];

            //display the child
            displaySprite(child);
          }
        }

        //The context's original position will only be restored after
        //the child sprites have been rendered. This is why the children have
        //the same rotation and alpha as the parents.
        ctx.restore();
        //ctx.setTransform(1,0,0,1,0,0);
      }
    }
  };

  //### asset
  //All the game engine's assets are stored in this object and it has
  //a `load` method that manages asset loading. You can load assets at
  //any time during the game by using the `asset.load` method.
  ga.assets = {

    //Properties to help track the assets being loaded.
    toLoad: 0,
    loaded: 0,

    //The callback function that should run when all assets have loaded.
    //Assign this when you load the fonts, like this: `assets.whenLoaded = makeSprites;`.
    whenLoaded: undefined,

    //The load method creates and loads all the assets. Use it like this:
    //`assets.load(["images/anyImage.png", "fonts/anyFont.otf"]);`.

    load: function (sources) {

      //#### image data
      if (sources.data && sources.img) {
        //Find the number of files that need to be loaded.
        this.toLoad = 1;

        //Create the tileset frames.
        this.createTilesetFrames(sources.data, sources.img);
      }

      //Display a message if a file type isn't recognized.
      else {
        console.log("Invalid file format: " + source);
      }

    },

    //#### createTilesetFrames
    //`createTilesetFrames` parses the JSON file  texture atlas and loads the frames
    //into this `assets` object.
    createTilesetFrames: function (json, img) {
      var self = this;

      var image = new Image();
      image.addEventListener("load", loadImage, false);
      image.src = img;

      function loadImage() {

        //Assign the image as a property of the `assets` object so
        //we can access it like this:
        //`assets["images/imageName.png"]`.
        self["img"] = {
          source: image,
          frame: {
            x: 0,
            y: 0,
            w: image.width,
            h: image.height
          }
        };

        //Loop through all the frames.
        Object.keys(json).forEach(function (tilesetImage) {

          //console.log(json.frames[image].frame);
          //The `frame` object contains all the size and position
          //data.
          //Add the frame to the asset object so that we
          //can access it like this: `assets["frameName.png"]`.
          self[tilesetImage] = json[tilesetImage];

          //Get a reference to the source so that it will be easy for
          //us to access it later.
          self[tilesetImage].source = image;
          //console.log(self[tilesetImage].source)
        });

        //Alert the load handler that the file has loaded.
        self.loadHandler();
      }
    },

    //#### loadHandler
    //The `loadHandler` will be called each time an asset finishes loading.
    loadHandler: function () {
      this.loaded += 1;

      //Check whether everything has loaded.
      if (this.toLoad === this.loaded) {

        //If it has, run the callback function that was assigned to the `whenLoaded` property

        //Reset `loaded` and `toLoaded` so we can load more assets
        //later if we want to.
        this.toLoad = 0;
        this.loaded = 0;
        this.whenLoaded();
      }
    }
  };

  /*
  ### keyboard
  The `keyboard` function creates `key` objects
  that listen for keyboard events. Create a new key object like
  this:

     var keyObject = g.keyboard(asciiKeyCodeNumber);

  Then assign `press` and `release` methods like this:

    keyObject.press = function() {
      //key object pressed
    };
    keyObject.release = function() {
      //key object released
    };

  Keyboard objects also have `isDown` and `isUp` Booleans that you can check.
  */

  function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;

    //The `downHandler`
    key.downHandler = function (event) {
      if (event.keyCode === key.code) {
        if (key.isUp && key.press) key.press();
        key.isDown = true;
        key.isUp = false;
      }
      event.preventDefault();
    };

    //The `upHandler`
    key.upHandler = function (event) {
      if (event.keyCode === key.code) {
        if (key.isDown && key.release) key.release();
        key.isDown = false;
        key.isUp = true;
      }
      event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
      "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
      "keyup", key.upHandler.bind(key), false
    );
    return key;
  }

  /*
  ### makeKeys
  `makeKeys` is called when Ga is initialized. It pre-defines the
  arrow keys and space bar so that you can use them right away in
  your games like this:

      g.key.leftArrow.press = function() {
        //left arrow pressed.
      };
      g.key.leftArrow.release = function() {
        //left arrow released.
      };

  The keyboard objects that `makeKeys` creates are:

      key.leftArrow
      key.upArrow
      key.rightArrow
      key.downArrow
      key.space

  */

  function makeKeys(keyCodes) {
    var o = {};
    for (var key in keyCodes) {
      o[key] = keyboard( keyCodes[key] );
    }
    return o;
  }

  //Make the `keyboard` and `makeDisplayObject` functions public.
  ga.keyboard = keyboard;
  ga.makeDisplayObject = makeDisplayObject;

  ///////////** Added Extra useful plugins just for this game //
  ga.getSmartSprite = function(name) {
      var animSheet = [];
      for (var key in ga.assets) {
          if (key.includes(name)) {
              animSheet.push(key);
          }
      }
      return  animSheet.length > 1 ? animSheet : animSheet[0];
  };

  ga.getFrames = function( sprite, name ) {
      var frames = [];
      sprite.frames.forEach( function(frame, index) {
        if ( frame.includes(name) ) {
            frames.push( index );
        }
      });

      return frames;
  };

  /**
   * avoid using this function on speed collision;; like super fast moving objects
   */
  ga.hitTest = function( options ) {
      var r1 = options.target;
      var r2 = options.source;
      var dx = (r1.x + r1.halfWidth) - (r2.x + r2.halfWidth);
      var dy = (r1.y + r1.halfHeight) - (r2.y + r2.halfHeight);
      var dwidth = (r1.width + r2.width) / 2;
      var dheight = (r1.height + r2.height) / 2;
      var crossWidth = dwidth * dy;
      var crossHeight = dheight * dx;
      var collision = {
          hit: false,
          side: ""
      };

      if (Math.abs(dx) <= dwidth && Math.abs(dy) <= dheight) {
          if (crossWidth > crossHeight) {
              collision.side = (crossWidth > (-crossHeight)) ? "bottom" : "left";
          } else {
              collision.side = (crossWidth > -(crossHeight)) ? "right" : "top";
          }
      }

      collision.hit = Boolean(
          r1.x < r2.x + r2.width &&
          r1.x + r1.width > r2.x &&
          r1.y < r2.y + r2.height &&
          r1.y + r1.height > r2.y);

      return collision;
  };

  ga.Ticker = function() {
      this.tick = 0;
      this.isStop = false;

      this.run = function() {
          if (this.isStop) { return; }
          this.tick ++;
      };

      this.stop = function() {
          if (this.isStop) { return; }
          this.isStop = true;
      };

      this.enable = function() {
          if (!this.isStop) { return; }
          this.tick = 0;
          this.isStop = false;
      }
  };

  /*
  ### distance

  Find the distance in pixels between two sprites.
  Parameters:
  a. A sprite object with `centerX` and `centerX` properties.
  b. A sprite object with `centerY` and `centerY` properties.
  The function returns the number of pixels distance between the sprites.

  */

  ga.distance = function (s1, s2) {
      s1 = isNaN(s1) ? s1.centerX : s1; 
      s2 = isNaN(s2) ? s2.centerX : s2; 
      var vx = s2 - s1,
          vy = s2 - s1;
      return Math.sqrt(vx * vx + vy * vy);
  };

  /*
  ### random

  Returns a random integer between a minimum and maximum value
  Parameters:
  a. An integer.
  b. An integer.
  Here's how you can use it to get a random number between, 1 and 10:

      randomInt(1, 10);

  */
  ga.randomInt = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  ///////////** Added Extra useful plugins just for this game //

  //Return `ga`.
  return ga;
};
