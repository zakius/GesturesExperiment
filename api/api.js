const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ExtensionUtils',
  'resource://gre/modules/ExtensionUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'ExtensionCommon',
  'resource://gre/modules/ExtensionCommon.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'ExtensionParent',
  'resource://gre/modules/ExtensionParent.jsm');

this.gestures = class extends ExtensionAPI {
  getAPI(context) {

    const {windowManager} = context.extension;

    let EventManager = ExtensionCommon.EventManager;

    // Weakly maps XUL windows to their observers.
    let windowMap = new WeakMap();

    const events = [
      'mousemove',
      'mousedown',
      'mouseup',
      'click',
      'contextmenu',
      'mouseleave',
      'drop',
      'wheel'

    ];
    let state = {
      lastX: 0,
      lastY: 0,
      directionChain: '',
      isMouseDownL: false,
      isMouseDownM: false,
      isMouseDownR: false,
      isMouseUpL: false,
      isMouseUpM: false,
      isMouseUpR: false,
      isRelatedL: false,
      isRelatedM: false,
      isRelatedR: false,
      hideFireContext: false
    };

    return {
      gestures: {
        onGesturePerformed: new EventManager(context, 'gestures-api', fire => {
          const windowTracker = ExtensionParent.apiManager.global.windowTracker;
          let windows = Array.from(windowManager.getAll(), win => win.window);

          let observeWindow = (win) => {
            let observer = event => {
              switch (event.type) {
                case 'mousedown':
                  if (event.button === 2) {
                    if (state.isMouseUpR) {
                      state.isMouseUpR = false;
                    }
                    state.hideFireContext = false;
                    [state.lastX, state.lastY, state.directionChain] = [event.screenX, event.screenY, ''];
                    if (state.isMouseDownL) {
                      state.hideFireContext = true;
                      state.isRelatedL = true;
                      state.isRelatedR = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('L>R');
                    } else if (state.isMouseDownM) {
                      state.hideFireContext = true;
                      state.isRelatedM = true;
                      state.isRelatedR = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('M>R');
                    } else {
                      state.isMouseDownR = true;
                    }
                  } else if (event.button === 0) {
                    if (state.isMouseUpL) {
                      state.isMouseUpL = false;
                    }
                    if (state.isMouseDownR) {
                      state.hideFireContext = true;
                      state.directionChain = '';
                      state.isRelatedR = true;
                      state.isRelatedL = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('R>L');
                    } else if (state.isMouseDownM) {
                      state.hideFireContext = true;
                      state.isRelatedM = true;
                      state.isRelatedL = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('M>L');
                    } else {
                      state.isMouseDownL = true;
                    }
                  } else if (event.button === 1) {
                    if (state.isMouseUpM) {
                      state.isMouseUpM = false;
                    }
                    if (state.isMouseDownR) {
                      state.hideFireContext = true;
                      state.directionChain = '';
                      state.isRelatedR = true;
                      state.isRelatedM = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('R>M');
                    } else if (state.isMouseDownL) {
                      state.hideFireContext = true;
                      state.isRelatedL = true;
                      state.isRelatedM = true;
                      event.preventDefault();
                      event.stopPropagation();
                      fire.async('L>M');
                    } else {
                      state.isMouseDownM = true;
                    }
                  }
                  break;
                case 'mousemove':
                  if (state.isMouseDownR) {
                    state.hideFireContext = true;
                    var [subX, subY] = [event.screenX - state.lastX, event.screenY - state.lastY];
                    var [distX, distY] = [(subX > 0 ? subX : (-subX)), (subY > 0 ? subY : (-subY))];
                    var direction;
                    if (distX < 10 && distY < 10)
                      return;
                    if (distX > distY)
                      direction = subX < 0 ? 'L' : 'R';
                    else
                      direction = subY < 0 ? 'U' : 'D';
                    if (direction !== state.directionChain.charAt(state.directionChain.length - 1)) {
                      state.directionChain += direction;
                    }
                    state.lastX = event.screenX;
                    state.lastY = event.screenY;
                  }
                  if (state.isMouseDownL) {
                    state.isMouseDownL = false;
                  }
                  if (state.isMouseDownM) {
                    state.isMouseDownM = false;
                  }
                  break;
                case 'mouseup':
                  if (event.ctrlKey && event.button === 2) {
                    event.preventDefault();
                    event.stopPropagation();
                    state.isMouseDownR = false;
                    state.hideFireContext = false;
                  }
                  if (event.button === 2) {
                    if (state.isMouseDownR) {
                      state.isMouseDownR = false;
                    }
                    if (state.isRelatedR) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpR = true;
                      state.isRelatedR = false;
                    }
                    if (state.directionChain !== '') {
                      console.log('gesture end');
                      fire.async(state.directionChain);
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  } else if (event.button === 0) {
                    if (state.isMouseDownL) {
                      state.isMouseDownL = false;
                    }
                    if (state.isRelatedL /* && event.target.tagName != 'OBJECT'*/) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpL = true;
                      state.isRelatedL = false;
                    }
                  } else if (event.button === 1) {
                    if (state.isMouseDownM) {
                      state.isMouseDownM = false;
                    }
                    if (state.isRelatedM) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpM = true;
                      state.isRelatedM = false;
                    }
                  }
                  break;
                case 'click':
                  if (event.button === 2) {
                    if (state.isMouseUpR) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpR = false;
                    }
                  } else if (event.button === 0) {
                    if (state.isMouseUpL) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpL = false;
                    }
                  } else if (event.button === 1) {
                    if (state.isMouseUpM) {
                      event.preventDefault();
                      event.stopPropagation();
                      state.isMouseUpM = false;
                    }
                  }
                  break;
                case 'contextmenu':
                  if (state.isMouseDownL || state.isMouseDownR || state.isMouseDownM || state.hideFireContext) {
                    event.preventDefault();
                    event.stopPropagation();
                    state.hideFireContext = false;
                  }
                  break;
                case 'wheel':
                  if (state.isMouseDownR) {
                    event.preventDefault();
                    event.stopPropagation();
                    state.hideFireContext = true;
                    state.directionChain = '';
                    state.isRelatedR = true;
                    fire.async('2' + (event.deltaY > 0 ? '+' : '-'));
                  } else if (state.isMouseDownL) {
                    event.preventDefault();
                    event.stopPropagation();
                    state.isRelatedL = true;
                    fire.async('0' + (event.deltaY > 0 ? '+' : '-'));
                  } else if (state.isMouseDownM) {
                    event.preventDefault();
                    event.stopPropagation();
                    state.isRelatedM = true;
                    fire.async('1' + (event.deltaY > 0 ? '+' : '-'));
                  }
                  break;
                case 'mouseleave':
                  if (state.isMouseDownL)
                    state.isMouseDownL = false;
                  if (state.isMouseDownM)
                    state.isMouseDownM = false;
                  if (state.isMouseDownR) {
                    state.isMouseDownR = false;
                    state.directionChain = '';
                  }
                  break;
                case 'drop':
                  state.isMouseDownL = false;
              }
            };

            events.forEach((event) => {
              win.addEventListener(event, observer);
            });

            windowMap.set(win, observer);
          };

          for (let win of windows) {
            observeWindow(win);
          }

          let windowOpenListener = (win) => {
            observeWindow(win);
          };

          windowTracker.addListener('domwindowopened', windowOpenListener);
          windows = [];

          return () => {
            let windows = Array.from(windowManager.getAll(), win => win.window);
            for (let win of windows) {
              let observer = windowMap.get(win);
              if (observer) {
                events.forEach((event) => {
                  win.removeListener(event, observer);
                });
              }

              windowMap.delete(win);
            }

            windowTracker.removeListener('domwindowopened', windowOpenListener);
          };

        }).api()
      }
    };
  }
};

