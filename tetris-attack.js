/* Phaser functions */
function preload() {
    loadSprites(BLOCKS, CURSORS);
    GLOBAL.game.time.desiredFps = 60;
}

function create() {
    var game = new TaGame();
    // make sure the cursor is always on top:
    // GLOBAL.block_layer = GLOBAL.game.add.group();
    // GLOBAL.cursor_layer = GLOBAL.game.add.group();

    game.newGame(6, 12, GLOBAL.nrBlockSprites);

    if(navigator.getGamepads().length > 1) {
        game.cursor.setController(GamepadController.create(navigator.getGamepads()[0]));
    }

    window.addEventListener("gamepadconnected", function(e) {
        // dynamically switch to the gamepad
        game.cursor.setController(GamepadController.create(e.gamepad));
    });

    window.addEventListener("gamepaddisconnected", function(e) {
        // revert to the keyboard on gamepad removal
        game.cursor.setController(DefaultKeyboardController);
    });

    GLOBAL.taGame_list[0] = game;
    MainLoop.setSimulationTimestep(1000/UPS);
    MainLoop.setBegin(begin).setUpdate(update).setDraw(render).start();
}
function update() {
    for (var i=0; i < GLOBAL.taGame_list.length; i++) {
        game = GLOBAL.taGame_list[i];

        game.tick();
    }
}

function begin() {
}

create();
