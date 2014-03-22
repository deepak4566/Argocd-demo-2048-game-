function KeyboardInputManager() {
  this.events = {};

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.pollGamepad = function () {
  var self = this;

  if (typeof self.directionPressed === 'undefined') {
    self.directionPressed = null;
  }

  var chromeGamepadSupportAvailable = !!navigator.webkitGetGamepads || !!navigator.webkitGamepads;
  if (chromeGamepadSupportAvailable) {
    var gamepad = navigator.webkitGetGamepads && navigator.webkitGetGamepads()[0];

    if (gamepad) {
      var newDirectionPressed = null;

      var buttonMap = {
        12: 0, // up
        13: 2, // right
        14: 3, // down
        15: 1  // left
      };
      var buttonSensitivityThreshold = 0.5;

      for (button in buttonMap) {
        direction = buttonMap[button];
        if (gamepad.buttons[button] && (gamepad.buttons[button] > buttonSensitivityThreshold)) {
          newDirectionPressed = direction;
        }
      }

      if (newDirectionPressed !== self.directionPressed) {
        self.directionPressed = newDirectionPressed;

        if (self.directionPressed !== null) {
          self.emit("move", self.directionPressed);
        }
      }

    }

    var nextPoll = function () {
      self.pollGamepad();
    }

    // check gamepad again on next animation frame
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(nextPoll);
    } else if (window.mozRequestAnimationFrame) {
      window.mozRequestAnimationFrame(nextPoll);
    } else if (window.webkitRequestAnimationFrame) {
      window.webkitRequestAnimationFrame(nextPoll);
    }
  }

};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // vim keybindings
    76: 1,
    74: 2,
    72: 3,
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3  // A
  };

  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      }

      if (event.which === 32) self.restart.bind(self)(event);
    }
  });

  var retry = document.querySelector(".retry-button");
  retry.addEventListener("click", this.restart.bind(this));
  retry.addEventListener(this.eventTouchend, this.restart.bind(this));

  var keepPlaying = document.querySelector(".keep-playing-button");
  keepPlaying.addEventListener("click", this.keepPlaying.bind(this));
  keepPlaying.addEventListener("touchend", this.keepPlaying.bind(this));

  // Listen to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener(this.eventTouchstart, function (event) {
    if (( !window.navigator.msPointerEnabled && event.touches.length > 1) || event.targetTouches > 1) return;

    if(window.navigator.msPointerEnabled){
        touchStartClientX = event.pageX;
        touchStartClientY = event.pageY;
    } else {
        touchStartClientX = event.touches[0].clientX;
        touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchend, function (event) {
    if (( !window.navigator.msPointerEnabled && event.touches.length > 0) || event.targetTouches > 0) return;

    var touchEndClientX, touchEndClientY;
    if(window.navigator.msPointerEnabled){
        touchEndClientX = event.pageX;
        touchEndClientY = event.pageY;
    } else {
        touchEndClientX = event.changedTouches[0].clientX;
        touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });

  // setup gamepad polling loop
  self.pollGamepad();

};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
